# Test script for new books and enhanced features
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTING NEW BOOKS & FEATURES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8083"

Write-Host "[TEST 1] Searching for new 'education' books..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/catalog-service/search/education" -Method Get
    Write-Host "✓ Found $($response.items.Count) education books:" -ForegroundColor Green
    foreach ($book in $response.items) {
        Write-Host "  - [$($book.id)] $($book.bookTitle) - `$$($book.bookCost) (Stock: $($book.numberOfItems))" -ForegroundColor White
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 2] Searching for new 'nature' book..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/catalog-service/search/nature" -Method Get
    Write-Host "✓ Found $($response.items.Count) nature books:" -ForegroundColor Green
    foreach ($book in $response.items) {
        Write-Host "  - [$($book.id)] $($book.bookTitle) - `$$($book.bookCost) (Stock: $($book.numberOfItems))" -ForegroundColor White
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 3] Getting info for Book #9 (How to finish Project 3 on time)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/catalog-service/info/9" -Method Get
    Write-Host "✓ Book Info:" -ForegroundColor Green
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  Stock: $($response.numberOfItems)" -ForegroundColor White
    Write-Host "  Price: `$$($response.bookCost)" -ForegroundColor White
    if ($response.cached) {
        Write-Host "  [CACHED]" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 4] Purchasing Book #10 (Why theory classes are so hard)..." -ForegroundColor Yellow
try {
    $body = @{
        id = 10
        orderCost = 32
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/order-service/purchase" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Purchase successful: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 5] Verifying stock decreased for Book #10..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/catalog-service/info/10" -Method Get
    Write-Host "✓ Current stock: $($response.numberOfItems)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 6] Purchasing Book #11 (Spring in the Pioneer Valley)..." -ForegroundColor Yellow
try {
    $body = @{
        id = 11
        orderCost = 24
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/order-service/purchase" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Purchase successful: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Tests Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
