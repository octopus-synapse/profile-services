# Runbook: ServiceDown

## Alert Details
- **Severity:** Critical
- **Threshold:** Service unreachable for > 1 minute
- **Impact:** Complete service outage - users cannot access the platform

## Symptoms
- HTTP requests to the service return connection errors
- Health check endpoint (`/health`) not responding
- Prometheus `up{job="profile-services"}` metric is 0

## Immediate Actions

### 1. Verify the Alert
```bash
# Check if service is responding
curl -I https://api.profile.com/health

# Check service status in Kubernetes/Docker
kubectl get pods -l app=profile-services
# or
docker ps | grep profile
```

### 2. Check Container/Pod Status
```bash
# Kubernetes
kubectl describe pod <pod-name>
kubectl logs <pod-name> --tail=100

# Docker
docker logs profile-backend --tail=100
```

### 3. Check Dependencies
```bash
# Database connectivity
kubectl exec -it <pod-name> -- nc -zv postgres 5432

# Redis connectivity
kubectl exec -it <pod-name> -- nc -zv redis 6379
```

## Common Causes & Solutions

### Out of Memory (OOMKilled)
**Cause:** Container exceeded memory limits
**Solution:**
```bash
# Check memory usage
kubectl top pod <pod-name>

# Increase memory limits if needed
kubectl edit deployment profile-services
# Modify: resources.limits.memory
```

### Database Connection Failure
**Cause:** PostgreSQL unavailable or connection refused
**Solution:**
1. Check PostgreSQL status
2. Verify DATABASE_URL environment variable
3. Check connection pool settings

### Crash Loop
**Cause:** Application crashing on startup
**Solution:**
1. Check logs for stack traces
2. Verify all required environment variables
3. Check for recent deployments that may have caused issues

### Node Failure
**Cause:** Kubernetes node is unhealthy
**Solution:**
```bash
kubectl get nodes
kubectl describe node <node-name>
```

## Escalation

If the issue persists after 15 minutes:
1. Page the on-call SRE team
2. Consider rolling back recent deployments
3. Enable incident response channel in Slack

## Post-Incident
- Create incident report
- Update this runbook if new failure modes discovered
- Review monitoring gaps
