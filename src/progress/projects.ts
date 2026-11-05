import { z } from 'zod';

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['robot', 'program']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  blocks: z.array(z.enum(['move', 'turn', 'light'])).max(100),
  updatedAt: z.string().datetime(),
});
export type PreviewProject = z.infer<typeof projectSchema>;
export const projectsKey = 'spikesim.projects.v1';
export function readProjects(storage: Pick<Storage, 'getItem'>): PreviewProject[] {
  try {
    const raw = storage.getItem(projectsKey);
    if (!raw) return [];
    const result = z.array(projectSchema).max(100).safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch { return []; }
}
export function writeProjects(storage: Pick<Storage, 'setItem'>, projects: PreviewProject[]): boolean {
  try { storage.setItem(projectsKey, JSON.stringify(z.array(projectSchema).max(100).parse(projects))); return true; }
  catch { return false; }
}
