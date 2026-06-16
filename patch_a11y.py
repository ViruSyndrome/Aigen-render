import re

files = {
    'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/BgRemoverView.tsx': [
        (139, '<select', '<select title="Removal Method"'),
        (158, '<input', '<input title="Edge Trim Threshold"'),
        (189, '<input', '<input title="Sensitivity"'),
        (242, '<input', '<input title="Colour Tolerance"'),
        (291, '<input', '<input title="Upload Image"')
    ],
    'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/CanvasView.tsx': [
        (246, '<input', '<input title="Upload Image"'),
        (263, '<input', '<input title="Input Value"'),
        (297, '<select', '<select title="Blend Mode"'),
        (370, '<button', '<button title="Action"')
    ],
    'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/components/GeneratorView.tsx': [
        (592, '<select', '<select title="Select Model"'),
        (630, '<input', '<input title="Prompt Input"'),
        (645, '<input', '<input title="Negative Prompt Input"'),
        (672, '<input', '<input title="Width"'),
        (676, '<input', '<input title="Height"'),
        (704, '<select', '<select title="LoRA"'),
        (711, '<input', '<input title="LoRA Strength"'),
        (753, '<select', '<select title="Upscale Model"'),
        (764, '<select', '<select title="Background Removal Node"')
    ]
}

for path, changes in files.items():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for ln, target, replacement in changes:
            idx = ln - 1
            if idx < len(lines):
                lines[idx] = lines[idx].replace(target, replacement, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f'Patched {path}')
    except Exception as e:
        print(f'Failed on {path}: {e}')
