// Run from the recording index with the native Chrome review tools.
export default async function installVideoReview() {
  const coverage = await (await fetch('/recordings/coverage.json')).json();
  const entries = coverage.entries.filter(entry => entry.status === 'recorded');
  const video = document.createElement('video');
  video.muted = true; video.preload = 'auto'; video.playsInline = true;
  const waitFor = (event, action) => new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); video.removeEventListener(event, success); video.removeEventListener('error', fail); };
    const success = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(Error(video.error?.message || `Video ${event} timed out`)); };
    const timeout = setTimeout(fail, 15000);
    video.addEventListener(event, success, { once: true }); video.addEventListener('error', fail, { once: true });
    action();
  });
  const canvas = document.createElement('canvas'); canvas.width = 432; canvas.height = 300;
  const context = canvas.getContext('2d');
  const results = [];
  const samples = new Map();
  window.videoReview = {
    count: entries.length,
    async check(index) {
      const entry = entries[index];
      try {
        await waitFor('loadeddata', () => { video.src = `/recordings/${entry.video}`; video.load(); });
        if (!Number.isFinite(video.duration) || video.duration < 1) throw Error('Invalid duration');
        const frames = [];
        for (const time of [Math.min(.3, video.duration / 5), video.duration / 2, Math.max(.1, video.duration - .4)]) {
          await waitFor('seeked', () => { video.currentTime = time; });
          context.fillStyle = '#202136'; context.fillRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
          const width = video.videoWidth * scale, height = video.videoHeight * scale;
          context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let min = 255, max = 0;
          for (let p = 0; p < pixels.length; p += 40) { min = Math.min(min, pixels[p]); max = Math.max(max, pixels[p]); }
          if (max - min < 20) throw Error(`Blank frame at ${time}`);
          frames.push({ time, range: max - min });
          if (['basics-1', 'patterns-4', 'sensors-3', 'practice-lift', 'practice-carry', 'world:lineFollowing:obstacles2'].includes(entry.id)) {
            samples.set(`${entry.id}-${frames.length}`, canvas.toDataURL('image/jpeg', .8));
          }
        }
        const result = { id: entry.id, video: entry.video, duration: video.duration, width: video.videoWidth, height: video.videoHeight, frames, passed: true };
        results.push(result); return result;
      } catch (error) {
        const result = { id: entry.id, video: entry.video, passed: false, error: String(error) };
        results.push(result); return result;
      }
    },
    results: () => results,
    sample: key => samples.get(key),
    async playback() {
      video.currentTime = 1; const start = video.currentTime;
      await video.play(); await new Promise(resolve => setTimeout(resolve, 800)); video.pause();
      return { advanced: video.currentTime - start, error: video.error?.message };
    },
  };
  return { videos: entries.length };
}
