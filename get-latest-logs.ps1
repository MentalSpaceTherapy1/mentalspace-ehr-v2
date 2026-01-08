# Get the latest logs (most recent at the end)
$startTime = [long]([DateTimeOffset]::UtcNow.AddMinutes(-30).ToUnixTimeMilliseconds())
$result = aws logs filter-log-events --log-group-name '/ecs/mentalspace-backend-prod' --start-time $startTime --limit 200 --output text 2>&1
$result | Out-File -FilePath 'C:\Users\Jarvis 2.0\mentalspace-ehr-v2\latest-logs.txt' -Encoding ASCII
Write-Host "Logs saved to latest-logs.txt"
