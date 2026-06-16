path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('setShowMockup', 'setActiveMockup')
content = content.replace('showMockup', 'activeMockup')
content = content.replace('setActiveMockup(activeMockup === "tshirt" ? null : "tshirt")', 'setActiveMockup(!activeMockup)')
content = content.replace("setActiveMockup(activeMockup === 'tshirt' ? null : 'tshirt')", 'setActiveMockup(!activeMockup)')
content = content.replace('setActiveMockup(true)', 'setActiveMockup(true)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed showMockup errors')
