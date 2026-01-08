$response = Invoke-WebRequest -Uri 'https://api.mentalspaceehr.com/api/v1/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"ejoseph@chctherapy.com","password":"Bing@@0912"}' -SessionVariable session
Write-Output "Login successful. Testing billing endpoint..."
try {
    $billingResponse = Invoke-WebRequest -Uri 'https://api.mentalspaceehr.com/api/v1/billing/charges' -Method GET -WebSession $session
    Write-Output "Status: $($billingResponse.StatusCode)"
    Write-Output $billingResponse.Content
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    Write-Output "Status: $($_.Exception.Response.StatusCode.Value__)"
}
