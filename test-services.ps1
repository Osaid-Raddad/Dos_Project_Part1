# Microservices Testing Script
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "MICROSERVICES TESTING SUITE" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Search for Fiction Books
Write-Host "[TEST 1] Searching for Fiction Books..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/search/fiction" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Search for Programming Books
Write-Host "[TEST 2] Searching for Programming Books..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/search/programming" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Search for Science Books
Write-Host "[TEST 3] Searching for Science Books..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/search/science" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Book Info by ID (Book 1)
Write-Host "[TEST 4] Getting Info for Book ID 1..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/info/1" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Book Info by ID (Book 7 - Programming Book)
Write-Host "[TEST 5] Getting Info for Book ID 7..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/info/7" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Purchase a Book (Order Service)
Write-Host "[TEST 6] Purchasing Book ID 1 (Cost: 15, Paying: 20)..." -ForegroundColor Yellow
try {
    $body = @{
        id = 1
        orderCost = 20
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8083/order-service/purchase" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: Verify Inventory After Purchase
Write-Host "[TEST 7] Verifying Inventory for Book ID 1 (Should be decreased)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/info/1" -UseBasicParsing
    Write-Host "✅ SUCCESS:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Test 8: Test Redis Caching (Search same topic twice)
Write-Host "[TEST 8] Testing Redis Cache (Search 'history' twice)..." -ForegroundColor Yellow
try {
    Write-Host "First Request (Cache Miss):" -ForegroundColor Cyan
    $start1 = Get-Date
    $response1 = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/search/history" -UseBasicParsing
    $time1 = (Get-Date) - $start1
    Write-Host "Time: $($time1.TotalMilliseconds)ms"
    
    Start-Sleep -Seconds 1
    
    Write-Host "Second Request (Cache Hit):" -ForegroundColor Cyan
    $start2 = Get-Date
    $response2 = Invoke-WebRequest -Uri "http://localhost:8083/catalog-service/search/history" -UseBasicParsing
    $time2 = (Get-Date) - $start2
    Write-Host "Time: $($time2.TotalMilliseconds)ms"
    
    if ($time2.TotalMilliseconds -lt $time1.TotalMilliseconds) {
        Write-Host "✅ Cache is working! Second request was faster." -ForegroundColor Green
    }
    $response2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE!" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
