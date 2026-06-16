import re

# 1. Update CanvasView.tsx
path_canvas = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/CanvasView.tsx'
with open(path_canvas, 'r', encoding='utf-8') as f:
    canvas = f.read()

props_block = '''interface CanvasViewProps {
  history: GalleryImage[];
  spriteFrames: GalleryImage[];
  setSpriteFrames: React.Dispatch<React.SetStateAction<GalleryImage[]>>;
}

export default function CanvasView({ history, spriteFrames, setSpriteFrames }: CanvasViewProps) {'''
canvas = re.sub(r'interface CanvasViewProps \{[^}]+\}\n\nexport default function CanvasView\(\{ history \}: CanvasViewProps\) \{', props_block, canvas)

canvas = canvas.replace('  const [spriteFrames, setSpriteFrames] = useState<GalleryImage[]>([]);', '')

with open(path_canvas, 'w', encoding='utf-8') as f:
    f.write(canvas)


# 2. Update StudioLayout.tsx
path_layout = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/StudioLayout.tsx'
with open(path_layout, 'r', encoding='utf-8') as f:
    layout = f.read()

state_block = '''  const [selectedModalImage, setSelectedModalImage] = useState<GalleryImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [spriteFrames, setSpriteFrames] = useState<GalleryImage[]>([]);'''
layout = layout.replace('  const [selectedModalImage, setSelectedModalImage] = useState<GalleryImage | null>(null);\n  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);', state_block, 1)

layout = layout.replace('<CanvasView history={history} />', '<CanvasView history={history} spriteFrames={spriteFrames} setSpriteFrames={setSpriteFrames} />')

handle_func = '''  const handleLoadParamsIntoGenerator = (img: GalleryImage) => {
    setGeneratorPrefill(img);
    setActiveTab("generator");
    setSelectedModalImage(null);
  };

  const handleSendToSpriteSheet = (img: GalleryImage) => {
    if (img.spriteGroupId) {
      // Send entire batch
      const group = history.filter((h) => h.spriteGroupId === img.spriteGroupId);
      setSpriteFrames((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newGroup = group.filter(g => !existingIds.has(g.id));
        return [...prev, ...newGroup];
      });
    } else {
      setSpriteFrames((prev) => prev.some((p) => p.id === img.id) ? prev : [...prev, img]);
    }
    setActiveTab("canvas");
    setSelectedModalImage(null);
  };'''
layout = layout.replace('''  const handleLoadParamsIntoGenerator = (img: GalleryImage) => {
    setGeneratorPrefill(img);
    setActiveTab("generator");
    setSelectedModalImage(null);
  };''', handle_func, 1)

modal_buttons = '''                  <button 
                    onClick={() => handleLoadParamsIntoGenerator(selectedModalImage)}
                    className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-semibold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" /> Load Settings
                  </button>
                  {selectedModalImage.assetType === "sprite" && (
                    <button 
                      onClick={() => handleSendToSpriteSheet(selectedModalImage)}
                      className="flex-1 py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 font-semibold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-4 h-4" /> Send to Sprite Sheet
                    </button>
                  )}'''

layout = layout.replace('''                  <button 
                    onClick={() => handleLoadParamsIntoGenerator(selectedModalImage)}
                    className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 font-semibold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" /> Load Settings
                  </button>''', modal_buttons, 1)

with open(path_layout, 'w', encoding='utf-8') as f:
    f.write(layout)

print('Linked CanvasView frames to StudioLayout and added direct inject button')
