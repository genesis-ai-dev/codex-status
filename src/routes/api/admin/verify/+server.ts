import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
  const adminKey = platform?.env?.ADMIN_API_KEY;
  if (!adminKey) {
    return new Response('ADMIN_API_KEY not configured on server', { status: 503 });
  }
  const provided = request.headers.get('x-admin-key') ?? '';
  if (provided !== adminKey) {
    return new Response('Unauthorized', { status: 401 });
  }
  return Response.json({ ok: true });
};
