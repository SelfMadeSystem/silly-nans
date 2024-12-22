export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const id = url.searchParams.get('id');

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
