# Force clean node_modules with robocopy trick
# This works even when files are locked

Write-Host "Force cleaning node_modules..." -ForegroundColor Yellow

# Stop any Node processes
Get-Process | Where-Object {$_.ProcessName -match "node|npm|electron"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Create empty temp folder
$emptyFolder = ".\temp_empty_folder"
if (Test-Path $emptyFolder) {
    Remove-Item $emptyFolder -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $emptyFolder -Force | Out-Null

# Use robocopy to mirror empty folder to node_modules (deletes everything)
if (Test-Path "node_modules") {
    Write-Host "Using robocopy to force delete node_modules..." -ForegroundColor Cyan
    robocopy $emptyFolder node_modules /MIR /R:0 /W:0 /NFL /NDL /NJH /NJS /NC /NS | Out-Null
    
    # Now remove the empty node_modules folder
    Remove-Item "node_modules" -Force -ErrorAction SilentlyContinue
    Write-Host "node_modules deleted successfully" -ForegroundColor Green
} else {
    Write-Host "node_modules does not exist" -ForegroundColor Green
}

# Clean up temp folder
Remove-Item $emptyFolder -Force -ErrorAction SilentlyContinue

# Remove package-lock
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "package-lock.json deleted" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleaning complete! Now run: npm install" -ForegroundColor Green
