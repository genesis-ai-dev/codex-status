const API = process.env.API_BASE || 'https://api.frontierrnd.com';

async function probe(id, method, path, body, expectStatus) {
  const expect = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  const start = Date.now();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    return { id, ok: false, statusCode: 0, ms: Date.now() - start };
  }
  const ms = Date.now() - start;
  const ok = expect.includes(res.status);
  return { id, ok, statusCode: res.status, ms };
}

const results = await Promise.all([
  probe('api-health', 'GET', '/health', null, 200),
  probe('extended-health', 'GET', '/api/v2/health', null, 200),
  probe('dashboard', 'GET', '/api/v2/health/dashboard', null, 200),
  probe('auth', 'POST', '/api/v2/auth/token', { username: 'x', password: 'y' }, 401),
  probe('llm', 'POST', '/api/v2/chat/completions', {}, [400, 401, 422])
]);

console.log(JSON.stringify({ results }));
