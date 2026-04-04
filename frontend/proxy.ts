import { auth0 } from "./lib/auth0";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const connect_code = new URL(request.url).searchParams.get("connect_code");
  const response = await auth0.middleware(request);

  if (connect_code) {
    // auth0.middleware() redirects to /dashboard and strips connect_code.
    // Clone the response and attach connect_code as a short-lived cookie so
    // OAuthCallbackHandler can read it on the next render.
    const next = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    next.cookies.set("oauth_connect_code", connect_code, {
      maxAge: 60,
      httpOnly: false,
      path: "/",
      sameSite: "lax",
    });
    return next;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
