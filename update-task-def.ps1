$taskDef = aws ecs describe-task-definition --task-definition mentalspace-backend-prod --query 'taskDefinition' --output json --region us-east-1 | ConvertFrom-Json
$taskDef.containerDefinitions[0].image = '706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:ai-fix-v1'

# Update GIT_SHA
$gitShaEnv = $taskDef.containerDefinitions[0].environment | Where-Object { $_.name -eq 'GIT_SHA' }
if ($gitShaEnv) { $gitShaEnv.value = 'login-fix-' + (Get-Date -Format 'yyyyMMddHHmmss') }

# Update BUILD_TIME
$buildTimeEnv = $taskDef.containerDefinitions[0].environment | Where-Object { $_.name -eq 'BUILD_TIME' }
if ($buildTimeEnv) { $buildTimeEnv.value = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ') }

# Remove fields that can't be in the new task def
$taskDef.PSObject.Properties.Remove('taskDefinitionArn')
$taskDef.PSObject.Properties.Remove('revision')
$taskDef.PSObject.Properties.Remove('status')
$taskDef.PSObject.Properties.Remove('requiresAttributes')
$taskDef.PSObject.Properties.Remove('compatibilities')
$taskDef.PSObject.Properties.Remove('registeredAt')
$taskDef.PSObject.Properties.Remove('registeredBy')

$taskDefJson = $taskDef | ConvertTo-Json -Depth 10
$taskDefJson | Out-File -FilePath 'C:\temp\new-task-def.json' -Encoding utf8 -NoNewline

Write-Host "Task definition saved to C:\temp\new-task-def.json"

# Register the new task definition
$result = aws ecs register-task-definition --cli-input-json file://C:/temp/new-task-def.json --query 'taskDefinition.taskDefinitionArn' --output text --region us-east-1
Write-Host "New task definition ARN: $result"
echo $result
