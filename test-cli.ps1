# Test CLI Client Commands

Write-Host "=== Testing CLI Client ===" -ForegroundColor Cyan

# Test 1: Info Command
Write-Host "`n1. Testing INFO command (Book ID: 1)..." -ForegroundColor Yellow
echo "1" | node src/client-service/index.js info-book-item-number

# Test 2: Info Command - Another Book
Write-Host "`n2. Testing INFO command (Book ID: 5)..." -ForegroundColor Yellow
echo "5" | node src/client-service/index.js info-book-item-number

# Test 3: Search Command - Try different topics
Write-Host "`n3. Testing SEARCH command (Topic: 'How')..." -ForegroundColor Yellow
echo "How" | node src/client-service/index.js search-book-title

Write-Host "`n4. Testing SEARCH command (Topic: 'Distributed')..." -ForegroundColor Yellow
echo "Distributed" | node src/client-service/index.js search-book-title

Write-Host "`n=== CLI Client Tests Complete ===" -ForegroundColor Green
Write-Host "`nNote: For purchase testing, you need to run it interactively:" -ForegroundColor Cyan
Write-Host "  node src/client-service/index.js purchase-book-by-item-number" -ForegroundColor White
Write-Host "  Then enter item number and payment amount when prompted" -ForegroundColor White
