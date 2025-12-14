# Bazar.com Distributed Bookstore - Documentation

## What This Program Does

This is a **distributed online bookstore system** built with microservices architecture. The system allows customers to search for books and make purchases through a high-performance, scalable platform.

### Key Features:
- **11 books catalog** including 3 new spring break books
- **Fast caching system** (90-100% faster response with Redis cache)
- **Load balancing** across multiple servers for better performance
- **Microservices architecture** with independent services for catalog and orders
- **Docker containerization** for easy deployment

### Services:
- **Frontend Service**: Handles caching and load balancing
- **Catalog Service**: Manages book inventory (2 replicas)
- **Order Service**: Processes purchases (2 replicas)
- **Redis**: Cache storage for fast queries
- **Nginx**: Reverse proxy (port 8083)

---

## How to Run the Program

### Prerequisites
- Docker Desktop installed and running
- PowerShell terminal (Windows)

### Quick Start

**1. Initialize Docker Swarm:**
```powershell
docker swarm init
```

**2. Build Service Images:**
```powershell
docker build -t catalog-service --target catalog-service-production .
docker build -t frontend-service --target frontend-service-production .
docker build -t order-service --target order-service-production .
```

**3. Deploy the Stack:**
```powershell
docker stack deploy -c docker-compose.yml DOS_Project_Stack
```

**4. Wait for Services (15-20 seconds):**
```powershell
Start-Sleep -Seconds 20
docker service ls
```

**5. Verify All Services Running:**
You should see 2/2 catalog, 2/2 order, 1/1 frontend, 1/1 redis, 1/1 nginx

---

## Using the System

### Search for Books:
```powershell
# Search education books
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/education" -Method Get

# Search nature books
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/nature" -Method Get
```

### Get Book Details:
```powershell
# Get info for book ID 9
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/info/9" -Method Get
```

### Test Cache Performance:
```powershell
# First call (slow - from database)
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/distributed" -Method Get

# Second call (fast - from cache)
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/distributed" -Method Get
```

---

## Using Test Scripts

### Automated Performance Testing:
```powershell
powershell -ExecutionPolicy Bypass -File .\test-performance.ps1
```
This script automatically tests cache performance with multiple iterations and generates a performance report.

### Testing New Books:
```powershell
powershell -ExecutionPolicy Bypass -File .\test-new-books.ps1
```
This script verifies all 3 new spring break books are working correctly.

---

## Stop the System

```powershell
docker stack rm DOS_Project_Stack
```

---

## New Books (Spring Break Sale)

- **Book #9**: "How to finish Project 3 on time" - $28 (education)
- **Book #10**: "Why theory classes are so hard" - $32 (education)
- **Book #11**: "Spring in the Pioneer Valley" - $24 (nature)

---

## System Access

- **Base URL**: http://localhost:8083
- **Search API**: GET /catalog-service/search/{topic}
- **Info API**: GET /catalog-service/info/{id}
- **Purchase API**: POST /order-service/purchase

---

## Troubleshooting

**Services not starting?**
```powershell
docker service logs DOS_Project_Stack_catalog-server --tail 20
```

**Need to restart?**
```powershell
docker stack rm DOS_Project_Stack
Start-Sleep -Seconds 10
docker stack deploy -c docker-compose.yml DOS_Project_Stack
```

---

**System Status**: All features operational ✅
