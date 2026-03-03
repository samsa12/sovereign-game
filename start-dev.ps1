# ═══════════════════════════════════════════════════════════════
# SOVEREIGN — Development Startup Script
# Starts Node server and ngrok tunnel
# ═══════════════════════════════════════════════════════════════

$PORT = 3000
$NGROK_CHECK = Get-Command ngrok -ErrorAction SilentlyContinue

Write-Host "`n🚀 Starting SOVEREIGN Development Environment..." -ForegroundColor Cyan

# Start Node Server in a new window
Write-Host "📦 Starting Node.js server on port $PORT..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

# Wait a moment for server to initialize
Start-Sleep -Seconds 2

if ($NGROK_CHECK) {
    Write-Host "🌐 ngrok detected! Starting HTTP tunnel..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http $PORT"
    
    Write-Host "`n✅ Done! Your server is running at:" -ForegroundColor Green
    Write-Host "🔗 Local:  http://localhost:$PORT" -ForegroundColor Cyan
    Write-Host "🔗 Tunnel: Check the ngrok terminal window for your public URL" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  ngrok not found in PATH." -ForegroundColor Red
    Write-Host "💡 To enable external access, install ngrok or add it to your PATH." -ForegroundColor White
    Write-Host "🔗 Local: http://localhost:$PORT" -ForegroundColor Cyan
}

Write-Host "`n✨ Happy coding!`n" -ForegroundColor Magenta
