import re

path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/app/api/generate/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    route = f.read()

# Remove the replicate map and cost logic
route = re.sub(r'// .?.? Replicate model mapping.*?function createComfyWorkflow', 'function createComfyWorkflow', route, flags=re.DOTALL)

# Replace the Cloud Mode: Replicate logic with Pollinations
pollinations_logic = '''      // Cloud Mode: Pollinations AI (100% Free, no API Key needed)
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
      });'''

route = re.sub(r'// Cloud Mode: Replicate.*?\n    \} catch \(e: any\) \{', pollinations_logic + '\n    } catch (e: any) {', route, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(route)
print('Updated generate route')
