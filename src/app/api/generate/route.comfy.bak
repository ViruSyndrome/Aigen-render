import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ── Server-side quota (cloud mode only — local ComfyUI has no cost) ──────────
const DAILY_LIMIT = parseInt(process.env.DAILY_CREDIT_LIMIT ?? "50");
const QUOTA_FILE = join(tmpdir(), "aigen_quota.json");

function getQuota(): { date: string; count: number } {
  try {
    if (!existsSync(QUOTA_FILE)) return { date: new Date().toDateString(), count: 0 };
    const data = JSON.parse(readFileSync(QUOTA_FILE, "utf8"));
    if (data.date !== new Date().toDateString()) return { date: new Date().toDateString(), count: 0 };
    return data;
  } catch {
    return { date: new Date().toDateString(), count: 0 };
  }
}

function incrementQuota(by = 1): void {
  const quota = getQuota();
  writeFileSync(QUOTA_FILE, JSON.stringify({ date: quota.date, count: quota.count + by }));
}

function createComfyWorkflow(params: any, seed: number) {
  const {
    prompt, negativePrompt, cfg, steps, width, height,
    modelName, loraName, loraStrength,
    useRedbubble, upscalerName, upscaleScaleFactor,
    useTransparent, uploadedImageName, denoiseStrength,
    bgThreshold, bgMethod, bgColorR, bgColorG, bgColorB, bgColorTolerance,
    clipsegText, clipsegThreshold, clipsegBlurSigma,
    samplerName, schedulerName,
    rembgNode
  } = params;

  const isFlux = modelName.toLowerCase().includes('flux');
  
  const workflow: any = {
    "1": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": { "ckpt_name": modelName }
    },
    "6": {
      "class_type": "EmptyLatentImage",
      "inputs": { "width": width, "height": height, "batch_size": 1 }
    }
  };

  let modelRef = ["1", 0];
  let clipRef = ["1", 1];
  let vaeRef = ["1", 2];

  if (isFlux) {
    workflow["2"] = {
      "class_type": "DualCLIPLoader",
      "inputs": {
        "clip_name1": "clip_l.safetensors",
        "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
        "type": "flux"
      }
    };
    workflow["3"] = {
      "class_type": "VAELoader",
      "inputs": { "vae_name": "ae.safetensors" }
    };
    clipRef = ["2", 0];
    vaeRef = ["3", 0];
  }

  if (loraName && loraName !== "none") {
    workflow["10"] = {
      "class_type": "LoraLoader",
      "inputs": {
        "lora_name": loraName,
        "strength_model": loraStrength,
        "strength_clip": loraStrength,
        "model": modelRef,
        "clip": clipRef
      }
    };
    modelRef = ["10", 0];
    clipRef = ["10", 1];
  }

  workflow["4"] = {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": prompt, "clip": clipRef }
  };
  
  workflow["5"] = {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": negativePrompt, "clip": clipRef }
  };

  workflow["7"] = {
    "class_type": "KSampler",
    "inputs": {
      "seed": seed,
      "steps": steps,
      "cfg": cfg,
      "sampler_name": samplerName || "euler",
      "scheduler": schedulerName || "simple",
      "denoise": uploadedImageName ? denoiseStrength : 1.0,
      "model": modelRef,
      "positive": ["4", 0],
      "negative": ["5", 0],
      "latent_image": ["6", 0]
    }
  };

  let finalImageRef: any = null;

  if (uploadedImageName && denoiseStrength === 0) {
    // PURE UTILITY MODE: Bypass Generation entirely
    workflow["20"] = {
      "class_type": "LoadImage",
      "inputs": { "image": uploadedImageName }
    };
    finalImageRef = ["20", 0];
    
    delete workflow["1"];
    delete workflow["4"];
    delete workflow["5"];
    delete workflow["6"];
    delete workflow["7"];
    if (workflow["10"]) delete workflow["10"];
    if (isFlux) { delete workflow["2"]; delete workflow["3"]; }
    
  } else {
    // GENERATION OR IMG2IMG MODE
    if (uploadedImageName) {
      workflow["20"] = {
        "class_type": "LoadImage",
        "inputs": { "image": uploadedImageName }
      };
      workflow["21"] = {
        "class_type": "VAEEncode",
        "inputs": { "pixels": ["20", 0], "vae": vaeRef }
      };
      workflow["7"].inputs["latent_image"] = ["21", 0];
      delete workflow["6"];
    }

    workflow["8"] = {
      "class_type": "VAEDecode",
      "inputs": { "samples": ["7", 0], "vae": vaeRef }
    };
    finalImageRef = ["8", 0];
  }

  const scaleFactor = upscaleScaleFactor || 4.0;

  if (useRedbubble && upscalerName && upscalerName !== "none") {
    workflow["11"] = {
      "class_type": "UpscaleModelLoader",
      "inputs": { "model_name": upscalerName }
    };
    workflow["12"] = {
      "class_type": "ImageUpscaleWithModel",
      "inputs": {
        "upscale_model": ["11", 0],
        "image": finalImageRef
      }
    };
    finalImageRef = ["12", 0];

    // Restore alpha after upscaling when in pure utility mode without BG removal
    if (uploadedImageName && denoiseStrength === 0 && !useTransparent) {
      workflow["30"] = { "class_type": "MaskToImage", "inputs": { "mask": ["20", 1] } };
      workflow["31"] = { "class_type": "ImageScaleBy", "inputs": { "image": ["30", 0], "upscale_method": "bilinear", "scale_by": scaleFactor } };
      workflow["32"] = { "class_type": "ImageToMask", "inputs": { "image": ["31", 0], "channel": "red" } };
      workflow["33"] = { "class_type": "JoinImageWithAlpha", "inputs": { "image": finalImageRef, "alpha": ["32", 0] } };
      finalImageRef = ["33", 0];
    }
  }

  // Transparent Background Logic
  if (useTransparent) {
    if (bgMethod === 'clipseg') {
      workflow["45"] = {
        "class_type": "BatchCLIPSeg",
        "inputs": {
          "images": finalImageRef,
          "text": clipsegText || "background",
          "threshold": clipsegThreshold ?? 0.4,
          "binary_mask": true,
          "combine_mask": false,
          "use_cuda": true,
          "blur_sigma": clipsegBlurSigma ?? 0,
          "invert": false
        }
      };
      workflow["46"] = { "class_type": "InvertMask", "inputs": { "mask": ["45", 0] } };
      workflow["48"] = { "class_type": "GrowMask", "inputs": { "mask": ["46", 0], "expand": -1, "tapered_corners": true } };
      workflow["47"] = { "class_type": "JoinImageWithAlpha", "inputs": { "image": finalImageRef, "alpha": ["48", 0] } };
      finalImageRef = ["47", 0];
    } else if (bgMethod === 'colormask') {
      workflow["50"] = {
        "class_type": "ColorToMask",
        "inputs": {
          "images": finalImageRef,
          "invert": true,
          "red": bgColorR,
          "green": bgColorG,
          "blue": bgColorB,
          "threshold": bgColorTolerance,
          "per_batch": 16
        }
      };
      workflow["51"] = { "class_type": "JoinImageWithAlpha", "inputs": { "image": finalImageRef, "alpha": ["50", 0] } };
      finalImageRef = ["51", 0];
    } else {
      const nodeInputs: any = { "image": finalImageRef, "torchscript_jit": "default" };
      if (rembgNode === 'InspyrenetRembgAdvanced') {
        nodeInputs["threshold"] = bgThreshold ?? 0.35;
      }

      // Node 16: Run background removal — output[1] is the RAW mask
      workflow["16"] = { "class_type": rembgNode, "inputs": nodeInputs };
      
      // Node 16i: Invert the mask so SUBJECT=white (opaque) and BACKGROUND=black (transparent)
      workflow["16i"] = { "class_type": "InvertMask", "inputs": { "mask": ["16", 1] } };

      // Node 17: Optionally trim fringe pixels at edges
      const edgeTrim = -Math.max(0, Math.round((bgThreshold ?? 0.35) * 3));
      workflow["17"] = {
        "class_type": "GrowMask",
        "inputs": {
          "mask": ["16i", 0],
          "expand": edgeTrim,
          "tapered_corners": true
        }
      };
      // Node 18: Combine original image with corrected alpha mask
      workflow["18"] = {
        "class_type": "JoinImageWithAlpha",
        "inputs": {
          "image": finalImageRef,
          "alpha": ["17", 0]
        }
      };
      finalImageRef = ["18", 0];
    }
  }

  workflow["9"] = {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "VIRUSYNDROME",
      "images": finalImageRef
    }
  };

  return workflow;
}

export async function POST(req: NextRequest) {
  try {
    const params = await req.json();
    const mode = process.env.BACKEND_MODE || "local";

    if (mode === "local") {
      // --- SANA BRANCH: Direct FastAPI microservice on port 8189 ---
      if (params.modelName?.toLowerCase().includes("sana")) {
        const sanaUrl = process.env.SANA_API_URL || "http://127.0.0.1:8189";
        try {
          const sanaResp = await fetch(`${sanaUrl}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: params.prompt,
              negativePrompt: params.negativePrompt || "",
              steps: params.steps ?? 20,
              cfg: params.cfg ?? 4.5,
              width: params.width ?? 1024,
              height: params.height ?? 1024,
            }),
            signal: AbortSignal.timeout(120000), // 2 min timeout for Sana
          });
          if (!sanaResp.ok) {
            const errText = await sanaResp.text();
            return NextResponse.json({ error: `Sana Error: ${errText}` }, { status: 500 });
          }
          const sanaData = await sanaResp.json();
          // Return special promptId so the frontend can display immediately
          return NextResponse.json({ promptId: `sana_immediate:${sanaData.image}`, clientId: "sana" });
        } catch (e: any) {
          return NextResponse.json(
            { error: `Sana server unreachable. Is it running? (launch_sana.ps1)\n${e.message}` },
            { status: 503 }
          );
        }
      }

      // --- COMFYUI BRANCH ---
      const comfyUrl = process.env.COMFYUI_API_URL || "http://127.0.0.1:8188";
      const clientId = crypto.randomUUID();
      const seed = params.seed ?? Math.floor(Math.random() * 4294967295);

      const workflow = createComfyWorkflow(params, seed);

      const response = await fetch(`${comfyUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow, client_id: clientId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ error: `ComfyUI Error: ${errText}` }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json({ promptId: data.prompt_id, clientId });
    } else {
      // Cloud Mode: Pollinations AI (100% Free, no API Key needed)
      // We encode the prompt and pass all generation params as query strings
      const seed = params.seed ?? Math.floor(Math.random() * 4294967295);
      const width = params.width || 1024;
      const height = params.height || 1024;
      const model = params.modelName?.toLowerCase().includes('anime') ? 'anime' : 'flux';
      
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(params.prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;

      return NextResponse.json({
        promptId: `poll_${encodeURIComponent(imageUrl)}`,
        clientId: "pollinations",
        estimatedCostCents: 0,
        creditsUsed: 0,
        creditsRemaining: "Unlimited",
      });
    }
  } catch (e: any) {
    console.error("Generate API Route Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
