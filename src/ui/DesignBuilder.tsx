import {useEffect,useRef,useState} from 'react';
import {en} from '../shared/strings/en';
import {customRobotSchema,customWorldSchema,designRobot,type CustomRobot,type CustomWorld,type DesignOptions} from '../sim/custom-design';
import './design-builder.css';

type Props={kind:'robot'|'world';name?:string;options?:DesignOptions;template?:string;worldFile?:string;onClose:()=>void;onRobot:(robot:CustomRobot)=>void;onWorld:(world:CustomWorld)=>void};
export function DesignBuilder({kind,name:initialName,options,template,worldFile,onClose,onRobot,onWorld}:Props){
  const dialog=useRef<HTMLDialogElement>(null),iframe=useRef<HTMLIFrameElement>(null);
  const [root,setRoot]=useState<string|null>(()=>window.desktop?null:'./gears/');
  const [ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  const [name,setName]=useState(initialName??(kind==='robot'?en.design.fll:en.design.defaultWorld));
  const [preset,setPreset]=useState(options?'custom':template??'fll');
  const callbacks=useRef({onClose,onRobot,onWorld});
  useEffect(()=>{callbacks.current={onClose,onRobot,onWorld};},[onClose,onRobot,onWorld]);
  const origin=root?new URL(root,location.href).origin:location.origin;
  const upload=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>2000000||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError(en.design.invalid);return;}
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(image.width,image.height));
      canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
      const encoded=canvas.toDataURL('image/jpeg',0.7);
      if(encoded.length>120000)throw new Error('Large texture');
      setLoaded(false);setError('');iframe.current?.contentWindow?.postMessage({channel:'spikesim-builder',type:'image',image:encoded},origin);
    }catch{setError(en.design.invalid);}finally{URL.revokeObjectURL(url);}
  };
  useEffect(()=>{dialog.current?.showModal();if(window.desktop)void window.desktop.getGearsUrl().then(setRoot).catch(()=>setError(en.unified.loadError));},[]);
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.source!==iframe.current?.contentWindow||event.origin!==origin||event.data?.channel!=='spikesim-builder')return;
      const data=event.data;
      if(data.type==='ready')setReady(true);
      if(data.type==='configured')setLoaded(true);
      if(data.type==='error')setError(en.design.invalid);
      if(data.type==='design'){
        try{
          if(kind==='robot'){const design=customRobotSchema.parse(data);designRobot(design);callbacks.current.onRobot(design);}
          else callbacks.current.onWorld(customWorldSchema.parse(data));
          callbacks.current.onClose();
        }catch{setError(en.design.invalid);}
      }
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[origin,kind]);
  useEffect(()=>{
    if(!ready)return;
    iframe.current?.contentWindow?.postMessage({channel:'spikesim-builder',type:'configure',options:kind==='world'||preset==='custom'?options:undefined,template:preset,worldFile,fll:preset==='fll',labels:en.design.labels,uploadLabel:en.design.upload},origin);
  },[ready,kind,options,preset,worldFile,origin]);
  return <dialog className="design-builder" ref={dialog} aria-label={kind==='robot'?en.design.robot:en.design.world} onCancel={event=>{event.preventDefault();onClose();}}>
    <header><h2>{kind==='robot'?en.design.robot:en.design.world}</h2><label>{en.design.name}<input value={name} maxLength={80} onChange={event=>setName(event.target.value)}/></label>
      {kind==='robot'&&<label>{en.design.preset}<select value={preset} onChange={event=>{setLoaded(false);setPreset(event.target.value);if(event.target.value==='fll')setName(en.design.fll);}}>{options&&<option value="custom">{en.design.customRobot}</option>}<option value="fll">{en.design.fll}</option>{en.unified.robots.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
      {kind==='world'&&<label>{en.design.upload}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!loaded} onChange={event=>{void upload(event.target.files?.[0]);}}/></label>}
      <button onClick={onClose}>{en.design.cancel}</button><button className="design-use" disabled={!loaded||!name.trim()} onClick={()=>{setError('');iframe.current?.contentWindow?.postMessage({channel:'spikesim-builder',type:'save',name:name.trim()},origin);}}>{kind==='robot'?en.design.useRobot:en.design.useWorld}</button>
    </header>
    <p>{kind==='robot'?preset==='fll'?en.design.fllHelp:en.design.robotHelp:en.design.worldHelp}</p>
    {error&&<p role="alert">{error}</p>}
    <div className="design-canvas">{root&&<iframe ref={iframe} title={kind==='robot'?en.design.robotFrame:en.design.worldFrame} src={`${root}${kind}-builder.html`} onLoad={()=>iframe.current?.contentWindow?.postMessage({channel:'spikesim-builder',type:'hello'},origin)} sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"/>}{!loaded&&<div className="design-loading" role="status">{en.design.loading}</div>}</div>
  </dialog>;
}
