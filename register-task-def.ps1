$taskDef = aws ecs describe-task-definition --task-definition mentalspace-backend-prod --query 'taskDefinition' --output json --region us-east-1 | ConvertFrom-Json
$taskDef.containerDefinitions[0].image = '706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:ai-debug-v1'
$taskDef.PSObject.Properties.Remove('taskDefinitionArn')
$taskDef.PSObject.Properties.Remove('revision')
$taskDef.PSObject.Properties.Remove('status')
$taskDef.PSObject.Properties.Remove('requiresAttributes')
$taskDef.PSObject.Properties.Remove('compatibilities')
$taskDef.PSObject.Properties.Remove('registeredAt')
$taskDef.PSObject.Properties.Remove('registeredBy')
$jsonContent = $taskDef | ConvertTo-Json -Depth 20 -Compress
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('C:\temp\task-def-v3.json', $jsonContent, $utf8NoBom)
Write-Host "JSON file created at C:\temp\task-def-v3.json"

# Register the task definition
$result = aws ecs register-task-definition --cli-input-json file://C:/temp/task-def-v3.json --query 'taskDefinition.taskDefinitionArn' --output text --region us-east-1
Write-Host "New task definition ARN: $result"
