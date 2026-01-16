# Runbook: RedisUnavailable

## Alert Details
- **Severity:** Critical
- **Threshold:** Redis down for > 1 minute
- **Impact:** Session management, caching, rate limiting affected

## Symptoms
- User sessions being lost
- Increased database load (cache misses)
- Rate limiting not working
- Slower response times

## Immediate Actions

### 1. Verify Redis Status
```bash
# Check Redis container/pod
docker ps | grep redis
# or
kubectl get pods -l app=redis

# Try connecting directly
redis-cli -h redis -a ${REDIS_PASSWORD} ping
```

### 2. Check Redis Logs
```bash
docker logs profile-redis --tail=100
# or
kubectl logs -l app=redis --tail=100
```

### 3. Check Memory Status
```bash
redis-cli -h redis -a ${REDIS_PASSWORD} INFO memory
```

## Common Causes & Solutions

### Out of Memory
**Symptoms:** Redis killed by OOM, logs show memory errors
**Solution:**
```bash
# Check current memory usage
redis-cli INFO memory | grep used_memory_human

# Clear old keys if emergency
redis-cli FLUSHDB  # Caution: clears all data

# Increase maxmemory
redis-cli CONFIG SET maxmemory 2gb
```

### Connection Refused
**Symptoms:** Cannot connect, no logs
**Solution:**
1. Check if Redis process is running
2. Verify network connectivity
3. Check Redis bind address configuration

### Persistence Issues
**Symptoms:** Redis crashes on startup, AOF/RDB errors
**Solution:**
```bash
# Check persistence files
ls -la /data/*.rdb /data/*.aof

# Repair AOF if corrupted
redis-check-aof --fix /data/appendonly.aof
```

### Max Clients Reached
**Symptoms:** "max number of clients reached" in logs
**Solution:**
```bash
# Check current connections
redis-cli CLIENT LIST | wc -l

# Increase max clients
redis-cli CONFIG SET maxclients 20000

# Kill idle connections
redis-cli CLIENT KILL TYPE normal
```

## Recovery Steps

### Quick Recovery
```bash
# Restart Redis
docker restart profile-redis
# or
kubectl rollout restart deployment/redis
```

### With Data Preservation
```bash
# Trigger RDB snapshot first (if possible)
redis-cli BGSAVE

# Then restart
docker restart profile-redis
```

### Full Recovery
1. Check backup availability
2. Restore from RDB/AOF if needed
3. Warm up cache from database

## Application Resilience

The application should handle Redis failures gracefully:
- Sessions: Fallback to database sessions
- Cache: Bypass cache, hit database directly
- Rate limiting: Disable or use in-memory fallback

## Escalation
- If Redis down > 5 minutes: Page on-call
- If data loss suspected: Initiate data recovery procedure

## Post-Incident
- Review Redis memory configuration
- Check for memory leaks in cache patterns
- Consider Redis Cluster for HA
