/* SpikeSim local integration, GPL-3.0, 2026-11-01. */
try { if (!localStorage.getItem('whatsNew')) localStorage.setItem('whatsNew', '20260731'); } catch (_) { /* Upstream can still display its news. */ }
window.open = function (value) {
  var url = new URL(value, location.href);
  if (url.origin === location.origin && /\/(configurator|builder|arena|index)\.html$/.test(url.pathname)) location.href = url.href;
  return null;
};
window.addEventListener('load', function () {
  if (!document.getElementById('blocklyDiv') || !document.getElementById('simPanel')) return;
  document.body.classList.add('spikesim-split');
  function resize() {
    if (window.babylon && babylon.engine) babylon.engine.resize();
    window.dispatchEvent(new Event('resize'));
    if (window.simPanel && window.babylon && babylon.scene) simPanel.onActive();
  }
  document.querySelectorAll('.panelTabs li').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.body.classList.toggle('spikesim-full-sim', tab.id === 'navSim');
      setTimeout(resize, 0);
    });
  });
  var ready = setInterval(function () {
    if (window.babylon && babylon.scene && babylon.scene.isReady()) { clearInterval(ready); resize(); }
  }, 100);
  setTimeout(function () { clearInterval(ready); }, 30000);
});
