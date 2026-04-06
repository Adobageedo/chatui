import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login", 
    "/signup", 
    "/auth/callback", 
    "/forgot-password", 
    "/outlook",
    "/api"
  ];
  
  const isPublicRoute = publicRoutes.some((route) => 
    pathname === route || pathname.startsWith(route + "/")
  );
  
  // For now, allow all requests through - client-side auth will handle protection
  // This avoids Edge Runtime compatibility issues with Supabase SSR
  return NextResponse.next();
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
