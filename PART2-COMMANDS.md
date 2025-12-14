# CLI Commands Reference - Part 2 Enhancements

## 🆕 NEW FEATURES TESTING

### Quick Test All New Features
```powershell
# Test new books
powershell -ExecutionPolicy Bypass -File test-new-books.ps1

# Performance testing
powershell -ExecutionPolicy Bypass -File test-performance.ps1
```

---

## 📚 NEW BOOKS COMMANDS

### Search Education Books (NEW!)
```bash
curl http://localhost:8083/catalog-service/search/education
```
Returns: Books #9 and #10

### Search Nature Books (NEW!)
```bash
curl http://localhost:8083/catalog-service/search/nature
```
Returns: Book #11

### Get Info - Book #9
```bash
curl http://localhost:8083/catalog-service/info/9
```

### Get Info - Book #10
```bash
curl http://localhost:8083/catalog-service/info/10
```

### Get Info - Book #11
```bash
curl http://localhost:8083/catalog-service/info/11
```

---

## 💰 PURCHASE NEW BOOKS

### Purchase "How to finish Project 3 on time"
```bash
curl -X POST http://localhost:8083/order-service/purchase -H "Content-Type: application/json" -d "{\"id\":9,\"orderCost\":28}"
```

### Purchase "Why theory classes are so hard"
```bash
curl -X POST http://localhost:8083/order-service/purchase -H "Content-Type: application/json" -d "{\"id\":10,\"orderCost\":32}"
```

### Purchase "Spring in the Pioneer Valley"
```bash
curl -X POST http://localhost:8083/order-service/purchase -H "Content-Type: application/json" -d "{\"id\":11,\"orderCost\":24}"
```

---

## 🔥 CACHE TESTING

### Test Cache Hit vs Miss
```powershell
# Clear cache
curl -X POST http://localhost:3005/cache/clear

# First request (MISS - slower)
curl http://localhost:8083/catalog-service/search/programming

# Second request (HIT - faster!)
curl http://localhost:8083/catalog-service/search/programming
```

### Test Cache Invalidation
```powershell
# 1. Populate cache
curl http://localhost:8083/catalog-service/info/9

# 2. Purchase (triggers invalidation)
curl -X POST http://localhost:8083/order-service/purchase -H "Content-Type: application/json" -d "{\"id\":9,\"orderCost\":28}"

# 3. Next request is cache miss (fresh data with decreased stock)
curl http://localhost:8083/catalog-service/info/9
```

---

## 📊 MONITORING

### Frontend Logs (Caching Activity)
```bash
docker service logs DOS_Project_Stack_frontend
```

### Catalog Logs (Invalidation & Sync)
```bash
docker service logs DOS_Project_Stack_catalog-server
```

### Service Status
```bash
docker service ls
```

---


