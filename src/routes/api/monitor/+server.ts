import type { RequestHandler } from './$types';
import type { ServiceCheck, DayRollup } from '$lib/types';

const SERVICES: Array<{ id: string; name: string }> = [
  { id: 'api-health', name: 'API Health' },
  { id: 'extended-health', name: 'Extended Health' },
  { id: 'dashboard', name: 'Cloud Sync' },
  { id: 'auth', name: 'Authentication' },
  { id: 'llm', name: 'AI Predictions' }
];

function getStatus(ok: boolean, statusCode?: number): ServiceCheck['status'] {
  if (ok) return 'operational';
  if (statusCode && statusCode >= 500) return 'outage';
  return 'degraded';
}

interface ChecksToday {
  [serviceId: string]: { up: number; total: number };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const kv = platform?.env?.CODEX_STATUS;
  const monitorKey = platform?.env?.MONITOR_API_KEY;
  const provided = request.headers.get('x-monitor-key') ?? '';

  if (!monitorKey || provided !== monitorKey) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!kv) {
    return new Response('KV not configured', { status: 500 });
  }

  const body = await request.json();
  const results: Array<{ id: string; ok: boolean; statusCode?: number; ms?: number }> =
    body.results ?? [];

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const currentRaw = await kv.get('status:current');
  const prev = currentRaw ? JSON.parse(currentRaw) : { services: [], checksToday: {} };
  const prevDate = prev.lastUpdated?.slice(0, 10);
  const checksToday: ChecksToday =
    prevDate === today ? { ...(prev.checksToday ?? {}) } : {};

  const services: ServiceCheck[] = SERVICES.map((s) => {
    const r = results.find((x) => x.id === s.id);
    const ok = r?.ok ?? false;
    const status = getStatus(ok, r?.statusCode);

    const ct = checksToday[s.id] ?? { up: 0, total: 0 };
    ct.total += 1;
    if (status === 'operational') ct.up += 1;
    checksToday[s.id] = ct;

    const uptimePercent = ct.total > 0 ? (ct.up / ct.total) * 100 : 100;

    return {
      id: s.id,
      name: s.name,
      status,
      uptimePercent,
      lastCheck: now,
      lastCheckMs: r?.ms
    };
  });

  const currentPayload = {
    services,
    lastUpdated: now,
    checksToday
  };
  await kv.put('status:current', JSON.stringify(currentPayload));

  const min = new Date().getMinutes();
  if (min % 30 < 5) {
    const historyRaw = await kv.get('status:history');
    const history: Record<string, DayRollup[]> = historyRaw ? JSON.parse(historyRaw) : {};
    for (const s of services) {
      const ct = checksToday[s.id] ?? { up: 0, total: 0 };
      const dayUptime = ct.total > 0 ? (ct.up / ct.total) * 100 : 100;
      if (!history[s.id]) history[s.id] = [];
      const dayIdx = history[s.id].findIndex((d) => d.date === today);
      const rollup: DayRollup = { date: today, uptime: dayUptime, checks: ct.total };
      if (dayIdx >= 0) {
        history[s.id][dayIdx] = rollup;
      } else {
        history[s.id].push(rollup);
        history[s.id].sort((a, b) => a.date.localeCompare(b.date));
        if (history[s.id].length > 90) {
          history[s.id] = history[s.id].slice(-90);
        }
      }
    }
    await kv.put('status:history', JSON.stringify(history));
  }

  return Response.json({ ok: true });
};
