import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    const subfolder = searchParams.get("subfolder") || "";
    const type = searchParams.get("type") || "output";

    if (!filename) {
      return NextResponse.json({ error: "Missing filename parameter" }, { status: 400 });
    }

    const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";
    const targetUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch image from backend" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const bytes = await response.arrayBuffer();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    console.error("View proxy route error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
