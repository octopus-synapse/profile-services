# Runbook: HighErrorRate / ElevatedErrorRate

## Alert Details
- **Severity:** Critical (>1%) / Warning (>0.5%)
- **Threshold:** 5xx error rate exceeds threshold for 2-5 minutes
- **Impact:** Users experiencing failures, potential data inconsistency

## Symptoms
- Increased 5xx responses in API
- User complaints about failed operations
- Error spikes in application logs

## Immediate Actions

### 1. Identify Error Sources
```bash
# Check recent logs for errors
kubectl logs -l app=profile-services --since=10m | grep -i error

# Query Prometheus for error breakdown by endpoint
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum by (route, status) (rate(http_requests_total{status=~"5.."}[5m]))'
```

### 2. Check Application Health
```bash
# Check health endpoint
curl https://api.profile.com/health

# Check dependency health
curl https://api.profile.com/health/dependencies
```

### 3. Review Recent Changes
```bash
# Check recent deployments
kubectl rollout history deployment/profile-services

# Check recent config changes
git log --oneline -10
```

## Common Causes & Solutions

### Database Errors
**Symptoms:** Connection timeouts, query failures
**Investigation:**
```bash
# Check database status
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check for locks
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT * FROM pg_locks WHERE NOT granted;"
```
**Solution:**
- Kill long-running queries
- Scale database if needed
- Review query patterns

### External Service Failures
**Symptoms:** Errors when calling external APIs (SendGrid, MinIO, etc.)
**Investigation:**
```bash
# Check external service status
curl -I https://api.sendgrid.com/v3/

# Review logs for external call failures
kubectl logs -l app=profile-services | grep -E "(sendgrid|minio|external)"
```
**Solution:**
- Enable circuit breaker
- Use fallback behavior
- Contact external service provider

### Memory Pressure
**Symptoms:** Random 500 errors, slow responses before errors
**Investigation:**
```bash
kubectl top pod -l app=profile-services
```
**Solution:**
- Restart pods to clear memory
- Increase memory limits
- Review for memory leaks

### Rate Limiting / Throttling
**Symptoms:** 429 errors, then 500 errors when queue backs up
**Solution:**
- Increase rate limits temporarily
- Scale horizontally
- Implement request queuing

## Recovery Steps

### If Database Related
1. Check and terminate blocking queries
2. Verify connection pool health
3. Consider read replica failover

### If Application Bug
1. Identify failing code path from stack traces
2. Roll back to previous version if recent deployment
3. Apply hotfix if known issue

## Escalation
- If error rate > 5% for > 5 minutes: Page on-call engineer
- If error rate > 10%: Initiate incident response

## Post-Incident
- Collect all relevant logs
- Create detailed incident report
- Add regression tests for the failure case
