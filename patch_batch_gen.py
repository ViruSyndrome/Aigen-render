import re

path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

batch_func = '''  const runBatchGeneration = async () => {
    try {
      setIsGenerating(true);
      setStatusMessage("Starting batch generation (4 views)...");
      setGeneratingProgress(10);
      setShowMockup(false);

      const directions = ["front view", "back view", "left side view", "right side view"];
      const spriteGroupId = Date.now().toString();
      
      let completed = 0;
      
      for (const direction of directions) {
        setStatusMessage(`Generating ${direction}...`);
        
        const finalPrompt = `${prompt}, ${direction}`;
        const params: any = {
          prompt: finalPrompt,
          negativePrompt,
          cfg, steps, width, height,
          modelName: model,
          loraName: lora, loraStrength,
          useTransparent,
          denoiseStrength: 1.0,
          bgThreshold, bgMethod, rembgNode: "InspyrenetRembgAdvanced",
          samplerName: sampler, schedulerName: scheduler, useTiling
        };

        const result = await submitGeneration(params);
        
        // Wait for generation to complete
        if (!result.promptId.startsWith("sana_immediate:")) {
           let attempts = 0;
           let found = false;
           while (attempts < 120 && !found) {
             attempts++;
             await new Promise(r => setTimeout(r, 2000));
             const url = await checkHistory(result.promptId);
             if (url) {
               onAddHistoryImage({
                 id: Date.now().toString() + Math.random().toString(), url,
                 prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
                 modelName: model, timestamp: Date.now(),
                 stage: "generate" as const, isTransparent: useTransparent,
                 assetType: assetType || undefined,
                 spriteGroupId, tags: [direction.replace(' view', '')]
               });
               found = true;
               setCurrentResultUrl(url); // show latest
             }
           }
        } else {
           const dataUrl = result.promptId.replace("sana_immediate:", "");
           onAddHistoryImage({
             id: Date.now().toString() + Math.random().toString(), url: dataUrl,
             prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
             modelName: model, timestamp: Date.now(),
             stage: "generate" as const, isTransparent: useTransparent,
             assetType: assetType || undefined,
             spriteGroupId, tags: [direction.replace(' view', '')]
           });
           setCurrentResultUrl(dataUrl);
        }
        
        completed++;
        setGeneratingProgress(10 + (completed / 4) * 90);
      }
      
      setStatusMessage("");
      setIsGenerating(false);

    } catch (e: any) {
      console.error(e);
      if (e.message === "QUOTA_EXCEEDED") {
        setStatusMessage("Error: Daily quota exceeded.");
      } else {
        setStatusMessage(`Error: ${e.message || "Failed to generate batch"}`);
      }
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  const runGeneration = async () => {'''

content = content.replace('  const runGeneration = async () => {', batch_func, 1)

# Add the button in the UI
button_ui = '''
            {assetType === "sprite" && (
              <button onClick={runBatchGeneration} disabled={!prompt || !isBackendOnline}
                className="py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-45 disabled:cursor-not-allowed font-bold rounded-xl transition-all shadow-lg text-sm uppercase flex items-center gap-1.5 shrink-0 cursor-pointer">
                <Layers className="w-4 h-4 fill-white" /> Generate 4 Views
              </button>
            )}
            
            <button onClick={runGeneration} disabled={!prompt || !isBackendOnline}
'''

content = content.replace('            <button onClick={runGeneration} disabled={!prompt || !isBackendOnline}', button_ui, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Batch Generation")
