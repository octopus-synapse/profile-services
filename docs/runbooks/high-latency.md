# Runbook: HighP95Latency / ElevatedP95Latency

## Alert Details
- **Severity:** Critical (>2s) / Warning (>1s)
- **Threshold:** 95th percentile response time exceeds threshold
- **Impact:** Poor user experience, potential timeouts

## Symptoms
- Slow page loads
- API requests timing out
- User complaints about performance

## Immediate Actions

### 1. Identify Slow Endpoints
```bash
# Query Prometheus for latency by endpoint
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket[5m])))'

# Check application logs for slow queries
kubectl logs -l app=profile-services | grep -E "slow|timeout|duration"
```

### 2. Check System Resources
```bash
# CPU and memory usage
kubectl top pods -l app=profile-services

# Node resources
kubectl top nodes
```

### 3. Check Dependencies
```bash
# Database query performance
kubectl exec -it postgres-pod -- psql -U postgres -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Redis latency
redis-cli --latency -h redis
```

## Common Causes & Solutions

### Database Slow Queries
**Symptoms:** High latency on data-heavy endpoints
**Investigation:**
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY total_exec_time DESC
LIMIT 20;

-- Check for missing indexes
SELECT relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;
```
**Solution:**
- Add missing indexes
- Optimize slow queries
- Consider query caching

### N+1 Query Problem
**Symptoms:** Multiple database queries per request
**Solution:**
- Implement eager loading
- Use DataLoader pattern
- Add query batching

### Network Latency
**Symptoms:** All endpoints slow, not specific to data operations
**Investigation:**
```bash
# Check network latency between services
kubectl exec -it profile-pod -- ping -c 5 postgres
kubectl exec -it profile-pod -- ping -c 5 redis
```
**Solution:**
- Check network policies
- Verify service mesh configuration
- Consider co-locating services

### Resource Contention
**Symptoms:** Sporadic slowdowns, high CPU usage
**Solution:**
```bash
# Scale horizontally
kubectl scale deployment profile-services --replicas=5

# Increase resource limits
kubectl set resources deployment profile-services --limits=cpu=2000m,memory=2Gi
```

### External API Slowness
**Symptoms:** Latency correlates with external calls
**Solution:**
- Add timeouts to external calls
- Implement caching for external data
- Use async processing for non-critical operations

## Recovery Steps

1. **Quick Win:** Restart pods to clear any memory issues
   ```bash
   kubectl rollout restart deployment/profile-services
   ```

2. **Scale Out:** Add more replicas
   ```bash
   kubectl scale deployment profile-services --replicas=+2
   ```

3. **Enable Query Caching:** If database-related

4. **Disable Non-Critical Features:** Reduce load temporarily

## Escalation
- If P95 > 5s for > 5 minutes: Page on-call engineer
- If affecting business-critical endpoints: Initiate incident

## Post-Incident
- Profile slow endpoints
- Add performance regression tests
- Update capacity planning
