import type { RequestHandler } from './$types';
import type { Incident, IncidentUpdate } from '$lib/types';

function requireAdmin(request: Request, adminKey?: string): boolean {
  if (!adminKey) return false;
  const provided = request.headers.get('x-admin-key') ?? '';
  return provided === adminKey;
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = platform?.env?.CODEX_STATUS;
  if (!kv) {
    return Response.json({ incidents: [] });
  }
  const listRaw = await kv.get('incidents:list');
  const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
  const incidents = await Promise.all(
    ids.map((id) => kv.get(`incidents:${id}`))
  ).then((vals) =>
    vals
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v) as Incident)
  );
  return Response.json({ incidents });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const kv = platform?.env?.CODEX_STATUS;
  const adminKey = platform?.env?.ADMIN_API_KEY;
  if (!requireAdmin(request, adminKey)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!kv) {
    return new Response('KV not configured', { status: 500 });
  }

  const body = await request.json();
  const { title, services = [], status = 'investigating' } = body;
  if (!title || typeof title !== 'string') {
    return Response.json({ error: 'title required' }, { status: 400 });
  }

  const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const incident: Incident = {
    id,
    title,
    status,
    services: Array.isArray(services) ? services : [],
    updates: [{ status, body: 'Incident created.', timestamp: now }],
    createdAt: now
  };

  await kv.put(`incidents:${id}`, JSON.stringify(incident));
  const listRaw = await kv.get('incidents:list');
  const ids: string[] = listRaw ? JSON.parse(listRaw) : [];
  ids.unshift(id);
  await kv.put('incidents:list', JSON.stringify(ids));

  return Response.json(incident);
};

export const PATCH: RequestHandler = async ({ request, platform }) => {
  const kv = platform?.env?.CODEX_STATUS;
  const adminKey = platform?.env?.ADMIN_API_KEY;
  if (!requireAdmin(request, adminKey)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!kv) {
    return new Response('KV not configured', { status: 500 });
  }

  const body = await request.json();
  const { id, status, body: updateBody } = body;
  if (!id || typeof id !== 'string') {
    return Response.json({ error: 'id required' }, { status: 400 });
  }

  const raw = await kv.get(`incidents:${id}`);
  if (!raw) {
    return Response.json({ error: 'Incident not found' }, { status: 404 });
  }

  const incident: Incident = JSON.parse(raw);
  const now = new Date().toISOString();

  if (status && ['investigating', 'identified', 'monitoring', 'resolved'].includes(status)) {
    incident.status = status;
    const up: IncidentUpdate = {
      status,
      body: typeof updateBody === 'string' ? updateBody : 'Status updated.',
      timestamp: now
    };
    incident.updates.push(up);
    if (status === 'resolved') {
      incident.resolvedAt = now;
    }
  }

  await kv.put(`incidents:${id}`, JSON.stringify(incident));
  return Response.json(incident);
};
