# ═══════════════════════════════════════════════════════════════
# SOVEREIGN — Interactive PowerShell Dashboard
# ═══════════════════════════════════════════════════════════════

# Set Window Title
$host.ui.RawUI.WindowTitle = "SOVEREIGN | Starting..."

# Function to Disable QuickEdit (Prevents freezing when clicking)
function Disable-QuickEdit {
    $code = @"
    using System;
    using System.Runtime.InteropServices;
    public class ConsoleHelper {
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
        const int STD_INPUT_HANDLE = -10;
        const uint ENABLE_QUICK_EDIT_MODE = 0x0040;
        const uint ENABLE_EXTENDED_FLAGS = 0x0080;
        public static void DisableQuickEdit() {
            IntPtr conHandle = GetStdHandle(STD_INPUT_HANDLE);
            uint mode;
            if (GetConsoleMode(conHandle, out mode)) {
                mode &= ~ENABLE_QUICK_EDIT_MODE;
                mode |= ENABLE_EXTENDED_FLAGS;
                SetConsoleMode(conHandle, mode);
            }
        }
    }
"@
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    [ConsoleHelper]::DisableQuickEdit()
}

Disable-QuickEdit

Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   SOVEREIGN - POWER-USER DASHBOARD" -ForegroundColor White -BackgroundColor Blue
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Windows Terminal Feature: Enabled" -ForegroundColor Green
Write-Host "[*] Anti-Freeze Protection:   Active" -ForegroundColor Green
Write-Host "[*] Live Threading:           Online" -ForegroundColor Green
Write-Host ""
Write-Host "-----------------------------------------------"
Write-Host "COMMANDS: help, tick, stats, live, clear, exit" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"
Write-Host ""

# Run the Node server
# We use -PassThru to keep an eye on it if we wanted, but simple execution is fine here
node server.js

Write-Host "`n[!] Server process has exited." -ForegroundColor Red
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
