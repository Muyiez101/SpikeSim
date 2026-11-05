import { z } from 'zod';
import { en } from '../shared/strings/en';
import { runtime3dResponseSchema, type Runtime3dRequest } from './runtime3d-protocol';
import {
  authSchema,
  infoSchema,
  programResponseSchema,
  responseSchema,
  viewSchema,
  type CompetitionOperation,
  type CompetitionSettings,
  type CompetitionTransport,
} from './protocol';

export class ConnectionError extends Error {}
export class SignInError extends Error {}

// getRandomValues also works on an ordinary HTTP school-network origin.
export function operationId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Constructing a transport never connects. Requests follow an explicit action. */
export class LanCompetitionTransport implements CompetitionTransport {
  private async request<T>(
    route: string,
    schema: z.ZodType<T>,
    data?: unknown,
    token?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`/api/classroom${route}`, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      });
    } catch {
      throw new ConnectionError(en.classroom.errors.unavailable);
    }
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new ConnectionError(en.classroom.errors.unavailable);
    const text = await response.text();
    if (text.length > 4_000_000) throw Error(en.classroom.errors.invalid);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw Error(en.classroom.errors.invalid);
    }
    if (!response.ok) {
      const parsed = z.object({ error: z.string().max(500) }).safeParse(value);
      const message = parsed.success ? parsed.data.error : en.classroom.errors.invalid;
      if (response.status === 401) throw new SignInError(message);
      throw Error(message);
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw Error(en.classroom.errors.invalid);
    return parsed.data;
  }
  info() {
    return this.request('/info', infoSchema);
  }
  create(settings: CompetitionSettings, pin: string, opId: string) {
    return this.request('/sessions', authSchema, { version: 1, settings, pin, opId });
  }
  join(code: string, name: string, pin: string) {
    return this.request(`/sessions/${encodeURIComponent(code)}/join`, authSchema, {
      version: 1,
      name,
      pin,
    });
  }
  teacher(code: string, pin: string) {
    return this.request(`/sessions/${encodeURIComponent(code)}/teacher`, authSchema, {
      version: 1,
      pin,
    });
  }
  read(code: string, token: string) {
    return this.request(`/sessions/${code}`, viewSchema, undefined, token);
  }
  async act(code: string, token: string, operation: CompetitionOperation) {
    return (await this.request(`/sessions/${code}/actions`, responseSchema, operation, token)).view;
  }
  program(code: string, token: string, entryId: string) {
    return this.request(
      `/sessions/${code}/entries/${entryId}/program`,
      programResponseSchema,
      undefined,
      token,
    );
  }
  resultProgram(code: string, token: string, resultId: string, side: number) {
    return this.request(
      `/sessions/${code}/results/${resultId}/program?side=${side}`,
      programResponseSchema,
      undefined,
      token,
    );
  }
  attemptProgram(code: string, token: string, attemptId: string) {
    return this.request(`/sessions/${code}/attempts/${attemptId}/program`, programResponseSchema, undefined, token);
  }
  runtime(code: string, token: string, update: Runtime3dRequest) {
    return this.request(`/sessions/${code}/runtime`, runtime3dResponseSchema, update, token);
  }
}
