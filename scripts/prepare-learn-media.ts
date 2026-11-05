import { copyFileSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { lessons } from '../src/learn/catalog';
import { en } from '../src/shared/strings/en';

// Reviewed against the recorded action, not arbitrary video midpoints (some have idle tails).
const frames: Record<string, [number, number, number]> = {
  move: [0.4, 1.8, 5.26],
  turn: [0.4, 3, 6.7],
  events: [0.4, 0.95, 5.38],
  loops: [0.4, 6.8, 15.06],
  distance: [0.4, 3.3, 6.79],
  colour: [0.4, 3.6, 5.42],
  decisions: [0.4, 1.35, 5.41],
  variables: [0.4, 2.2, 6.26],
  functions: [0.4, 6, 13.89],
  attachments: [0.4, 3.5, 9.25],
  debugging: [0.4, 4.42, 8.34],
  line: [0.4, 18, 37],
};

// Reuse successful recordings only. This script never starts a simulator or recorder.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/recordings/index.html');
const validation = JSON.parse(readFileSync('recordings/video-validation.json', 'utf8')) as {
  entries: { id: string; video: string; duration: number; passed: boolean }[];
};
const timestamp = (seconds: number) =>
  new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
const manifest = [];
try {
  for (const lesson of lessons) {
    const entry = validation.entries.find(
      (item) => item.video === `videos/${lesson.recording}.mp4`,
    );
    const result = JSON.parse(readFileSync(`recordings/results/${lesson.recording}.json`, 'utf8'));
    if (
      !entry?.passed ||
      result.status !== 'complete' ||
      !(result.verdict?.passed || result.goal?.passed) ||
      result.errors?.length
    )
      throw Error(`No successful evidence for ${lesson.id}`);
    const source = resolve(`recordings/videos/${lesson.recording}.mp4`),
      dest = resolve(`public/learn/${lesson.id}`);
    mkdirSync(dest, { recursive: true });
    copyFileSync(source, join(dest, 'example.mp4'));
    const times =
      frames[lesson.id] ??
      (lesson.id === 'python' || lesson.id === 'conversions'
        ? frames.move
        : [
            0.4,
            Number((entry.duration * 0.4).toFixed(2)),
            Number((entry.duration - 0.5).toFixed(2)),
          ]);
    for (const [index, time] of times.entries()) {
      const png = await page.evaluate(
        async ({ recording, time }) => {
          const video = document.createElement('video');
          video.muted = true;
          video.preload = 'auto';
          video.src = `/recordings/videos/${recording}.mp4`;
          const wait = (event: string) =>
            new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => reject(Error('Video decode timed out')), 15000);
              video.addEventListener(
                event,
                () => {
                  clearTimeout(timer);
                  resolve();
                },
                { once: true },
              );
              video.addEventListener(
                'error',
                () => {
                  clearTimeout(timer);
                  reject(Error('Video decode failed'));
                },
                { once: true },
              );
            });
          await wait('loadeddata');
          const seek = wait('seeked');
          video.currentTime = time;
          await seek;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')!.drawImage(video, 0, 0);
          video.removeAttribute('src');
          video.load();
          return canvas.toDataURL('image/png').split(',')[1];
        },
        { recording: lesson.recording, time },
      );
      writeFileSync(join(dest, `step-${index + 1}.png`), Buffer.from(png, 'base64'));
    }
    const boundaries = [0, 0.7, times[2] - 0.3, entry.duration];
    writeFileSync(
      join(dest, 'captions.vtt'),
      'WEBVTT\n\n' +
        en.learning.mediaNotes[lesson.id]
          .map(
            (step, i) =>
              `${i + 1}\n${timestamp(boundaries[i])} --> ${timestamp(boundaries[i + 1])}\n${step}\n`,
          )
          .join('\n'),
    );
    manifest.push({
      id: lesson.id,
      recording: lesson.recording,
      duration: entry.duration,
      times,
      bytes: statSync(source).size,
      sha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
    });
  }
} finally {
  await browser.close();
}
writeFileSync('src/learn/media.json', JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(
  `Prepared ${manifest.length} existing videos and ${manifest.length * 3} screenshots.\n`,
);
