path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add lockedSeed state
state_block = '''  const [assetType, setAssetType] = useState<"sprite" | "texture" | "icon" | "background" | "ui" | null>(null);
  const [lockedSeed, setLockedSeed] = useState<number | null>(null);'''
content = content.replace('  const [assetType, setAssetType] = useState<"sprite" | "texture" | "icon" | "background" | "ui" | null>(null);', state_block, 1)

# 2. Add seed to submitGeneration
content = content.replace('useTiling', 'useTiling, seed: lockedSeed || undefined')

# 3. Add UI toggle for style locking
ui_toggle = '''
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setLockedSeed(lockedSeed ? null : Math.floor(Math.random() * 4294967295))}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-all ${
                  lockedSeed
                    ? "bg-purple-500/20 text-purple-400 border-purple-500/50"
                    : "bg-black/40 text-[#64748b] border-white/10 hover:text-white"
                }`}
                title="Locking the seed ensures visual consistency across generations">
                {lockedSeed ? "🔒 Style Locked" : "🔓 Lock Style (Seed)"}
              </button>
            </div>
'''
content = content.replace('            <button onClick={runGeneration} disabled={!prompt || !isBackendOnline}', ui_toggle + '            <button onClick={runGeneration} disabled={!prompt || !isBackendOnline}', 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Added style lock to GeneratorView')
