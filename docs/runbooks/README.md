# ProFile Services Runbooks

Quick reference guide for responding to production alerts.

## Alert Index

| Alert | Severity | Runbook |
|-------|----------|---------|
| ServiceDown | Critical | [service-down.md](./service-down.md) |
| HighErrorRate | Critical | [high-error-rate.md](./high-error-rate.md) |
| ElevatedErrorRate | Warning | [high-error-rate.md](./high-error-rate.md) |
| HighP95Latency | Critical | [high-latency.md](./high-latency.md) |
| ElevatedP95Latency | Warning | [high-latency.md](./high-latency.md) |
| RedisUnavailable | Critical | [redis-down.md](./redis-down.md) |
| DatabaseConnectionPoolExhausted | Critical | [db-connections.md](./db-connections.md) |
| HighDatabaseConnections | Warning | [db-connections.md](./db-connections.md) |

## Quick Start

1. **Acknowledge the alert** in Slack or PagerDuty
2. **Find the runbook** from the index above
3. **Follow the steps** in the runbook
4. **Escalate if needed** - see [on-call-procedures.md](./on-call-procedures.md)

## On-Call Information

- [On-Call Procedures](./on-call-procedures.md)
- Slack Channel: #profile-alerts
- Escalation: See PagerDuty schedule

## Quick Diagnostic Commands

```bash
# Service health
curl https://api.profile.com/health

# Recent logs
kubectl logs -l app=profile-services --since=10m

# Current pods
kubectl get pods -l app=profile-services

# Database connections
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

## Contributing

When updating runbooks:
1. Test procedures in staging first
2. Include command examples
3. Update this index if adding new runbooks
4. Get review from another engineer
