import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Skip static resources, images, Next.js build internals, and API routes
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Rewrite matching hostnames to their respective App Router entrypoints
  if (
    hostname.includes("merchrender") || 
    hostname.includes("aigenrendermerch") || 
    hostname.startsWith("merch.")
  ) {
    // Rewrite path internally to /merch
    url.pathname = `/merch${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (
    hostname.includes("assetrender") || 
    hostname.includes("aigenrenderasset") || 
    hostname.startsWith("asset.")
  ) {
    // Rewrite path internally to /asset
    url.pathname = `/asset${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Default behavior (returns standard home route)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
