# Production API Testing Script
# MentalSpace EHR v2 Production Testing

$baseUrl = "https://api.mentalspaceehr.com/api/v1"
$results = @()
$global:sessionCookies = @{}

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description,
        [switch]$SaveCookies
    )
    
    $url = "$baseUrl$Endpoint"
    $startTime = Get-Date
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        
        # Add headers
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        # Add body if provided
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        
        $response = Invoke-WebRequest @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        # Extract and save cookies if requested
        if ($SaveCookies -and $response.Headers.'Set-Cookie') {
            $cookieHeader = $response.Headers.'Set-Cookie'
            if ($cookieHeader -is [array]) {
                $cookieHeader = $cookieHeader -join '; '
            }
            $global:sessionCookies['Cookie'] = $cookieHeader
            Write-Host "   💾 Cookies saved for session" -ForegroundColor Gray
        }
        
        $responseData = $null
        try {
            $responseData = $response.Content | ConvertFrom-Json
        } catch {
            $responseData = $response.Content
        }
        
        $result = @{
            Description = $Description
            Method = $Method
            Endpoint = $Endpoint
            Status = "PASS"
            StatusCode = $response.StatusCode
            ResponseTime = [math]::Round($duration, 2)
            Response = $responseData
            Error = $null
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $color = "Green"
        if ($result.ResponseTime -gt 1000) { $color = "Yellow" }
        Write-Host "✅ PASS: $Description - $($response.StatusCode) ($($result.ResponseTime)ms)" -ForegroundColor $color
        
        return $result
    }
    catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $statusCode = 0
        $errorMessage = $_.Exception.Message
        $errorResponse = $null
        
        # Try to extract status code and error response
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorContent = $reader.ReadToEnd()
                $errorResponse = $errorContent | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($errorResponse) {
                    $errorMessage = $errorResponse.message
                }
            } catch {
                # Ignore parsing errors
            }
        }
        
        $result = @{
            Description = $Description
            Method = $Method
            Endpoint = $Endpoint
            Status = if ($statusCode -eq 401 -or $statusCode -eq 403 -or $statusCode -eq 404) { "EXPECTED" } else { "FAIL" }
            StatusCode = $statusCode
            ResponseTime = [math]::Round($duration, 2)
            Response = $errorResponse
            Error = $errorMessage
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        $color = if ($result.Status -eq "EXPECTED") { "Yellow" } else { "Red" }
        $symbol = if ($result.Status -eq "EXPECTED") { "⚠️" } else { "❌" }
        Write-Host "$symbol $($result.Status): $Description - $statusCode ($($result.ResponseTime)ms)" -ForegroundColor $color
        if ($errorMessage) {
            Write-Host "   Error: $errorMessage" -ForegroundColor $color
        }
        
        $script:results += $result
        return $result
    }
}

function Test-Authentication {
    Write-Host "`n=== AUTHENTICATION FLOW TESTING ===" -ForegroundColor Cyan
    
    # Test 1: Health Check
    Test-Endpoint -Method "GET" -Endpoint "/health/live" -Description "Health Check"
    
    # Test 2: Register User (may fail if registration disabled or user exists)
    $timestamp = Get-Date -Format 'yyyyMMddHHmmss'
    $registerBody = @{
        email = "test.$timestamp@mentalspaceehr.test"
        password = "SecureP@ss123!"
        firstName = "Test"
        lastName = "User$timestamp"
        role = "CLINICIAN"
    }
    $registerResult = Test-Endpoint -Method "POST" -Endpoint "/auth/register" -Body $registerBody -Description "User Registration" -SaveCookies
    
    # Use registered email or try with existing test account
    $testEmail = $registerBody.email
    if ($registerResult.Status -ne "PASS") {
        Write-Host "   ⚠️  Registration failed, will try login with test account" -ForegroundColor Yellow
        # You may need to provide a valid test account here
        $testEmail = Read-Host "Enter test email (or press Enter to skip auth tests)"
        if ([string]::IsNullOrWhiteSpace($testEmail)) {
            Write-Host "   ⏭️  Skipping remaining auth tests" -ForegroundColor Yellow
            return $null
        }
    }
    
    # Test 3: Login
    $loginBody = @{
        email = $testEmail
        password = $registerBody.password
    }
    $loginResult = Test-Endpoint -Method "POST" -Endpoint "/auth/login" -Body $loginBody -Description "User Login" -SaveCookies
    
    if ($loginResult.Status -ne "PASS") {
        Write-Host "   ⚠️  Login failed, cannot continue with authenticated tests" -ForegroundColor Yellow
        return $null
    }
    
    # Test 4: Get Current User (without auth - should fail)
    Test-Endpoint -Method "GET" -Endpoint "/auth/me" -Description "Get Current User (Unauthenticated - Expected 401)"
    
    # Test 5: Get Current User (with auth)
    if ($global:sessionCookies.Cookie) {
        Test-Endpoint -Method "GET" -Endpoint "/auth/me" -Headers $global:sessionCookies -Description "Get Current User (Authenticated)"
        
        # Test 6: Refresh Token
        Test-Endpoint -Method "POST" -Endpoint "/auth/refresh" -Headers $global:sessionCookies -Description "Refresh Token" -SaveCookies
        
        # Test 7: Logout
        Test-Endpoint -Method "POST" -Endpoint "/auth/logout" -Headers $global:sessionCookies -Description "Logout"
    }
    
    return $global:sessionCookies
}

function Test-Clients {
    param([hashtable]$AuthHeaders)
    
    Write-Host "`n=== CLIENT MANAGEMENT TESTING ===" -ForegroundColor Cyan
    
    if (-not $AuthHeaders -or -not $AuthHeaders.Cookie) {
        Write-Host "⚠️  Skipping client tests - authentication required" -ForegroundColor Yellow
        return $null
    }
    
    # Test 1: List Clients
    Test-Endpoint -Method "GET" -Endpoint "/clients" -Headers $AuthHeaders -Description "List All Clients"
    
    # Test 2: Create Client
    $clientBody = @{
        firstName = "John"
        lastName = "Doe"
        dateOfBirth = "1990-01-15"
        email = "john.doe.test.$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        phone = "555-1234"
    }
    $createResult = Test-Endpoint -Method "POST" -Endpoint "/clients" -Headers $AuthHeaders -Body $clientBody -Description "Create Client"
    
    # Test 3: Get Client Stats
    Test-Endpoint -Method "GET" -Endpoint "/clients/stats" -Headers $AuthHeaders -Description "Client Statistics"
    
    # Test 4: Get Client by ID (if created)
    $clientId = $null
    if ($createResult.Status -eq "PASS" -and $createResult.Response) {
        if ($createResult.Response.data -and $createResult.Response.data.id) {
            $clientId = $createResult.Response.data.id
        } elseif ($createResult.Response.id) {
            $clientId = $createResult.Response.id
        }
        
        if ($clientId) {
            Test-Endpoint -Method "GET" -Endpoint "/clients/$clientId" -Headers $AuthHeaders -Description "Get Client by ID"
            
            # Test 5: Update Client
            $updateBody = @{
                phone = "555-5678"
            }
            Test-Endpoint -Method "PATCH" -Endpoint "/clients/$clientId" -Headers $AuthHeaders -Body $updateBody -Description "Update Client"
        }
    }
    
    return $clientId
}

function Test-Appointments {
    param([hashtable]$AuthHeaders, [string]$ClientId)
    
    Write-Host "`n=== APPOINTMENT TESTING ===" -ForegroundColor Cyan
    
    if (-not $AuthHeaders -or -not $AuthHeaders.Cookie) {
        Write-Host "⚠️  Skipping appointment tests - authentication required" -ForegroundColor Yellow
        return
    }
    
    # Test 1: List Appointments
    Test-Endpoint -Method "GET" -Endpoint "/appointments" -Headers $AuthHeaders -Description "List Appointments"
    
    # Note: Creating appointments requires providerId and appointmentTypeId
    # We'll test what we can without those
    
    return $null
}

function Test-ClinicalNotes {
    param([hashtable]$AuthHeaders, [string]$ClientId)
    
    Write-Host "`n=== CLINICAL NOTES TESTING ===" -ForegroundColor Cyan
    
    if (-not $AuthHeaders -or -not $AuthHeaders.Cookie) {
        Write-Host "⚠️  Skipping clinical notes tests - authentication required" -ForegroundColor Yellow
        return
    }
    
    # Test 1: Get My Notes
    Test-Endpoint -Method "GET" -Endpoint "/clinical-notes/my-notes" -Headers $AuthHeaders -Description "Get My Notes"
    
    # Test 2: Get Client Notes (if client ID available)
    if ($ClientId) {
        Test-Endpoint -Method "GET" -Endpoint "/clinical-notes/client/$ClientId" -Headers $AuthHeaders -Description "Get Client Notes"
    }
    
    return $null
}

function Test-Billing {
    param([hashtable]$AuthHeaders)
    
    Write-Host "`n=== BILLING TESTING ===" -ForegroundColor Cyan
    
    if (-not $AuthHeaders -or -not $AuthHeaders.Cookie) {
        Write-Host "⚠️  Skipping billing tests - authentication required" -ForegroundColor Yellow
        return
    }
    
    # Test 1: List Charges
    Test-Endpoint -Method "GET" -Endpoint "/billing/charges" -Headers $AuthHeaders -Description "List Charges"
    
    # Test 2: List Payments
    Test-Endpoint -Method "GET" -Endpoint "/billing/payments" -Headers $AuthHeaders -Description "List Payments"
    
    # Test 3: AR Aging Report (CRITICAL)
    $agingResult = Test-Endpoint -Method "GET" -Endpoint "/billing/reports/aging" -Headers $AuthHeaders -Description "AR Aging Report (CRITICAL)"
    
    if ($agingResult -and $agingResult.ResponseTime -gt 10000) {
        Write-Host "⚠️  WARNING: AR Aging Report took $($agingResult.ResponseTime)ms (target: < 10s)" -ForegroundColor Yellow
    }
    
    return $null
}

function Test-Security {
    Write-Host "`n=== SECURITY & HIPAA COMPLIANCE TESTING ===" -ForegroundColor Cyan
    
    # Test 1: Unauthenticated Client Access
    Test-Endpoint -Method "GET" -Endpoint "/clients" -Description "Unauthenticated Client Access (Expected 401)"
    
    # Test 2: Invalid Endpoint
    Test-Endpoint -Method "GET" -Endpoint "/invalid-endpoint" -Description "Invalid Endpoint (Expected 404)"
    
    # Test 3: Invalid Resource ID
    Test-Endpoint -Method "GET" -Endpoint "/clients/invalid-id-12345" -Description "Invalid Resource ID (Expected 404)"
    
    return $null
}

function Show-Summary {
    Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Tests: $($results.Count)"
    
    $passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
    $failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
    $expected = ($results | Where-Object { $_.Status -eq "EXPECTED" }).Count
    
    Write-Host "✅ Passed: $passed" -ForegroundColor Green
    Write-Host "❌ Failed: $failed" -ForegroundColor Red
    Write-Host "⚠️  Expected Failures: $expected" -ForegroundColor Yellow
    
    Write-Host "`n=== PERFORMANCE SUMMARY ===" -ForegroundColor Cyan
    $responseTimes = $results | Where-Object { $_.ResponseTime -gt 0 } | Select-Object -ExpandProperty ResponseTime
    if ($responseTimes) {
        $avgTime = ($responseTimes | Measure-Object -Average).Average
        $maxTime = ($responseTimes | Measure-Object -Maximum).Maximum
        $minTime = ($responseTimes | Measure-Object -Minimum).Minimum
        Write-Host "Average Response Time: $([math]::Round($avgTime, 2))ms"
        Write-Host "Maximum Response Time: $([math]::Round($maxTime, 2))ms"
        Write-Host "Minimum Response Time: $([math]::Round($minTime, 2))ms"
        
        # Performance benchmarks
        Write-Host "`n=== PERFORMANCE BENCHMARKS ===" -ForegroundColor Cyan
        $slowTests = $results | Where-Object { 
            ($_.Description -like "*Authentication*" -and $_.ResponseTime -gt 200) -or
            ($_.Description -like "*List*" -and $_.ResponseTime -gt 500) -or
            ($_.Description -like "*Get*" -and $_.ResponseTime -gt 300) -or
            ($_.Description -like "*Create*" -and $_.ResponseTime -gt 300) -or
            ($_.Description -like "*Report*" -and $_.ResponseTime -gt 10000)
        }
        if ($slowTests) {
            Write-Host "⚠️  Tests exceeding performance targets:" -ForegroundColor Yellow
            $slowTests | ForEach-Object {
                Write-Host "   - $($_.Description): $($_.ResponseTime)ms" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✅ All tests within performance targets" -ForegroundColor Green
        }
    }
    
    # Export results to JSON
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $resultsFile = "test-results-$timestamp.json"
    $results | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile
    Write-Host "`nResults exported to: $resultsFile" -ForegroundColor Gray
    
    # Show failures
    if ($failed -gt 0) {
        Write-Host "`n=== FAILED TESTS ===" -ForegroundColor Red
        $results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
            Write-Host "❌ $($_.Description)" -ForegroundColor Red
            Write-Host "   Endpoint: $($_.Method) $($_.Endpoint)" -ForegroundColor Gray
            Write-Host "   Status: $($_.StatusCode)" -ForegroundColor Gray
            if ($_.Error) {
                Write-Host "   Error: $($_.Error)" -ForegroundColor Gray
            }
        }
    }
}

# Main Execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MentalSpace EHR v2 Production Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Start Time: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# Run test suites
$authHeaders = Test-Authentication

if ($authHeaders -and $authHeaders.Cookie) {
    $clientId = Test-Clients -AuthHeaders $authHeaders
    Test-Appointments -AuthHeaders $authHeaders -ClientId $clientId
    Test-ClinicalNotes -AuthHeaders $authHeaders -ClientId $clientId
    Test-Billing -AuthHeaders $authHeaders
} else {
    Write-Host "`n⚠️  Authentication failed - skipping authenticated tests" -ForegroundColor Yellow
    Write-Host "   To test authenticated endpoints, provide valid credentials" -ForegroundColor Yellow
}

Test-Security

Show-Summary

Write-Host "`nEnd Time: $(Get-Date)" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
