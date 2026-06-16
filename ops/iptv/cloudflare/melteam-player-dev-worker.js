const PLAYER_ORIGIN = 'https://player-933.pages.dev';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const upstreamUrl = new URL(url.pathname + url.search, PLAYER_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });

  return new Response(response.body, response);
}
