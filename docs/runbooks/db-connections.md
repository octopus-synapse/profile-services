# Runbook: DatabaseConnectionPoolExhausted / HighDatabaseConnections

## Alert Details
- **Severity:** Critical (>90%) / Warning (>70%)
- **Threshold:** Connection pool usage exceeds threshold
- **Impact:** New requests may fail, service degradation

## Symptoms
- "too many connections" errors in logs
- Requests timing out waiting for connection
- Intermittent 500 errors

## Immediate Actions

### 1. Check Current Connections
```bash
# Connect to PostgreSQL and check active connections
kubectl exec -it postgres-pod -- psql -U postgres -c \
  "SELECT count(*) as total, state FROM pg_stat_activity GROUP BY state;"

# Check connections by application
kubectl exec -it postgres-pod -- psql -U postgres -c \
  "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name ORDER BY count DESC;"
```

### 2. Identify Connection Leaks
```bash
# Find long-running idle connections
kubectl exec -it postgres-pod -- psql -U postgres -c \
  "SELECT pid, usename, application_name, state, query_start, state_change
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < now() - interval '10 minutes'
   ORDER BY state_change;"
```

### 3. Check Application Pool Settings
```bash
# Review Prisma connection pool settings
grep -r "connection_limit" ./prisma/
grep -r "pool" .env
```

## Common Causes & Solutions

### Connection Leaks
**Symptoms:** Idle connections growing over time
**Investigation:**
```sql
-- Find idle connections older than 10 minutes
SELECT pid, usename, query_start, state, query
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '10 minutes';
```
**Solution:**
- Ensure Prisma disconnect on app shutdown
- Add connection timeout settings
- Implement connection health checks

### Too Many Application Instances
**Symptoms:** Each pod has its own pool, total exceeds max
**Solution:**
```bash
# Calculate: pods * pool_size < max_connections
# If 5 pods with pool_size=20 = 100 connections needed

# Option 1: Reduce pool size per instance
# DATABASE_URL="...?connection_limit=10"

# Option 2: Use PgBouncer for connection pooling
```

### Slow Queries Holding Connections
**Symptoms:** Active queries taking too long
**Investigation:**
```sql
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;
```
**Solution:**
```sql
-- Kill specific query
SELECT pg_terminate_backend(pid);

-- Set statement timeout
ALTER DATABASE profile_dev SET statement_timeout = '30s';
```

### Transaction Not Committed
**Symptoms:** "idle in transaction" connections
**Investigation:**
```sql
SELECT pid, usename, state, query
FROM pg_stat_activity
WHERE state = 'idle in transaction';
```
**Solution:**
- Find code that opens transactions without committing
- Add transaction timeouts
- Review Prisma transaction usage

## Recovery Steps

### Emergency: Kill Idle Connections
```sql
-- Kill all idle connections older than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '5 minutes'
AND pid <> pg_backend_pid();
```

### Restart Application Pools
```bash
# Rolling restart of application pods
kubectl rollout restart deployment/profile-services
```

### Increase Connection Limit (Temporary)
```sql
-- Requires superuser and restart
ALTER SYSTEM SET max_connections = 200;
-- Then restart PostgreSQL
```

## Prevention

### Prisma Configuration
```
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10"
```

### PgBouncer (Recommended for Production)
- Centralizes connection pooling
- Reduces per-pod connection needs
- Provides connection queuing

## Escalation
- If connections > 95%: Page on-call immediately
- If service is failing: Consider emergency restart

## Post-Incident
- Review connection pool settings
- Consider implementing PgBouncer
- Add connection usage to capacity planning
