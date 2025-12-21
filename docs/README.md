# Documentation Directory - Bazar.com Part 2

This directory contains all required documentation for Project Part 2 submission.

## Contents

### 1. Design Document
**File:** `DESIGN-DOCUMENT.md` (3 pages)

Complete design documentation including:
- System architecture and components
- How the system works (request flow, caching, replication)
- Design tradeoffs and rationale
- Possible improvements and extensions
- How to run the program (step-by-step instructions)

### 2. Performance Results
**File:** `PERFORMANCE-RESULTS.md`

Detailed performance measurements and experiments:
- Experiment 1: Cache MISS vs Cache HIT (20 iterations each)
- Experiment 2: Cache invalidation overhead (5 iterations)
- Experiment 3: Post-invalidation request latency
- Performance comparison tables
- Statistical analysis (average, min, max, std dev)
- Graphs and visualizations
- Conclusions and recommendations

**Key Results:**
- **81.13% performance improvement** from caching
- **0.5ms average cache HIT** time
- **2.65ms average cache MISS** time
- **0.4ms cache invalidation overhead**

### 3. Program Output
**File:** `program-output.txt`

Complete output from running the program showing:
- Service deployment status (Docker Swarm)
- New books verification (Books #9, #10, #11)
- Caching demonstration (MISS and HIT)
- Frontend service logs (cache operations)
- Catalog service logs (database seeding, replication)
- Load balancing verification
- Performance experiment results
- Requirement verification checklist

### 4. Performance Data
**File:** `performance-data.csv`

Raw experimental data in CSV format:
- Iteration numbers
- Cache MISS response times (20 measurements)
- Cache HIT response times (20 measurements)
- Used for statistical analysis and graphs

### 5. Performance Summary
**File:** `performance-summary.txt`

Quick summary of performance experiments:
- Cache MISS statistics
- Cache HIT statistics
- Invalidation overhead statistics
- Performance improvement percentage
- Key conclusions

## How to Use This Documentation

### For Grading/Evaluation:

1. **Start with Design Document** (`DESIGN-DOCUMENT.md`)
   - Understand system architecture
   - Learn how to run the program
   - Review design decisions

2. **Review Performance Results** (`PERFORMANCE-RESULTS.md`)
   - See detailed experiments
   - Analyze performance tables
   - Review graphs and conclusions

3. **Check Program Output** (`program-output.txt`)
   - Verify all requirements met
   - See actual system behavior
   - Confirm experiments ran correctly

4. **Examine Raw Data** (optional)
   - `performance-data.csv` - Raw measurements
   - `performance-summary.txt` - Quick stats

### For Running the System:

See Section 7 "How to Run the Program" in `DESIGN-DOCUMENT.md` for complete instructions.

Quick start:
```powershell
docker swarm init
docker build -t catalog-service --target catalog-service-production .
docker build -t frontend-service --target frontend-service-production .
docker build -t order-service --target order-service-production .
docker stack deploy -c docker-compose.yml DOS_Project_Stack
```

### For Replicating Experiments:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-performance-experiments.ps1
```

This will generate fresh results matching the data in this directory.

## Requirements Coverage

This documentation satisfies all submission requirements:

✅ **Design Document (2-3 pages)**
   - Overall program design
   - How it works
   - Design tradeoffs
   - Possible improvements
   - How to run instructions

✅ **Program Output**
   - Complete output for all parts
   - Service deployment
   - New books verification
   - Caching demonstration
   - Performance experiments

✅ **Performance Measurements**
   - Average response time with/without caching
   - Cache invalidation overhead experiments
   - Consistency operation costs
   - Subsequent request latency
   - Results in tables and graphs

✅ **Statistical Analysis**
   - Average, min, max, standard deviation
   - 20+ iterations for reliability
   - Formal experimental methodology

## File Sizes

- DESIGN-DOCUMENT.md: ~15 KB (2,800 words)
- PERFORMANCE-RESULTS.md: ~12 KB (detailed experiments)
- program-output.txt: ~8 KB (complete system output)
- performance-data.csv: ~1 KB (raw data)
- performance-summary.txt: ~1 KB (quick stats)

**Total:** ~37 KB of comprehensive documentation

## Questions?

All documentation is self-contained and includes:
- Step-by-step instructions
- Expected outputs
- Troubleshooting guides
- Complete API reference

For system access: http://localhost:8083 (after deployment)

---

**Submission Ready:** All required documents present and complete ✓
