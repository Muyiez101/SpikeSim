import { describe, expect, it } from 'vitest';
import { readProjects, writeProjects, type PreviewProject } from './projects';

const project: PreviewProject = {
  schemaVersion: 1,
  id: 'robot-1',
  name: 'Practice robot',
  kind: 'robot',
  color: '#a88cff',
  blocks: ['move'],
  updatedAt: '2026-10-26T10:00:00.000Z',
};

describe('preview projects', () => {
  it('rejects malformed stored projects', () => {
    const values = new Map<string, string>([['spikesim.projects.v1', JSON.stringify([{ id: 'bad' }])]]);
    expect(readProjects({ getItem: (key) => values.get(key) ?? null })).toEqual([]);
  });

  it('round trips a valid project list', () => {
    const values = new Map<string, string>();
    const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(writeProjects(store, [project])).toBe(true);
    expect(readProjects(store)).toEqual([project]);
  });
});
