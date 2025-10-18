# Script to fix all /api/v1/ paths in frontend
# This removes the hardcoded /api/v1/ prefix from all API calls

$files = Get-ChildItem -Path "packages\frontend\src" -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false

    # Replace axios.get(`/api/v1/ with axios.get(`/
    $newContent = $content -replace '(axios\.(get|post|put|patch|delete)\(`)/api/v1/', '$1/'

    # Replace axios.get('/api/v1/ with axios.get('/
    $newContent = $newContent -replace '(axios\.(get|post|put|patch|delete)\([''"])/api/v1/', '$1/'

    # Replace api.get(`/api/v1/ with api.get(`/
    $newContent = $newContent -replace '(api\.(get|post|put|patch|delete)\(`)/api/v1/', '$1/'

    # Replace api.get('/api/v1/ with api.get('/
    $newContent = $newContent -replace '(api\.(get|post|put|patch|delete)\([''"])/api/v1/', '$1/'

    # Replace API_BASE = '/api/v1/ with API_BASE = '/
    $newContent = $newContent -replace "(API_BASE\s*=\s*['\"])/api/v1/", '$1/'

    # Replace ${API_URL}/api/v1/ with ${API_URL}/
    $newContent = $newContent -replace '\$\{API_URL\}/api/v1/', '${API_URL}/'

    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Fixed: $($file.FullName)"
        $modified = $true
    }
}

Write-Host "`nDone! All API paths have been fixed."
