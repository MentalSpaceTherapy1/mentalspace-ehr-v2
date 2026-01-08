$logs = aws logs get-log-events --log-group-name '/ecs/mentalspace-backend-prod' --log-stream-name 'ecs/mentalspace-backend/4a881c8d2afa4d3f93f910dab50ded7f' --limit 100 --output json 2>&1 | Out-String
$json = $logs | ConvertFrom-Json
$json.events | Where-Object { $_.message -match 'CLIENT|error|Error|clients' } | ForEach-Object { $_.message -replace '[^\x00-\x7F]', '?' }
