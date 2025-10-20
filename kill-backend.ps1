# Kill all Node.js processes running on port 3001
Write-Host "Finding processes on port 3001..."
$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($processId in $processes) {
        Write-Host "Killing process $processId on port 3001..."
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "All processes on port 3001 killed."
} else {
    Write-Host "No processes found on port 3001."
}

Write-Host "`nPort 3001 is now free. You can start the backend with: cd packages/backend && npm run dev"
