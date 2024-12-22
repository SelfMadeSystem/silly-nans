const NAN_URL = 'https://shenanigans.shoghisimon.ca/collection/shadow-dom';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const pathname = url.pathname.substring(1); // Remove leading slash

    // Redirect to NAN_URL if pathname is empty
    if (!pathname) {
      return Response.redirect(NAN_URL, 301);
    }

    // Check if the pathname matches a specific pattern
    if (pathname) {
      const redirectUrl = `${NAN_URL}?id=${pathname}`;
      return Response.redirect(redirectUrl, 301);
    }

    if (request.method === 'GET' && id) {
      const value = await env.MY_KV_NAMESPACE.get(id);
      if (value) {
        return new Response(value, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        return new Response('Not Found', {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Bad Request', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
} satisfies ExportedHandler<Env>;
