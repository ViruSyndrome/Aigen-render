# AIgen Render Unified Launcher

Write-Host "Starting ComfyUI Backend with CORS enabled (Port 8188)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location 'H:\ComfyUI'; python main.py --listen 127.0.0.1 --port 8188 --cuda-device 0 --preview-method auto --enable-cors-header '*' `""

Write-Host "Starting Sana 1600M Direct API Server (Port 8189)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location 'C:\Users\Vinod\Desktop\Tshirt Prints\pipeline_ui'; python -m uvicorn sana_server:app --host 127.0.0.1 --port 8189`""

Write-Host "Starting AIgen Render Next.js Frontend (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location 'C:\Users\Vinod\Desktop\Website ideas\aigen-render'; npm run dev`""

Write-Host "All services booting. Open http://localhost:3000 in your browser." -ForegroundColor Yellow
Write-Host "  - ComfyUI:  http://127.0.0.1:8188" -ForegroundColor DarkGray
Write-Host "  - Sana API: http://127.0.0.1:8189" -ForegroundColor DarkGray
Write-Host "  - AIgen UI: http://localhost:3000" -ForegroundColor DarkGray
