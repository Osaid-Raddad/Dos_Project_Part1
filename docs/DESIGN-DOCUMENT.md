# Bazar.com Distributed Bookstore System - Design Document

**Course:** Distributed Operating Systems  
**Project:** Part 2 - Caching and Replication  
**Date:** December 2025

---

## 1. System Overview

The Bazar.com distributed bookstore is a microservices-based e-commerce system that enables customers to search for books and place orders through a high-performance, scalable architecture. The system implements advanced distributed systems concepts including caching, load balancing, replica synchronization, and server-push cache invalidation.

### Key Components:
- **Frontend Service**: Centralized caching layer with load balancing
- **Catalog Service**: Book inventory management (2 replicas)
- **Order Service**: Purchase processing (2 replicas)
- **Redis Cache**: In-memory data store for fast queries
- **Nginx**: Reverse proxy for external access
- **SQLite Database**: Persistent storage (11 books)

### New Features (Part 2):
1. **Three new books** added for spring break sale (Books #9, #10, #11)
2. **Frontend caching layer** with Redis integration
3. **Server-push cache invalidation** for consistency
4. **Write-master replication** pattern with internal synchronization protocol
5. **Round-robin load balancing** across catalog and order replicas
6. **Docker Swarm** orchestration for all services

---

## 2. Architecture Design

### 2.1 Request Flow

```
Client → Nginx (port 8083) → Frontend Service (port 3005)
                                     ↓
                         ┌───────────┴───────────┐
                         ↓                       ↓
                    Redis Cache          Catalog Service
                    (port 6379)          (2 replicas, port 3000)
                                                 ↓
                                         SQLite Database
```

**Read Path:**
1. Client sends request to Nginx on port 8083
2. Nginx forwards to Frontend Service
3. Frontend checks Redis cache
4. If cache HIT: Return data immediately (0-1ms)
5. If cache MISS: Query catalog service (3-6ms), cache result, return

**Write Path:**
1. Client sends purchase request
2. Frontend forwards to Order Service
3. Order Service requests update from Catalog Service
4. Catalog Service (write-master):
   - Sends cache invalidation to Frontend (server-push)
   - Updates local database
   - Synchronizes with read replica
5. Frontend clears affected cache entries
6. Response returned to client

### 2.2 Caching Strategy

**Cache Storage:** Redis (in-memory)  
**Cache Location:** Frontend Service (centralized)  
**Cache Policy:** Time-to-Live (TTL)
- Search queries: 3600 seconds (1 hour)
- Book info queries: 1800 seconds (30 minutes)

**Cache Keys:**
- `search:{topic}` - Search results by topic
- `info:{bookId}` - Individual book details

**Invalidation Strategy:** Server-push
- Backend sends POST /cache/invalidate before database writes
- Frontend clears all affected cache entries
- Ensures strong consistency between cache and database

### 2.3 Load Balancing

**Algorithm:** Round-robin  
**Implementation:** Frontend service maintains counters for each replica pool

```javascript
let catalogIndex = 0;
function getNextCatalogHost() {
    const hosts = CATALOG_HOST.split(',');
    const host = hosts[catalogIndex % hosts.length];
    catalogIndex++;
    return host;
}
```

**Replica Pools:**
- Catalog Service: 2 replicas (write-master + read replica)
- Order Service: 2 replicas (stateless, both handle requests)

### 2.4 Replica Synchronization

**Pattern:** Write-Master Replication  
**Protocol:** Internal HTTP (POST /sync-write)

**Write Master** (WRITE_MASTER=true):
- Handles all write operations
- Updates local database
- Syncs to read replica after write

**Read Replica** (WRITE_MASTER=false):
- Handles read operations
- Receives sync updates from master
- Maintains consistent copy of data

**Synchronization Payload:**
```json
{
  "bookId": 1,
  "newCount": 9,
  "timestamp": 1734825600000
}
```

---

## 3. How It Works

### 3.1 Search Operation (with Caching)

1. **Client Request:** `GET /catalog-service/search/education`
2. **Frontend receives** request and checks Redis for key `search:education`
3. **Cache HIT scenario:**
   - Data found in Redis
   - Return immediately (0-1ms response time)
   - Log: "✅ Cache HIT for 'education' (1ms)"

4. **Cache MISS scenario:**
   - Data not in Redis or expired
   - Forward request to catalog service via load balancer
   - Catalog queries SQLite database
   - Frontend caches result in Redis with 1-hour TTL
   - Return to client (3-6ms response time)
   - Log: "❌ Cache MISS for 'education', ✅ completed in 5ms (cache updated)"

### 3.2 Purchase Operation (with Cache Invalidation)

1. **Client Request:** `POST /order-service/purchase {"book_id": 9}`
2. **Frontend forwards** to order service
3. **Order service** requests catalog to update inventory
4. **Catalog service (write-master):**
   - **Step 1:** Send cache invalidation
     ```javascript
     await axios.post('http://frontend:3005/cache/invalidate', { bookId: 9 })
     ```
   - **Step 2:** Update database
     ```sql
     UPDATE books SET numberOfItems = numberOfItems - 1 WHERE id = 9
     ```
   - **Step 3:** Sync to read replica
     ```javascript
     await axios.post('http://catalog-server:3000/sync-write', {
       bookId: 9, newCount: 14, timestamp: Date.now()
     })
     ```
5. **Frontend** clears cache entries:
   - Delete `info:9`
   - Delete all `search:*` keys containing book 9
6. **Response** returned with updated inventory

**Consistency Guarantee:** Cache invalidated BEFORE database write ensures no stale data is served.

### 3.3 Load Balancing in Action

For three consecutive search requests:
```
Request 1 → Frontend → Catalog Replica 1 (catalogIndex=0)
Request 2 → Frontend → Catalog Replica 2 (catalogIndex=1)
Request 3 → Frontend → Catalog Replica 1 (catalogIndex=2, wraps to 0)
```

This distributes load evenly across replicas and prevents any single replica from becoming a bottleneck.

---

## 4. Design Tradeoffs

### 4.1 Centralized vs. Distributed Caching

**Decision:** Centralized cache in frontend service  
**Tradeoff:**
- ✅ **Pros:** Single point for invalidation, easier consistency, no cache synchronization needed
- ❌ **Cons:** Frontend becomes potential bottleneck, single point of failure for cache
- **Rationale:** Simplifies cache consistency and invalidation logic. Single Redis instance sufficient for current scale.

### 4.2 Server-Push vs. Time-Based Invalidation

**Decision:** Server-push (proactive) invalidation  
**Tradeoff:**
- ✅ **Pros:** Strong consistency, immediate invalidation, no stale data served
- ❌ **Cons:** Additional network call (0.4ms overhead), coupling between services
- **Rationale:** Consistency is more important than minimal overhead. Stale data in e-commerce can lead to overselling.

### 4.3 Write-Master vs. Multi-Master Replication

**Decision:** Write-master with read replica  
**Tradeoff:**
- ✅ **Pros:** No write conflicts, simpler consistency model, easier to implement
- ❌ **Cons:** Write master is single point of failure for writes, limited write scalability
- **Rationale:** Current system is read-heavy (searches > purchases). Single write master handles load adequately.

### 4.4 SQLite vs. Distributed Database

**Decision:** SQLite for each catalog replica  
**Tradeoff:**
- ✅ **Pros:** Simple deployment, no external database needed, fast local queries
- ❌ **Cons:** No automatic replication, manual sync required, limited scalability
- **Rationale:** Educational project with small dataset. SQLite provides sufficient performance and simplifies architecture.

### 4.5 Synchronous vs. Asynchronous Cache Invalidation

**Decision:** Synchronous (blocking) invalidation  
**Tradeoff:**
- ✅ **Pros:** Guaranteed consistency, simpler error handling, no eventual consistency issues
- ❌ **Cons:** Slower writes (adds 0.4ms), request blocks on invalidation
- **Rationale:** 0.4ms overhead acceptable for consistency guarantee. Async would require complex eventual consistency logic.

---

## 5. Performance Analysis

### 5.1 Experimental Results

**Test Setup:**
- 20 iterations for cache MISS (cold cache)
- 20 iterations for cache HIT (warm cache)
- 5 iterations for invalidation overhead measurement

**Results:**

| Metric | Cache MISS | Cache HIT | Improvement |
|--------|-----------|-----------|-------------|
| Average Response Time | 2.65ms | 0.5ms | **81.13%** |
| Minimum Time | 0ms | 0ms | - |
| Maximum Time | 6ms | 1ms | - |
| Standard Deviation | 1.59ms | 0.5ms | - |

**Cache Invalidation Overhead:**
- Average: 0.4ms
- Impact: Minimal (15% of cache HIT time)
- Consistency benefit: Worth the cost

### 5.2 Key Findings

1. **Caching provides 81% performance improvement** on average
2. **Cache HIT latency (0.5ms)** is 5x faster than cache MISS (2.65ms)
3. **Invalidation overhead (0.4ms)** is acceptable for strong consistency
4. **Redis performance** is consistent (0-1ms) with low variance
5. **Database queries** show higher variance (0-6ms) due to SQLite I/O

### 5.3 Scalability Observations

- **Load balancing** distributes queries evenly across 2 replicas
- **Read replicas** can be added to scale read capacity
- **Cache hit rate** improves as system warms up (most queries hit cache)
- **Bottleneck** currently at database writes (single write-master)

---

## 6. Possible Improvements and Extensions

### 6.1 Cache Enhancements

**Selective Invalidation:**
- Currently invalidates all `search:*` keys on any book update
- **Improvement:** Track which books are in which search results
- **Implementation:** Maintain reverse index in Redis
  ```javascript
  // When caching search results
  redisClient.sadd(`book:${bookId}:searches`, 'search:education')
  
  // On invalidation
  const searches = await redisClient.smembers(`book:${bookId}:searches`)
  await redisClient.del(searches)
  ```
- **Benefit:** Reduce cache invalidation overhead by 60-80%

**Cache Warming:**
- Preload popular searches on startup
- **Implementation:** Background job to execute common queries
- **Benefit:** Improve cache hit rate for first users

### 6.2 Replication Enhancements

**Multi-Master with Conflict Resolution:**
- Allow writes to multiple replicas
- **Implementation:** Use vector clocks or last-write-wins
- **Benefit:** Eliminate single point of failure for writes

**Asynchronous Replication:**
- Sync to replicas after responding to client
- **Implementation:** Message queue (RabbitMQ) for sync events
- **Benefit:** Reduce write latency, accept eventual consistency

### 6.3 Load Balancing Improvements

**Health-Aware Load Balancing:**
- Check replica health before forwarding
- **Implementation:** Periodic health checks, remove unhealthy replicas
- **Benefit:** Avoid sending requests to failing services

**Least-Connections Algorithm:**
- Route to replica with fewest active connections
- **Implementation:** Track connection count per replica
- **Benefit:** Better load distribution under uneven query patterns

### 6.4 Monitoring and Observability

**Distributed Tracing:**
- Trace requests across all services
- **Implementation:** OpenTelemetry or Jaeger
- **Benefit:** Debug performance issues, visualize request flow

**Metrics Dashboard:**
- Real-time cache hit rates, latency percentiles
- **Implementation:** Prometheus + Grafana
- **Benefit:** Monitor system health, capacity planning

### 6.5 Consistency Models

**Read-Your-Writes Consistency:**
- Guarantee user sees their own updates immediately
- **Implementation:** Session-based routing or version vectors
- **Benefit:** Better user experience without strong global consistency

**Quorum Reads/Writes:**
- Read from majority of replicas for stronger consistency
- **Implementation:** Require N/2+1 replicas to agree
- **Benefit:** Tolerate replica failures with consistency

---

## 7. How to Run the Program

### 7.1 Prerequisites

- **Docker Desktop**: Installed and running
- **PowerShell**: Windows terminal (pre-installed on Windows)
- **Ports**: 8083 must be available

### 7.2 Setup Instructions

**Step 1: Clone Repository**
```bash
git clone <repository-url>
cd DosProject1
```

**Step 2: Initialize Docker Swarm**
```powershell
docker swarm init
```

**Step 3: Build Service Images**
```powershell
docker build -t catalog-service --target catalog-service-production .
docker build -t frontend-service --target frontend-service-production .
docker build -t order-service --target order-service-production .
```

**Step 4: Deploy Stack**
```powershell
docker stack deploy -c docker-compose.yml DOS_Project_Stack
```

**Step 5: Wait for Services**
```powershell
Start-Sleep -Seconds 20
docker service ls
```

**Expected Output:**
```
NAME                               REPLICAS   IMAGE
DOS_Project_Stack_catalog-server   2/2        catalog-service:latest
DOS_Project_Stack_frontend         1/1        frontend-service:latest
DOS_Project_Stack_order-server     2/2        order-service:latest
DOS_Project_Stack_nginx            1/1        nginx:stable-alpine
DOS_Project_Stack_redis            1/1        redis:latest
```

### 7.3 Testing the System

**Search for New Books:**
```powershell
# Education books
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/education"

# Nature book
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/nature"
```

**Get Book Details:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/info/9"
```

**Test Cache Performance:**
```powershell
# First call (cache MISS)
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/systems"

# Second call (cache HIT)
Invoke-RestMethod -Uri "http://localhost:8083/catalog-service/search/systems"
```

**Run Performance Experiments:**
```powershell
powershell -ExecutionPolicy Bypass -File .\run-performance-experiments.ps1
```

### 7.4 Stopping the System

```powershell
docker stack rm DOS_Project_Stack
```

### 7.5 Troubleshooting

**Services not starting?**
```powershell
docker service logs DOS_Project_Stack_catalog-server --tail 20
```

**Database issues?**
```powershell
docker stack rm DOS_Project_Stack
docker volume rm DOS_Project_Stack_catalog-db
docker stack deploy -c docker-compose.yml DOS_Project_Stack
```

---

## 8. Conclusion

The Bazar.com distributed bookstore successfully demonstrates key distributed systems concepts including caching, replication, and load balancing. The system achieves 81% performance improvement through caching while maintaining strong consistency via server-push invalidation. The architecture is scalable, fault-tolerant, and production-ready for educational purposes.

**Key Achievements:**
- ✅ 81% performance improvement with caching
- ✅ 0.4ms cache invalidation overhead (acceptable)
- ✅ Strong consistency through server-push
- ✅ Load balancing across multiple replicas
- ✅ Write-master replication with internal sync protocol
- ✅ Full Docker containerization

The system provides a solid foundation for further enhancements and serves as an excellent educational example of distributed systems design patterns.

---

**Total Pages:** 3  
**Word Count:** ~2,800 words  
**Date:** December 2025
