export default async function installFieldReview() {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const button = name => [...document.querySelectorAll('button')].find(item => item.textContent === name);
  const openButton = () => button('Open program') ?? button('Replace and open');
  const status = () => document.querySelector('.unified-stage')?.dataset.status;
  let events = {}, errors = [], project;
  window.addEventListener('message', event => {
    if (event.source !== document.querySelector('iframe')?.contentWindow || event.data?.channel !== 'spikesim-3d') return;
    events[event.data.type] = event.data;
    if (event.data.type === 'error') errors.push(event.data.message);
  });
  async function ready() {
    const until = Date.now() + 45000;
    while (status() !== 'ready' && Date.now() < until) await delay(200);
    if (status() !== 'ready') throw Error(`Simulator ${status()}`);
  }
  window.fieldReview = {
    async load(file, angled = false) {
      const content = await (await fetch(`/recordings/${file}`)).text();
      project = JSON.parse(content);
      const transfer = new DataTransfer();
      transfer.items.add(new File([content], file.split('/').at(-1), { type: 'application/json' }));
      const input = document.querySelector('input[aria-label="Choose a program file"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const until = Date.now() + 10000;
      while (!openButton() && Date.now() < until) await delay(100);
      if (!openButton()) throw Error('Program import did not become ready');
      openButton().click();
      await delay(500); await ready();
      button('Expand simulator')?.click(); button('Top view').click();
      await delay(700);
      if (angled) {
        const w = document.querySelector('iframe').contentWindow;
        const b = w.babylon, c = b.cameraArc;
        c.beta = Math.PI / 3;
        const size = b.world.processedOptions;
        const width = size.groundLength || 100, depth = size.groundWidth || 100;
        const aspect = b.engine.getRenderWidth() / b.engine.getRenderHeight();
        c.orthoRadius = Math.max((depth * Math.cos(c.beta) + 20 * Math.sin(c.beta)) / 2, width / (2 * aspect)) * 1.15 * 2.5;
        b.zoomOrtho();
      }
      events = {}; errors = [];
      return { name: project.name, status: status(), robot: project.robot?.name };
    },
    async obstacleLayout(pattern = [-1, 1, -1]) {
      const w = document.querySelector('iframe').contentWindow;
      const world = w.world_LineFollowing, original = world.loadObstacles2;
      world.loadObstacles2 = function(scene) {
        let i = 0; const add = this.addBox;
        this.addBox = function(scene, size, pos) {
          if (Math.abs(pos[0]) === 30) pos[0] = pattern[i++] * 30;
          return add.call(this, scene, size, pos);
        };
        try { return original.call(this, scene); } finally { this.addBox = add; }
      };
      button('Reset').click(); await delay(500); await ready();
      button('Top view').click(); await delay(500);
      const b = w.babylon, c = b.cameraArc;
      c.alpha = 0; c.beta = 0; c.lockedTarget = null;
      c.setTarget(new w.BABYLON.Vector3(0, 0, 0));
      const aspect = b.engine.getRenderWidth() / b.engine.getRenderHeight();
      c.orthoRadius = Math.max(50, 150 / aspect) * 1.28 * 2.5;
      b.zoomOrtho();
      return { pattern, status: status() };
    },
    async start() {
      errors = []; button('Run program').click();
      const until = Date.now() + 5000;
      while (!['running', 'complete', 'error'].includes(status()) && Date.now() < until) await delay(50);
      return status();
    },
    report() {
      return { name: project.name, checkedAt: new Date().toISOString(), status: status(), goal: events['goal-progress'], frame: events.frame, field: events['field-state'], requestedGoal: project.fieldGoal, errors };
    },
  };
  return 'Field review ready';
}
