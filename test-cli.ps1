# Test CLI Client Commands

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CLI CLIENT - COMPREHENSIVE TESTS    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Search Command - Fiction
Write-Host "`n[TEST 1] SEARCH - Topic: 'fiction'" -ForegroundColor Yellow
Write-Host "Command: node src/client-service/index.mjs search-book-title" -ForegroundColor Gray
Write-Host "Input: fiction" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
echo "fiction" | node src/client-service/index.mjs search-book-title
Write-Host "`nPress any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 2: Search Command - Science
Write-Host "`n[TEST 2] SEARCH - Topic: 'science'" -ForegroundColor Yellow
Write-Host "Command: node src/client-service/index.mjs search-book-title" -ForegroundColor Gray
Write-Host "Input: science" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
echo "science" | node src/client-service/index.mjs search-book-title
Write-Host "`nPress any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 3: Search Command - Non-existent
Write-Host "`n[TEST 3] SEARCH - Topic: 'nonexistent'" -ForegroundColor Yellow
Write-Host "Command: node src/client-service/index.mjs search-book-title" -ForegroundColor Gray
Write-Host "Input: nonexistent" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
echo "nonexistent" | node src/client-service/index.mjs search-book-title
Write-Host "`nPress any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 4: Info Command - Book 1
Write-Host "`n[TEST 4] INFO - Book ID: 1" -ForegroundColor Yellow
Write-Host "Command: node src/client-service/index.mjs info-book-item-number" -ForegroundColor Gray
Write-Host "Input: 1" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
echo "1" | node src/client-service/index.mjs info-book-item-number
Write-Host "`nPress any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Test 5: Info Command - Book 7
Write-Host "`n[TEST 5] INFO - Book ID: 7" -ForegroundColor Yellow
Write-Host "Command: node src/client-service/index.mjs info-book-item-number" -ForegroundColor Gray
Write-Host "Input: 7" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray
echo "7" | node src/client-service/index.mjs info-book-item-number
Write-Host "`nPress any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   PURCHASE TESTS (INTERACTIVE)         " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nFor purchase testing, run manually:" -ForegroundColor Cyan
Write-Host "  node src/client-service/index.mjs purchase-book-by-item-number" -ForegroundColor White
Write-Host "`nTest scenarios:" -ForegroundColor Cyan
Write-Host "  1. Book ID: 7, Payment: 40  -> Should succeed" -ForegroundColor White
Write-Host "  2. Book ID: 7, Payment: 20  -> Insufficient payment" -ForegroundColor White
Write-Host "  3. Book ID: 99, Payment: 50 -> Book not found" -ForegroundColor White
Write-Host "`n========================================" -ForegroundColor Green
