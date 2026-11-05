import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import * as Blockly from 'blockly/core';
import { Undo2, Redo2, LocateFixed, Trash2 } from 'lucide-react';
import { registerBlocks, toolbox, toolboxBlock, workspaceTheme } from '../editor/blocks';
import { fromCommands, visualProgramSchema, type VisualProgram } from '../editor/program';
import { en } from '../shared/strings/en';
import {isEvent} from '../editor/live-blocks';

export type BlockEditorHandle = { select: (id: string) => void; load: (program: VisualProgram) => void; clear: () => void };
const copy = en.studio;
const additions = ['spike_move', 'spike_turn', 'spike_wait', 'controls_repeat_ext', 'controls_if', 'spike_image', 'spike_beep', 'spike_print'] as const;

export function BlockEditor({ initial, onChange, onSelect, onValidity, activeId, allowedTypes, ref }: {
  initial: VisualProgram;
  onChange: (program: VisualProgram, edited: boolean) => void;
  onSelect: (type: string) => void;
  onValidity?: (valid: boolean) => void;
  activeId?: string;
  allowedTypes?: readonly string[];
  ref?: Ref<BlockEditorHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const lastPublished=useRef('');
  const [seed] = useState(initial);
  const [allowed] = useState(allowedTypes);
  const callbacks = useRef({ onChange, onSelect, onValidity });
  const [addition, setAddition] = useState<string>('spike_move');
  const [disconnected, setDisconnected] = useState(0);
  const [valid, setValid] = useState(true);
  useEffect(() => { callbacks.current = { onChange, onSelect, onValidity }; }, [onChange, onSelect, onValidity]);

  const load = (program: VisualProgram) => {
    const current = workspace.current;
    if (!current || !visualProgramSchema.safeParse(program).success) return;
    Blockly.Events.setGroup(true);
    try { current.clear(); Blockly.serialization.workspaces.load(program, current, { recordUndo: true }); }
    finally { Blockly.Events.setGroup(false); }
    const saved=visualProgramSchema.parse(Blockly.serialization.workspaces.save(current));
    lastPublished.current=JSON.stringify(saved);callbacks.current.onChange(saved,true);
    current.scrollCenter();
  };
  useImperativeHandle(ref, () => ({
    select: (id) => { const block = workspace.current?.getBlockById(id); block?.select(); workspace.current?.centerOnBlock(id); },
    load,
    clear: () => load(fromCommands([])),
  }));

  useEffect(() => {
    if (!container.current) return;
    registerBlocks();
    const current = Blockly.inject(container.current, {
      toolbox:allowed?{...toolbox,contents:toolbox.contents.map(category=>({...category,contents:category.contents?.filter(block=>allowed.includes(block.type))})).filter(category=>category.custom||category.contents?.length)}:toolbox, renderer: 'zelos', theme: workspaceTheme(document.documentElement.dataset.theme === 'dark'),
      media: `${import.meta.env.BASE_URL}blockly-media/`, sounds: false, trashcan: true,
      maxBlocks: 301, grid: { spacing: 24, length: 2, colour: '#9ca8c1', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.5, minScale: 0.4, scaleSpeed: 1.1 },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspace.current = current;
    current.registerToolboxCategoryCallback('PROCEDURE', (workspace) => Blockly.Procedures.flyoutCategory(workspace).filter((element) => !['procedures_defreturn', 'procedures_callreturn', 'procedures_ifreturn'].includes(element.getAttribute('type') ?? '')));
    Blockly.Events.disable();
    try { Blockly.serialization.workspaces.load(seed, current); current.clearUndo(); }
    finally { Blockly.Events.enable(); }
    const publish = (edited: boolean) => {
      const parsed = visualProgramSchema.safeParse(Blockly.serialization.workspaces.save(current));
      setValid(parsed.success); callbacks.current.onValidity?.(parsed.success);
      if (parsed.success){const serialized=JSON.stringify(parsed.data);if(serialized!==lastPublished.current){lastPublished.current=serialized;callbacks.current.onChange(parsed.data, edited);}}
      const disconnectedStacks = current.getTopBlocks(false).filter((block) => !isEvent(block.type)&&block.type!=='procedures_defnoreturn');
      setDisconnected(disconnectedStacks.length);
      disconnectedStacks.forEach((block) => block.setWarningText(copy.disconnected(1), 'disconnected'));
      current.getAllBlocks(false).filter((block) => block.getParent()).forEach((block) => block.setWarningText(null, 'disconnected'));
    };
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.SELECTED && 'newElementId' in event && typeof event.newElementId === 'string') {
        const block = current.getBlockById(event.newElementId); if (block) callbacks.current.onSelect(block.type);
      }
      if (!event.isUiEvent && event.type !== Blockly.Events.FINISHED_LOADING) publish(true);
    };
    current.addChangeListener(listener);
    publish(false);
    const resize = new ResizeObserver(() => Blockly.svgResize(current));
    resize.observe(container.current);
    const theme = new MutationObserver(() => current.setTheme(workspaceTheme(document.documentElement.dataset.theme === 'dark')));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { resize.disconnect(); theme.disconnect(); current.removeChangeListener(listener); current.dispose(); workspace.current = null; };
  }, [seed,allowed]);

  useEffect(() => {
    const current = workspace.current;
    current?.highlightBlock(activeId || null);
    current?.getAllBlocks(false).forEach((block) => block.getSvgRoot()?.classList.toggle('spikesim-active-block', block.id === activeId));
  }, [activeId]);

  const add = () => {
    const current = workspace.current; if (!current) return;
    Blockly.Events.setGroup(true);
    try {
      const selected = Blockly.common.getSelected();
      const previous = selected instanceof Blockly.BlockSvg && selected.workspace === current ? selected : null;
      const block = Blockly.serialization.blocks.append(toolboxBlock(addition), current, { recordUndo: true }) as Blockly.BlockSvg;
      let target = previous?.getInput('DO')?.connection ?? previous?.getInput('DO0')?.connection ?? previous?.nextConnection;
      if (!target) {
        let tail = current.getTopBlocks(false).find((item) => item.type === 'spike_start');
        while (tail?.getNextBlock()) tail = tail.getNextBlock()!;
        target = tail?.nextConnection ?? undefined;
      }
      if (target && block.previousConnection) {
        const oldNext = target.targetBlock();
        oldNext?.unplug(); target.connect(block.previousConnection);
        if (oldNext?.previousConnection && block.nextConnection) block.nextConnection.connect(oldNext.previousConnection);
      } else block.moveBy(80, 80);
      block.select();
    } finally { Blockly.Events.setGroup(false); }
  };
  return (
    <div className="block-editor">
      <div className="block-editor-tools">
        <div className="block-edit-actions">
          <button onClick={() => workspace.current?.undo(false)} aria-label={copy.undo} title={copy.undo}><Undo2 size={17} /></button>
          <button onClick={() => workspace.current?.undo(true)} aria-label={copy.redo} title={copy.redo}><Redo2 size={17} /></button>
          <button onClick={() => workspace.current?.zoomToFit()} aria-label={copy.center} title={copy.center}><LocateFixed size={17} /></button>
          <button onClick={() => { const selected = Blockly.common.getSelected(); if (selected instanceof Blockly.BlockSvg && selected.workspace === workspace.current && selected.isDeletable()) selected.dispose(true); }} aria-label={copy.delete} title={copy.delete}><Trash2 size={17} /></button>
        </div>
        <div className="block-quick-add">
          <select value={addition} aria-label={copy.addChoice} onChange={(event) => setAddition(event.target.value)}>
            {additions.filter(type=>!allowed||allowed.includes(type)).map((type) => <option key={type} value={type}>{en.blocks.addNames[type]}</option>)}
          </select>
          <button onClick={add}>{copy.add}</button>
        </div>
      </div>
      <div ref={container} className="blockly-host" role="application" aria-label={copy.editor} />
      <div className="block-editor-hint" role={valid ? 'status' : 'alert'}>{!valid ? copy.invalidBlocks : disconnected > 0 ? copy.disconnected(disconnected) : copy.dragHint}</div>
    </div>
  );
}
