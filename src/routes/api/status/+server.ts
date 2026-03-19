import type { RequestHandler } from './$types';
import type { StatusPayload, ServiceCheck } from '$lib/types';

const DEFAULT_SERVICES: ServiceCheck[] = [
  { id: 'api-health', name: 'API Health', status: 'unknown', uptimePercent: 0, lastCheck: '' },
  { id: 'extended-health', name: 'Extended Health', status: 'unknown', uptimePercent: 0, lastCheck: '' },
  { id: 'dashboard', name: 'Cloud Sync', status: 'unknown', uptimePercent: 0, lastCheck: '' },
  { id: 'auth', name: 'Authentication', status: 'unknown', uptimePercent: 0, lastCheck: '' },
  { id: 'llm', name: 'AI Predictions', status: 'unknown', uptimePercent: 0, lastCheck: '' }
];

const DEFAULT_PAYLOAD: StatusPayload = {
  services: DEFAULT_SERVICES,
  history: {},
  incidents: [],
  lastUpdated: ''
};

export const GET: RequestHandler = async ({ platform }) => {
  const kv = platform?.env?.CODEX_STATUS;
  if (!kv) {
    return Response.json(DEFAULT_PAYLOAD, {
      headers: { 'Cache-Control': 'public, max-age=60' }
    });
  }

  const [currentRaw, historyRaw, listRaw] = await Promise.all([
    kv.get('status:current'),
    kv.get('status:history'),
    kv.get('incidents:list')
  ]);

  const current = currentRaw ? JSON.parse(currentRaw) : null;
  const history = historyRaw ? JSON.parse(historyRaw) : {};
  const incidentIds: string[] = listRaw ? JSON.parse(listRaw) : [];

  const incidentRaws = await Promise.all(
    incidentIds.slice(0, 20).map((id) => kv.get(`incidents:${id}`))
  );
  const incidents = incidentRaws
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v));

  const services = current?.services?.length
    ? current.services
    : DEFAULT_SERVICES;
  const payload: StatusPayload = {
    services,
    history: history ?? DEFAULT_PAYLOAD.history,
    incidents,
    lastUpdated: current?.lastUpdated ?? ''
  };

  return Response.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=60' }
  });
};
