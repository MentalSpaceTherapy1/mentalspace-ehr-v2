# Get logs from new container
$result = aws logs get-log-events --log-group-name '/ecs/mentalspace-backend-prod' --log-stream-name 'ecs/mentalspace-backend/0a6646b70b6c43aeada4ee0135f95910' --limit 30 --query 'events[*].message' --output text 2>&1
$result | Out-File -FilePath 'C:\Users\Jarvis 2.0\mentalspace-ehr-v2\new-container-logs.txt' -Encoding ASCII
Write-Host "Done"
