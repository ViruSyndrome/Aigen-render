import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Asset Studio | Premium AI Game Generation",
  description: "Next-gen AI generation pipeline optimized for game sprites, textures, SFX, and music.",
  openGraph: {
    images: ["/og-image.webp"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.webp"],
  },
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="min-h-full flex flex-col font-sans bg-bg-deep text-[#e8edf5]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
