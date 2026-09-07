// Identity headers are supplied by Sites dispatch, never by client-side code.
const CHAPTERS = new Set(['12', '18', '21']);
const MAX_BYTES = 12 * 1024 * 1024;
const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'Vary': 'oai-authenticated-user-id'}});

async function prefixFor(user) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(user));
  return `readings/${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}/anthology-2019/`;
}

export async function readingApi(request, env) {
  const user = request.headers.get('oai-authenticated-user-id');
  if (!user) return json({error: 'Sign in to the app to open your saved readings.'}, 401);
  if (!env.BUCKET) return json({error: 'PDF storage is not available yet. You can still read through EUR.'}, 503);
  const url = new URL(request.url);
  const chapter = url.pathname.match(/^\/api\/readings\/(12|18|21)(\/pdf)?$/);
  if (url.pathname !== '/api/readings' && !chapter) return json({error: 'Reading not found.'}, 404);
  try {
    const prefix = await prefixFor(user);
    if (url.pathname === '/api/readings' && request.method === 'GET') {
      const readings = await Promise.all([...CHAPTERS].map(async id => {
        const object = await env.BUCKET.head(`${prefix}${id}.pdf`);
        return {chapter: Number(id), saved: !!object, updatedAt: object?.uploaded?.toISOString() ?? null};
      }));
      return json({readings});
    }
    if (!chapter) return json({error: 'Method not allowed.'}, 405);
    const key = `${prefix}${chapter[1]}.pdf`;
    if (request.method === 'GET' && chapter[2]) {
      const object = await env.BUCKET.get(key);
      if (!object) return json({error: 'Add this chapter PDF first.'}, 404);
      return new Response(object.body, {headers: {
        'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
        'Vary': 'oai-authenticated-user-id', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'",
        'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename="anthology-2019-chapter-${chapter[1]}.pdf"`
      }});
    }
    if (request.method !== 'PUT' || chapter[2]) return json({error: 'Method not allowed.'}, 405);
    if (request.headers.get('Origin') !== url.origin) return json({error: 'Please add the PDF from within the app.'}, 403);
    if (request.headers.get('Content-Type') !== 'application/pdf') return json({error: 'Choose a PDF file.'}, 415);
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return json({error: 'Choose a chapter PDF smaller than 12 MB.'}, 413);
    if (!request.body) return json({error: 'The PDF is empty.'}, 400);
    const reader = request.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {await reader.cancel(); return json({error: 'Choose a chapter PDF smaller than 12 MB.'}, 413);}
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return json({error: 'This file is not a PDF.'}, 415);
    await env.BUCKET.put(key, bytes, {httpMetadata: {contentType: 'application/pdf'}, customMetadata: {edition: '2019', chapter: chapter[1]}});
    return json({saved: true, chapter: Number(chapter[1])});
  } catch (error) {
    console.error('Reading storage failed', error?.name ?? 'Error');
    return json({error: 'Your PDF could not be loaded or saved. Please try again.'}, 503);
  }
}
