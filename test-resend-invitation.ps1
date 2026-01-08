$loginBody = @{
    email = 'admin@mentalspaceehr.com'
    password = 'Admin123!'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'https://api.mentalspaceehr.com/api/v1/auth/login' -Method POST -Body $loginBody -ContentType 'application/json' -TimeoutSec 15
    $loginData = $response.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "Login successful, token received"

    # Now test resend invitation
    $clientId = "a5d00de6-0e99-40db-b8b6-9005785311fb"
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    Write-Host "Testing resend invitation for client $clientId..."
    $resendResponse = Invoke-WebRequest -Uri "https://api.mentalspaceehr.com/api/v1/client-portal/clients/$clientId/resend-invitation" -Method POST -Headers $headers -TimeoutSec 30
    Write-Host "Status: $($resendResponse.StatusCode)"
    Write-Host "Response: $($resendResponse.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
