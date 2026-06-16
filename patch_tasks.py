path = 'C:/Users/Vinod/.gemini/antigravity/brain/c43ae52f-5008-462e-a089-700f631fde59/task.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('- [ ] Add `Asset Type` dropdown', '- [x] Add `Asset Type` dropdown')
content = content.replace('- [ ] Implement "Generate 4 Views"', '- [x] Implement "Generate 4 Views"')
content = content.replace('- [ ] Add "Style Preset" save/load logic', '- [x] Add "Style Preset" save/load logic')
content = content.replace('- [ ] Add "Add to Sprite Sheet"', '- [x] Add "Add to Sprite Sheet"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated tasks")
