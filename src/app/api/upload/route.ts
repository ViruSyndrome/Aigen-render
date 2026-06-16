import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mode = process.env.BACKEND_MODE || "local";
    const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (mode === "local") {
      // Forward to ComfyUI
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
      const uniqueName = `upload_${Date.now()}.${ext}`;

      const comfyFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type });
      comfyFormData.append("image", blob, uniqueName);

      const comfyResponse = await fetch(`${comfyUrl}/upload/image`, {
        method: "POST",
        body: comfyFormData,
      });

      if (!comfyResponse.ok) {
        throw new Error("ComfyUI upload failed");
      }

      const comfyData = await comfyResponse.json();
      return NextResponse.json({ filename: comfyData.name });
    } else {
      // In cloud mode, we can return a data URI representation or save it locally.
      // For simplicity, let's return a data URI so the cloud APIs can consume it.
      const base64 = buffer.toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ filename: dataUri });
    }
  } catch (e: any) {
    console.error("Upload route error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
