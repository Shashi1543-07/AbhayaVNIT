# PowerShell script to rename the project folder and fix the build issue
# This script will:
# 1. Close VS Code if running
# 2. Rename the folder from VNIT_GIRL'S_SAFETY to VNIT_GIRLS_SAFETY
# 3. Open the project in the new location

Write-Host "=== Project Folder Rename Script ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will rename:" -ForegroundColor Yellow
Write-Host "  FROM: VNIT_GIRL'S_SAFETY" -ForegroundColor Red
Write-Host "  TO:   VNIT_GIRLS_SAFETY" -ForegroundColor Green
Write-Host ""

# Check if new folder already exists
$oldPath = "C:\Users\lenovo\VNIT_GIRL'S_SAFETY"
$newPath = "C:\Users\lenovo\VNIT_GIRLS_SAFETY"

if (Test-Path $newPath) {
    Write-Host "ERROR: Target folder already exists: $newPath" -ForegroundColor Red
    Write-Host "Please delete or rename it first, then run this script again." -ForegroundColor Yellow
    pause
    exit 1
}

# Close VS Code if running
Write-Host "Attempting to close VS Code..." -ForegroundColor Yellow
Get-Process -Name "Code" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Rename the folder
Write-Host "Renaming folder..." -ForegroundColor Yellow
try {
    Rename-Item -Path $oldPath -NewName "VNIT_GIRLS_SAFETY" -ErrorAction Stop
    Write-Host "SUCCESS: Folder renamed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New path: $newPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opening VS Code in new location..." -ForegroundColor Yellow
    
    # Open VS Code in the new folder
    code $newPath
    
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "1. Wait for VS Code to open" -ForegroundColor White
    Write-Host "2. Open a terminal in VS Code" -ForegroundColor White
    Write-Host "3. Run: npm install" -ForegroundColor White
    Write-Host "4. Run: npm run build" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "ERROR: Failed to rename folder" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please close ALL applications using this folder and try again." -ForegroundColor Yellow
    pause
    exit 1
}

pause
