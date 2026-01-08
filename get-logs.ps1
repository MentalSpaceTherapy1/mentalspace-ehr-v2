$logGroup = '/ecs/mentalspace-backend-prod'

# Get start time (3 minutes ago)
$startTime = [int64]((Get-Date).AddMinutes(-3).ToUniversalTime() - (Get-Date "1970-01-01")).TotalMilliseconds
$result = aws logs filter-log-events --log-group-name $logGroup --start-time $startTime --region us-east-1
$result | Out-File -FilePath 'C:\temp\backend-logs.json' -Encoding utf8
Write-Host "Logs saved"
