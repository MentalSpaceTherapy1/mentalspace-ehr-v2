$logs = aws logs filter-log-events --log-group-name '/ecs/mentalspace-backend-prod' --log-stream-names 'ecs/mentalspace-backend/4a881c8d2afa4d3f93f910dab50ded7f' --filter-pattern 'CLIENT' --limit 50 --output json 2>&1 | Out-String
$json = $logs | ConvertFrom-Json
$json.events | ForEach-Object { $_.message -replace '[^\x00-\x7F]', '?' }
