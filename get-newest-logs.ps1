# Get the most recent 100 events from the new container
$result = aws logs get-log-events --log-group-name '/ecs/mentalspace-backend-prod' --log-stream-name 'ecs/mentalspace-backend/4a881c8d2afa4d3f93f910dab50ded7f' --limit 200 --output text 2>&1
$result | Out-File -FilePath 'C:\Users\Jarvis 2.0\mentalspace-ehr-v2\newest-logs.txt' -Encoding ASCII
Write-Host "Done - check newest-logs.txt"
