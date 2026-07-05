import { NextResponse } from "next/server";

export async function GET() {
  const mode = process.env.BACKEND_MODE || "local";
  const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

  if (mode === "local") {
    try {
      const response = await fetch(`${comfyUrl}/system_stats`, { signal: AbortSignal.timeout(3000) });
      return NextResponse.json({ online: response.ok, mode });
    } catch {
      return NextResponse.json({ online: false, mode });
    }
  }

  // Cloud APIs are serverless, so they are always considered online
  return NextResponse.json({ online: true, mode });
}
