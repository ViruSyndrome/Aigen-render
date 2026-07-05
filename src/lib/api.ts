export interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  cfg: number;
  steps: number;
  width: number;
  height: number;
  modelName: string;
  loraName?: string;
  loraStrength?: number;
  useRedbubble?: boolean;
  upscalerName?: string;
  upscaleScaleFactor?: number;
  useTransparent?: boolean;
  uploadedImageName?: string;
  denoiseStrength?: number;
  bgThreshold?: number;
  bgMethod?: 'inspyrenet' | 'clipseg' | 'colormask';
  bgColorR?: number;
  bgColorG?: number;
  bgColorB?: number;
  bgColorTolerance?: number;
  clipsegText?: string;
  clipsegThreshold?: number;
  clipsegBlurSigma?: number;
  samplerName?: string;
  schedulerName?: string;
  seed?: number;
}

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upload Failed: ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data.filename;
};

export const submitGeneration = async (params: GenerationParams): Promise<{ id: string; status: string }> => {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Generation failed with status ${response.status}`);
  }

  return response.json(); // returns { id, status }
};

export const checkHistory = async (id: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/status?id=${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Generation ${data.status}`);
    }
    
    if (data.status === 'completed') {
      return data.url;
    }
    return null;
  } catch (err: any) {
    if (err.message === 'Generation failed' || err.message === 'Generation canceled') {
      throw err;
    }
    return null;
  }
};

export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) return false;
    const data = await response.json();
    return data.online;
  } catch {
    return false;
  }
};

export const interruptGeneration = async (): Promise<void> => {
  try {
    await fetch("/api/interrupt", { method: "POST" });
  } catch (e) {
    console.error("Failed to interrupt generation:", e);
  }
};
