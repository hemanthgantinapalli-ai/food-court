# FoodCourt App Startup Script
# This script starts both backend and frontend servers in separate terminals

Write-Host "🚀 FoodCourt - Startup Script" -ForegroundColor Cyan
Write-Host ""

# Set MongoDB URI for this session
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/foodcourt'
$env:JWT_SECRET = 'your_jwt_secret_key_change_in_production'

# Get the project root
$projectRoot = (Get-Item $PSScriptRoot).FullName

Write-Host "📁 Project Root: $projectRoot" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backendPath = Join-Path $projectRoot "backend"
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$backendPath'; `$env:MONGODB_URI='mongodb://127.0.0.1:27017/foodcourt'; npm run dev`"" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
$frontendPath = Join-Path $projectRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$frontendPath'; npm run dev`"" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both servers starting!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "💾 MongoDB:  127.0.0.1:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Wait 5-10 seconds for servers to be fully ready..." -ForegroundColor Magenta
