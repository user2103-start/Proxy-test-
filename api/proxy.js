// api/proxy.js
export const config = {
  runtime: 'edge',
};

// Simple in-memory rate limit (per IP)
const rateLimit = new Map();

export default async function handler(request) {
  // =========================================
  // 1. CORS HEADERS
  // =========================================
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
  };

  // Handle preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // =========================================
  // 2. RATE LIMIT (100 req/min per IP)
  // =========================================
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }
  
  const requests = rateLimit.get(ip);
  const windowStart = now - 60000; // 1 minute
  
  // Remove old requests
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  if (requests.length >= 1000) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
  
  requests.push(now);

  // =========================================
  // 3. EXTRACT PATH & FORWARD TO ORIGINAL API
  // =========================================
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');
  
  if (!path) {
    return new Response(JSON.stringify({ error: 'Invalid API path' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://api.thescholarverse.site/missionjeet/${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // ✅ Add timestamp for auto-detect
    data._timestamp = Date.now();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy server error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
                                        }
