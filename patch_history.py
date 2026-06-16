import re

path = 'C:/Users/Vinod/Desktop/Website ideas/aigen-render/src/app/api/history/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    route = f.read()

# Replace the Replicate prediction polling block
poll_logic = '''    // ── Pollinations AI generation ───────────────────────────────────────
    if (promptId.startsWith("poll_")) {
      const url = decodeURIComponent(promptId.slice(5));
      return NextResponse.json({ status: "COMPLETED", imageUrl: url });
    }'''

route = re.sub(r'// ── Replicate prediction polling ───────────────────────────────────────.*?return NextResponse\.json\(\{ status: "PROCESSING" \}\);\n    \}', poll_logic, route, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(route)
print('Updated history route')
