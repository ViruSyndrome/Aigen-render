import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");

    if (!promptId) {
      return NextResponse.json({ error: "Missing promptId parameter" }, { status: 400 });
    }

    const mode = process.env.BACKEND_MODE || "local";
    const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";

    if (promptId.startsWith("mock_")) {
      // Return a simulated completed image after 5 seconds
      const elapsed = Date.now() - Number(promptId.split("_")[1]);
      if (elapsed < 4000) {
        return NextResponse.json({ status: "PROCESSING" });
      }
      // Return a beautiful abstract mock generation
      return NextResponse.json({
        status: "COMPLETED",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1024&auto=format&fit=crop"
      });
    }

        // ── Pollinations AI generation ───────────────────────────────────────
    if (promptId.startsWith("poll_")) {
      const url = decodeURIComponent(promptId.slice(5));
      return NextResponse.json({ status: "COMPLETED", imageUrl: url });
    }

    if (mode === "local") {
      const response = await fetch(`${comfyUrl}/history/${promptId}`);
      if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch history from ComfyUI" }, { status: 500 });
      }

      const data = await response.json();
      if (data[promptId]) {
        const outputs = data[promptId].outputs;
        for (const nodeId in outputs) {
          if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
            const img = outputs[nodeId].images[0];
            // Point to our local Next.js proxy route for viewing images
            const imageUrl = `/api/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
            return NextResponse.json({ status: "COMPLETED", imageUrl });
          }
        }
        return NextResponse.json({ error: "History found but no output images detected" }, { status: 500 });
      }

      return NextResponse.json({ status: "PROCESSING" });
    } else {
      // Cloud mode — all recognized cloud prompts (repl_*) are handled above
      return NextResponse.json({ status: "PROCESSING" });
    }
  } catch (e: any) {
    console.error("History API Route Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
