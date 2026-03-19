import type { RequestHandler } from './$types';
import type { ServiceStatus } from '$lib/types';

interface ProbeSpec {
  id: string;
  name: string;
  method: string;
  path: string;
  body?: string;
  expectStatus: number;
}

const PROBES: ProbeSpec[] = [
  { id: 'api-health', name: 'API Health', method: 'GET', path: '/health', expectStatus: 200 },
  { id: 'extended-health', name: 'Extended Health', method: 'GET', path: '/api/v2/health', expectStatus: 200 },
  { id: 'dashboard', name: 'Cloud Sync', method: 'GET', path: '/api/v2/health/dashboard', expectStatus: 200 },
  { id: 'auth', name: 'Authentication', method: 'POST', path: '/api/v2/auth/token', body: '{"username":"x","password":"y"}', expectStatus: 401 },
  { id: 'llm', name: 'AI Predictions', method: 'POST', path: '/api/v2/chat/completions', body: '{}', expectStatus: 401 }
];

function deriveStatus(httpStatus: number, expectedStatus: number): ServiceStatus {
  if (httpStatus === expectedStatus) return 'operational';
  if (httpStatus >= 500 || httpStatus === 0) return 'outage';
  return 'degraded';
}

export const GET: RequestHandler = async ({ platform }) => {
  const apiBase = (platform?.env as Record<string, string> | undefined)?.API_BASE
    ?? 'https://api.frontierrnd.com';

  const now = new Date().toISOString();

  const results = await Promise.allSettled(
    PROBES.map(async (probe) => {
      const start = Date.now();
      try {
        const res = await fetch(`${apiBase}${probe.path}`, {
          method: probe.method,
          headers: probe.body ? { 'Content-Type': 'application/json' } : {},
          body: probe.body ?? null,
          signal: AbortSignal.timeout(6000)
        });
        const ms = Date.now() - start;
        return { id: probe.id, name: probe.name, httpStatus: res.status, ms };
      } catch {
        return { id: probe.id, name: probe.name, httpStatus: 0, ms: Date.now() - start };
      }
    })
  );

  const services = results.map((r, i) => {
    const probe = PROBES[i];
    if (r.status === 'fulfilled') {
      const { id, name, httpStatus, ms } = r.value;
      return { id, name, status: deriveStatus(httpStatus, probe.expectStatus), ms };
    }
    return { id: probe.id, name: probe.name, status: 'outage' as ServiceStatus, ms: null };
  });

  return Response.json({ services, probeTime: now }, {
    headers: { 'Cache-Control': 'no-store' }
  });
};
