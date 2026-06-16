import re

path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update State
state_updates = '''  // T-shirt mockup
  const [activeMockup, setActiveMockup] = useState<boolean>(false);
  const [merchType, setMerchType] = useState<"tshirt" | "hoodie" | "mug">("tshirt");
  const [merchSide, setMerchSide] = useState<"front" | "back">("front");
  const [tshirtColor, setTshirtColor] = useState<"white" | "black" | "grey">("white");'''

content = re.sub(
    r'// T-shirt mockup\n  const \[activeMockup, setActiveMockup\] = useState<"tshirt" \| null>\(null\);\n  const \[showMockup, setShowMockup\] = useState<boolean>\(false\);\n  const \[tshirtColor, setTshirtColor\] = useState<"white" \| "black" \| "grey">\("white"\);',
    state_updates,
    content
)

# 2. Update TSHIRT_MOCKUPS to MERCH_COLORS
merch_colors = '''// ─── Merch Color Config ───────────────────────────────────────────────────────
const MERCH_COLORS: Record<string, { blendMode: string; label: string; swatch: string }> = {
  white: { blendMode: "multiply",  label: "White", swatch: "#f5f5f5" },
  black: { blendMode: "screen",    label: "Black", swatch: "#1a1a1a" },
  grey:  { blendMode: "multiply",  label: "Grey",  swatch: "#888888" },
};'''

content = re.sub(
    r'// ─── T-Shirt Mockup Config[^\}]+\};\n',
    merch_colors + '\n',
    content,
    flags=re.DOTALL
)

# 3. Fix the toggle activeMockup logic
content = content.replace('activeMockup === "tshirt"', 'activeMockup')
content = content.replace('setActiveMockup(activeMockup === "tshirt" ? null : "tshirt")', 'setActiveMockup(!activeMockup)')
content = content.replace('if (activeMockup) setShowMockup(true);', '/* showMockup replaced by activeMockup */')

# 4. Update the mockup rendering UI in the bottom right corner
mockup_ui = '''
          {activeMockup && currentResultUrl && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8 pointer-events-none bg-black/60 backdrop-blur-md">
              <div className="relative max-w-2xl w-full h-full flex items-center justify-center pointer-events-auto">
                <img
                  src={`/${merchType}_${tshirtColor}${merchSide === 'back' ? '_back' : ''}.png`}
                  alt="Merch Mockup"
                  className="max-w-full max-h-full object-contain drop-shadow-2xl opacity-90 transition-all duration-300"
                  onError={(e) => {
                     (e.target as HTMLImageElement).src = "/tshirt_white.png"; // Fallback
                  }}
                />
                {/* The artwork placed onto the merch */}
                <div 
                  className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-[20%] w-[35%] h-[40%] flex justify-center mix-blend-multiply transition-all"
                  style={{ mixBlendMode: MERCH_COLORS[tshirtColor]?.blendMode as any }}
                >
                  <img
                    src={currentResultUrl}
                    alt="Artwork on Merch"
                    className="max-w-full max-h-full object-contain pointer-events-auto cursor-move drop-shadow-md"
                  />
                </div>
                
                {/* Merch Controls Floating Panel */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-xl flex items-center gap-4 pointer-events-auto shadow-2xl">
                  
                  {/* Type */}
                  <select 
                    value={merchType} onChange={(e) => setMerchType(e.target.value as any)}
                    className="bg-transparent text-xs text-white border-none outline-none font-bold cursor-pointer"
                  >
                    <option value="tshirt">T-Shirt</option>
                    <option value="hoodie">Hoodie</option>
                    <option value="mug">Coffee Mug</option>
                  </select>

                  <div className="w-px h-6 bg-white/10"></div>

                  {/* Side */}
                  <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                    <button 
                      onClick={() => setMerchSide('front')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${merchSide === 'front' ? 'bg-accent-main text-bg-deep' : 'text-[#64748b] hover:text-white'}`}
                    >Front</button>
                    <button 
                      onClick={() => setMerchSide('back')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${merchSide === 'back' ? 'bg-accent-main text-bg-deep' : 'text-[#64748b] hover:text-white'}`}
                    >Back</button>
                  </div>

                  <div className="w-px h-6 bg-white/10"></div>

                  {/* Colors */}
                  <div className="flex gap-2">
                    {(Object.entries(MERCH_COLORS) as [string, typeof MERCH_COLORS[string]][]).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setTshirtColor(key as any)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${tshirtColor === key ? 'border-accent-main scale-110 shadow-lg' : 'border-white/20 hover:scale-105'}`}
                        style={{ backgroundColor: val.swatch }}
                        title={val.label}
                      />
                    ))}
                  </div>

                  <div className="w-px h-6 bg-white/10"></div>

                  <button 
                    onClick={() => setActiveMockup(false)}
                    className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors"
                    title="Close Mockup"
                  >
                    <Square className="w-4 h-4" />
                  </button>

                </div>
              </div>
            </div>
          )}
'''

# The previous mockup UI was inside {showMockup && currentResultUrl && (...)}
content = re.sub(r'\{\s*showMockup && currentResultUrl && \([\s\S]*?\}\s*\)\s*\}', mockup_ui, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Merch Mockup Logic")
