interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string; // Comma-separated list of allowed origins
}

function corsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const allowedOrigin = allowedOrigins.find((o) => o === origin) ?? allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim());

    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, allowedOrigins);

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers});
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/auth') {
      try {
        const body = (await request.json()) as {code?: string};

        if (!body.code) {
          return Response.json(
            {error: 'Missing code parameter'},
            {status: 400, headers},
          );
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: body.code,
          }),
        });

        const tokenData = (await tokenResponse.json()) as {
          access_token?: string;
          error?: string;
          error_description?: string;
        };

        if (tokenData.error) {
          return Response.json(
            {error: tokenData.error_description ?? tokenData.error},
            {status: 400, headers},
          );
        }

        return Response.json(
          {access_token: tokenData.access_token},
          {status: 200, headers},
        );
      } catch {
        return Response.json(
          {error: 'Internal server error'},
          {status: 500, headers},
        );
      }
    }

    return Response.json(
      {error: 'Not found'},
      {status: 404, headers},
    );
  },
} satisfies ExportedHandler<Env>;
