import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory rate limiter (token bucket)
const rateBuckets = new Map<string, { tokens: number; lastRefill: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now - bucket.lastRefill > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { tokens: RATE_LIMIT - 1, lastRefill: now });
    return true;
  }

  if (bucket.tokens <= 0) return false;
  bucket.tokens--;
  return true;
}

// Clean up old buckets every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.lastRefill < cutoff) rateBuckets.delete(key);
  }
}, 300_000);

function getCorsOrigin(request: NextRequest): string {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || ['*'];
  if (allowedOrigins.includes('*')) return '*';

  const origin = request.headers.get('origin') || '';
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const isApi = request.nextUrl.pathname.startsWith('/api');

  // OPTIONS preflight handler
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set('Access-Control-Allow-Origin', getCorsOrigin(request));
    preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    preflight.headers.set('Access-Control-Max-Age', '86400');
    return preflight;
  }

  // Rate limiting for API routes
  if (isApi && !checkRateLimit(ip)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
      { status: 429 }
    );
  }

  const response = NextResponse.next();

  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', getCorsOrigin(request));
  if (!process.env.CORS_ALLOWED_ORIGINS?.includes('*')) {
    response.headers.set('Vary', 'Origin');
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Powered-By', ''); // Remove Next.js branding

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
