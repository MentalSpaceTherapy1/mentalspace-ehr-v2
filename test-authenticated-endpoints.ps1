# MentalSpace EHR v2 Production API Testing - Authenticated Endpoints
# Using credentials: ejoseph@chctherapy.com

$baseUrl = "https://api.mentalspaceehr.com/api/v1"
$results = @()
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description,
        [int]$ExpectedStatus = 200
    )
    
    $url = "$baseUrl$Endpoint"
    $startTime = Get-Date
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            WebSession = $session
            ContentType = "application/json"
            Headers = $Headers
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $result = [PSCustomObject]@{
            Test = $Description
            Endpoint = $Endpoint
            Method = $Method
            Status = $response.StatusCode
            ExpectedStatus = $ExpectedStatus
            Pass = $response.StatusCode -eq $ExpectedStatus
            Duration = [math]::Round($duration, 2)
            ResponseSize = $response.Content.Length
            Error = $null
        }
        
        Write-Host "✅ PASS: $Description - Status: $($response.StatusCode) - Time: ${duration}ms" -ForegroundColor Green
        return $result
    }
    catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        $result = [PSCustomObject]@{
            Test = $Description
            Endpoint = $Endpoint
            Method = $Method
            Status = $statusCode
            ExpectedStatus = $ExpectedStatus
            Pass = $statusCode -eq $ExpectedStatus
            Duration = [math]::Round($duration, 2)
            ResponseSize = 0
            Error = $_.Exception.Message
        }
        
        $color = if ($statusCode -eq $ExpectedStatus) { "Yellow" } else { "Red" }
        Write-Host "❌ FAIL: $Description - Status: $statusCode - Expected: $ExpectedStatus - Time: ${duration}ms" -ForegroundColor $color
        
        return $result
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MentalSpace EHR v2 - Authenticated Testing" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Login
Write-Host "[1] Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "ejoseph@chctherapy.com"
    password = "Bing@@0912"
}
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json" -WebSession $session
    Write-Host "✅ Login successful - User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Green
    Write-Host "   Roles: $($loginResponse.data.user.roles -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test Auth Endpoints
Write-Host "`n[2] Testing Authentication Endpoints..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "GET" -Endpoint "/auth/me" -Description "Get Current User Profile" -ExpectedStatus 200
$results += Test-Endpoint -Method "POST" -Endpoint "/auth/refresh" -Description "Token Refresh" -ExpectedStatus 200

# Step 3: Test Client Management
Write-Host "`n[3] Testing Client Management..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "GET" -Endpoint "/clients" -Description "List Clients (RLS)" -ExpectedStatus 200
$results += Test-Endpoint -Method "GET" -Endpoint "/clients/stats" -Description "Client Statistics" -ExpectedStatus 200

# Get first client ID if available for detail tests
$clientId = $null
try {
    $clientsResponse = Invoke-RestMethod -Uri "$baseUrl/clients" -Method GET -WebSession $session
    if ($clientsResponse.data -and $clientsResponse.data.Count -gt 0) {
        $clientId = $clientsResponse.data[0].id
        Write-Host "   Found client ID: $clientId" -ForegroundColor Gray
        $results += Test-Endpoint -Method "GET" -Endpoint "/clients/$clientId" -Description "Get Client Details" -ExpectedStatus 200
    }
} catch {
    Write-Host "   ⚠️  Could not fetch clients list" -ForegroundColor Yellow
}

# Step 4: Test Appointments
Write-Host "`n[4] Testing Appointments..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "GET" -Endpoint "/appointments" -Description "List Appointments" -ExpectedStatus 200

# Step 5: Test Clinical Notes
Write-Host "`n[5] Testing Clinical Notes..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "GET" -Endpoint "/clinical-notes/my-notes" -Description "Get My Clinical Notes" -ExpectedStatus 200
if ($clientId) {
    $results += Test-Endpoint -Method "GET" -Endpoint "/clinical-notes/client/$clientId" -Description "Get Client Clinical Notes" -ExpectedStatus 200
}

# Step 6: Test Billing
Write-Host "`n[6] Testing Billing Operations..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "GET" -Endpoint "/billing/charges" -Description "List Billing Charges" -ExpectedStatus 200
$results += Test-Endpoint -Method "GET" -Endpoint "/billing/payments" -Description "List Payments" -ExpectedStatus 200
$results += Test-Endpoint -Method "GET" -Endpoint "/billing/reports/aging" -Description "AR Aging Report (CRITICAL)" -ExpectedStatus 200

# Step 7: Test Logout
Write-Host "`n[7] Testing Logout..." -ForegroundColor Yellow
$results += Test-Endpoint -Method "POST" -Endpoint "/auth/logout" -Description "User Logout" -ExpectedStatus 200

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Pass -eq $true }).Count
$failed = ($results | Where-Object { $_.Pass -eq $false }).Count
$total = $results.Count
$avgTime = ($results | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Average).Average
$maxTime = ($results | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Maximum).Maximum

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Average Response Time: $([math]::Round($avgTime, 2))ms" -ForegroundColor White
Write-Host "Max Response Time: $([math]::Round($maxTime, 2))ms" -ForegroundColor White

if ($failed -gt 0) {
    Write-Host "`nFAILED TESTS:" -ForegroundColor Red
    $results | Where-Object { $_.Pass -eq $false } | ForEach-Object {
        Write-Host "  ❌ $($_.Test)" -ForegroundColor Red
        Write-Host "     Endpoint: $($_.Method) $($_.Endpoint)" -ForegroundColor Gray
        Write-Host "     Status: $($_.Status) (Expected: $($_.ExpectedStatus))" -ForegroundColor Gray
        Write-Host "     Error: $($_.Error)" -ForegroundColor Gray
    }
}

# Performance Benchmarks
Write-Host "`nPERFORMANCE BENCHMARKS:" -ForegroundColor Cyan
$results | ForEach-Object {
    $benchmark = switch ($_.Test) {
        { $_ -match "Auth" } { 200 }
        { $_ -match "List|Get.*Notes|Get.*Charges|Get.*Payments" } { 500 }
        { $_ -match "Get.*Details|Get.*Client" } { 300 }
        { $_ -match "Report" } { 10000 }
        default { 500 }
    }
    $status = if ($_.Duration -le $benchmark) { "✅" } else { "⚠️" }
    Write-Host "  $status $($_.Test): $($_.Duration)ms (target: ${benchmark}ms)" -ForegroundColor $(if ($_.Duration -le $benchmark) { "Green" } else { "Yellow" })
}

# Export results
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$resultsFile = "authenticated-test-results_$timestamp.json"
$results | ConvertTo-Json -Depth 5 | Out-File $resultsFile
Write-Host "`nResults saved to: $resultsFile" -ForegroundColor Cyan



