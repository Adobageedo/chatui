import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables not set');
      return supabaseResponse;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/signup", "/auth/callback", "/forgot-password", "/outlook"];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    // Redirect authenticated users away from auth pages
    if (user && isPublicRoute && pathname !== "/auth/callback") {
      const onboardingCompleted = user?.user_metadata?.onboarding_completed;

      if (!onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    // Redirect unauthenticated users to login
    if (!user && !isPublicRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check onboarding completion for protected routes
    if (user && !isPublicRoute && pathname !== "/onboarding") {
      const onboardingCompleted = user?.user_metadata?.onboarding_completed;

      if (!onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return response without auth check on error to prevent complete failure
    return NextResponse.next({
      request,
    });
  }
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
