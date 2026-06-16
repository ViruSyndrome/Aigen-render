import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIgen Render | Premium AI Merch & Asset Creative Studio",
  description: "Next-gen AI generation pipeline optimized for merchandise rendering and gaming asset generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-bg-deep text-[#e8edf5]">
        {children}
      </body>
    </html>
  );
}
