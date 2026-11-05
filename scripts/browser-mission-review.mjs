export default async function installMissionReview() {
  const [{ missions, missionWorldMap }, { LiveRun }, { checkMission }] = await Promise.all([
    import('/src/missions/content.ts'), import('/src/runtime/live-run.ts'), import('/src/missions/engine.ts'),
  ]);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const button = name => [...document.querySelectorAll('button')].find(item => item.textContent === name);
  const status = () => document.querySelector('.unified-stage')?.dataset.status;
  let mission, run, active = false, errors = [];
  window.addEventListener('message', event => {
    const data = event.data;
    if (!active || data?.channel !== 'spikesim-3d' || event.source !== document.querySelector('iframe')?.contentWindow) return;
    if (data.type === 'frame' && data.running) {
      const map = missionWorldMap(mission);
      run.frame({ t: data.t, robot: { x: data.x * 10 + map.size.width / 2, y: map.size.height / 2 - data.y * 10, heading: (data.yaw - 90) * Math.PI / 180, wheels: data.wheels, arms: [] }, objects: data.objects.map(o => ({ id: o.id, x: o.x * 10 + map.size.width / 2, y: map.size.height / 2 - o.y * 10, heading: 0 })), hub: data.hub, sensors: data.sensors, events: [] });
    }
    if (data.type === 'block') run.mark(String(data.id));
    if (data.type === 'variables') run.variables = data.values;
    if (data.type === 'sound') run.events.push({ type: 'sound', data: { t: run.snapshots.at(-1)?.t ?? 0, frequency: data.frequency, durationMs: data.durationMs } });
    if (data.type === 'collision') run.events.push({ type: 'collision', data: { wall: '3d obstacle' } });
    if (data.type === 'error') errors.push(String(data.message));
  });
  window.missionReview = {
    async load(id) {
      active = false;
      mission = missions.find(item => item.id === id);
      if (!mission) throw Error(`Unknown mission ${id}`);
      const selector = document.querySelector('.workspace-scene-picker select');
      selector.value = `mission:${id}`;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(500);
      const until = Date.now() + 40000;
      while (status() !== 'ready' && Date.now() < until) await delay(200);
      if (status() !== 'ready') throw Error(`Simulator ${status()}`);
      button('Expand simulator')?.click();
      button('Top view')?.click();
      await delay(600);
      const project = JSON.parse(localStorage.getItem('spikesim.playground.v1')).drafts.find(draft => draft.missionId === id);
      run = new LiveRun(missionWorldMap(mission), project.visualProgram);
      errors = [];
      return { id, title: mission.title, status: status() };
    },
    async start() {
      active = true; button('Run program').click();
      const until = Date.now() + 5000;
      while (!['running', 'complete', 'error'].includes(status()) && Date.now() < until) await delay(50);
      return { id: mission.id, status: status() };
    },
    report() {
      const execution = run.finish();
      const verdict = execution ? checkMission(mission, execution.result, missionWorldMap(mission), execution) : null;
      const saved = JSON.parse(localStorage.getItem('spikesim.playground.v1')).drafts.find(draft => draft.missionId === mission.id);
      return { id: mission.id, name: mission.title, checkedAt: new Date().toISOString(), status: status(), verdict, uiOutcome: saved.outcome, errors, end: execution?.result.end, events: run.events, usedBlocks: [...run.usedBlocks], variables: run.variables };
    },
  };
  return { installed: true, missions: missions.map(mission => mission.id) };
}
