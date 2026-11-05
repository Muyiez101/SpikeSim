const demoClips = {
  move: { title: 'Your first little route', description: 'Two wheels carry the robot toward the landing pad. Distance controls how far it travels; speed controls how quickly it gets there.' },
  loops: { title: 'Make a repeatable pattern', description: 'The robot repeats its movement and turns to trace a pattern. A loop keeps the instructions short.' },
  distance: { title: "Notice what's ahead", description: 'A distance sensor watches for the wall. The robot stops when the reading reaches its programmed threshold.' },
};
const video = document.querySelector('#demo-video');
if (video) {
  for (const button of document.querySelectorAll('[data-demo]')) {
    button.addEventListener('click', () => {
      const id = button.dataset.demo;
      if (!Object.hasOwn(demoClips, id)) return;
      video.pause();
      video.poster = new URL(`./assets/demos/${id}.png`, import.meta.url).href;
      video.querySelector('source').src = new URL(`./assets/demos/${id}.mp4`, import.meta.url).href;
      video.querySelector('a').href = new URL(`./assets/demos/${id}.mp4`, import.meta.url).href;
      document.querySelector('#demo-captions').src = new URL(`./assets/demos/${id}.vtt`, import.meta.url).href;
      video.setAttribute('aria-label', `Demo: ${demoClips[id].title}`);
      document.querySelector('#demo-title').textContent = demoClips[id].title;
      document.querySelector('#demo-description').textContent = demoClips[id].description;
      for (const choice of document.querySelectorAll('[data-demo]')) choice.setAttribute('aria-pressed', String(choice === button));
      video.load();
    });
  }
}

const status = document.querySelector('#release-state');
const download = document.querySelector('#windows-download');

// Only enable a download after a reviewed release manifest names a real asset.
// A failed fetch keeps the useful static page and its GitHub Releases fallback.
if (status && download) {
  try {
    const response = await fetch(new URL('./release.json', import.meta.url), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Release information is unavailable');
    const release = await response.json();
    if (release.repository !== 'Muyiez101/SpikeSim' || typeof release.published !== 'boolean') throw new Error('Invalid release information');
    if (release.published) {
      const item = release.windows;
      if (typeof release.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(release.version) || !item || typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(item.sha256) || typeof item.url !== 'string'
        || !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || typeof item.signed !== 'boolean') throw new Error('Incomplete release information');
      const url = new URL(item.url);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password
        || !url.pathname.startsWith('/Muyiez101/SpikeSim/releases/download/') || !url.pathname.endsWith('.exe')) throw new Error('Invalid download location');
      download.setAttribute('href', url.href);
      download.hidden = false;
      document.querySelector('#release-version').textContent = `Version ${release.version}`;
      status.textContent = 'Your Windows preview is ready. Download the installer to get started.';
      document.querySelector('#release-details').textContent = `Windows 10 / 11 · 64-bit · ${(item.bytes / 1_000_000).toFixed(1)} MB`;
      document.querySelector('#signing-note').hidden = item.signed;
      document.querySelector('#release-checksum').textContent = item.sha256.toUpperCase();
      document.querySelector('#checksum-panel').hidden = false;
    }
  } catch {
    download.hidden = true;
    download.removeAttribute('href');
    status.textContent = 'The download could not be checked. Visit GitHub Releases for the latest available build.';
  }
}
