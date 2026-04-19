/**
 * CORS Utility for API Routes
 * Handles CORS headers and preflight requests for Outlook add-in
 */

const ALLOWED_ORIGINS = [
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.live.com',
  'https://outlook.cloud.microsoft',
  'https://chatui-nine-mu.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080',
];

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Wildcard subdomain match for Microsoft domains
  const microsoftPatterns = [
    /^https:\/\/.*\.office\.com$/,
    /^https:\/\/.*\.office365\.com$/,
    /^https:\/\/.*\.outlook\.com$/,
    /^https:\/\/.*\.microsoft\.com$/,
    /^https:\/\/.*\.cloud\.microsoft$/,
  ];
  
  return microsoftPatterns.some(pattern => pattern.test(origin));
}

/**
 * Get CORS headers for response
 */
export function corsHeaders(origin?: string | null): Record<string, string> {
  const requestOrigin = origin || '*';
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight OPTIONS request
 * Returns Response if it's an OPTIONS request, null otherwise
 */
export function handleCors(request: Request): Response | null {
  // Only handle OPTIONS requests
  if (request.method !== 'OPTIONS') {
    return null;
  }
  
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);
  
  return new Response(null, {
    status: 200,
    headers,
  });
}

/**
 * Add CORS headers to an existing Response
 */
export function addCorsHeaders(response: Response, origin?: string | null): Response {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
