import { NextResponse } from "next/server";

export async function POST() {
  const mode = process.env.BACKEND_MODE || "local";
  const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

  if (mode === "local") {
    try {
      await fetch(`${comfyUrl}/interrupt`, { method: "POST" });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: "No interrupt support needed in cloud mode" });
}
