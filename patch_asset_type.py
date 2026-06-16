import re

path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Asset Type State
state_block = '''  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Asset Type
  const [assetType, setAssetType] = useState<"sprite" | "texture" | "icon" | "background" | "ui" | null>(null);

  const handleAssetTypeChange = (type: "sprite" | "texture" | "icon" | "background" | "ui") => {
    setAssetType(type);
    if (type === "sprite") {
      setWidth(512); setHeight(1024); setUseTransparent(true); setUseTiling(false);
      setPrompt(prev => prev ? prev + ", isometric RPG character sprite" : "isometric RPG character sprite");
    } else if (type === "texture") {
      setWidth(512); setHeight(512); setUseTransparent(false); setUseTiling(true);
      setPrompt(prev => prev ? prev + ", seamless tileable texture" : "seamless tileable texture");
    } else if (type === "icon") {
      setWidth(256); setHeight(256); setUseTransparent(true); setUseTiling(false);
      setPrompt(prev => prev ? prev + ", flat ui icon, front facing" : "flat ui icon, front facing");
    } else if (type === "background") {
      setWidth(1024); setHeight(576); setUseTransparent(false); setUseTiling(false);
    } else if (type === "ui") {
      setWidth(512); setHeight(512); setUseTransparent(true); setUseTiling(false);
    }
  };'''

content = content.replace('  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);', state_block, 1)

# 2. Add the UI Dropdown above the Model Select
ui_dropdown = '''
            {/* Asset Type Selector */}
            {mode === "asset" && (
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                <label className="text-[10px] uppercase tracking-wider font-semibold">Asset Type</label>
                <div className="relative">
                  <select title="Asset Type"
                    value={assetType || ""}
                    onChange={(e) => handleAssetTypeChange(e.target.value as any)}
                    className="w-full h-10 bg-[#0d1117] text-white text-xs px-3 rounded-lg border border-white/10 appearance-none focus:border-accent-main/50 focus:ring-1 focus:ring-accent-main/50 transition-all outline-none"
                  >
                    <option value="" disabled>Select Asset Type...</option>
                    <option value="sprite">Character Sprite (512x1024)</option>
                    <option value="texture">Tile/Texture (512x512)</option>
                    <option value="icon">Icon/Item (256x256)</option>
                    <option value="background">Background (1024x576)</option>
                    <option value="ui">UI Element (512x512)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748b] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
'''

content = content.replace('<div className="flex flex-col gap-1.5">\n              <LabelTip label="AI Model"', ui_dropdown, 1)

# 3. Add Asset Type to the onAddHistoryImage call (for SANA immediate)
content = content.replace(
    'stage: "generate" as const, isTransparent: useTransparent,',
    'stage: "generate" as const, isTransparent: useTransparent, assetType: assetType || undefined,'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Asset Type Dropdown")
