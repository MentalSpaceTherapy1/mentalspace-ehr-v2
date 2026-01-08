[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$result = aws logs get-log-events --log-group-name '/ecs/mentalspace-backend-prod' --log-stream-name 'ecs/mentalspace-backend/4a881c8d2afa4d3f93f910dab50ded7f' --limit 100 --output text 2>&1
$result | Select-String -Pattern "CLIENT|Creating client|error" -CaseSensitive:$false | ForEach-Object { $_.Line }
