import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, request) => {
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
    url.pathname = `/merch${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (
    hostname.includes("assetrender") || 
    hostname.includes("aigenrenderasset") || 
    hostname.startsWith("asset.")
  ) {
    url.pathname = `/asset${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
