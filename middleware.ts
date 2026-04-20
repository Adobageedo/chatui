import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ENV, APP_CONFIG } from '@/config';

export async function middleware(request: NextRequest) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    ENV.supabase.url,
    ENV.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Check if request is from Outlook mode (via referer or query param)
  const referer = request.headers.get('referer') || '';
  const searchParams = request.nextUrl.searchParams;
  const isFromOutlook = referer.includes('/outlook') || pathname.startsWith('/outlook') || searchParams.get('outlook') === 'true';
  
  // Allow API requests from Outlook without authentication
  // Include all thread-related API routes (threads, messages, title, etc.)
  const outlookApiRoutes = ['/api/chat', '/api/threads', '/api/upload'];
  const isOutlookApiRequest = isFromOutlook && outlookApiRoutes.some((route) => pathname.startsWith(route));

  // Public routes that don't require authentication
  const publicRoutes = APP_CONFIG.auth.publicRoutes;
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route)) || isOutlookApiRequest;

  // Redirect authenticated users away from auth pages (but not from Outlook)
  if (user && isPublicRoute && pathname !== "/auth/callback" && !pathname.startsWith("/outlook")) {
    const onboardingCompleted = user?.user_metadata?.onboarding_completed;

    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL(APP_CONFIG.auth.redirectUrls.onboarding, request.url));
    }
    return NextResponse.redirect(new URL(APP_CONFIG.auth.redirectUrls.chat, request.url));
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL(APP_CONFIG.auth.redirectUrls.login, request.url));
  }

  // Check onboarding completion for protected routes
  if (user && !isPublicRoute && pathname !== APP_CONFIG.auth.redirectUrls.onboarding) {
    const onboardingCompleted = user?.user_metadata?.onboarding_completed;

    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL(APP_CONFIG.auth.redirectUrls.onboarding, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - /outlook (Outlook add-in files)
     */
    "/((?!_next/static|_next/image|favicon.ico|outlook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};