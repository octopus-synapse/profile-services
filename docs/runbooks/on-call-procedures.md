# On-Call Procedures for ProFile Services

## Overview

This document outlines the procedures for on-call engineers responding to alerts from ProFile Services.

## On-Call Rotation

### Schedule
- **Primary On-Call:** 1 week rotation
- **Secondary On-Call:** Backup for primary
- **Rotation Day:** Monday 10:00 AM UTC

### Responsibilities
1. Respond to all pages within 15 minutes
2. Acknowledge alerts in PagerDuty/Slack
3. Follow runbooks for resolution
4. Escalate if unable to resolve within SLA
5. Create incident reports for P1/P2 incidents

## Alert Response SLAs

| Severity | Response Time | Resolution Target |
|----------|--------------|-------------------|
| Critical | 15 minutes | 1 hour |
| Warning | 1 hour | 4 hours |
| Info | Next business day | Best effort |

## Communication Channels

| Channel | Purpose |
|---------|---------|
| #profile-alerts | Alert notifications |
| #profile-incidents | Active incident coordination |
| #profile-engineering | General engineering discussion |
| PagerDuty | Critical alerts & escalation |

## Incident Severity Levels

### P1 - Critical
- Service completely down
- Data loss or corruption
- Security breach
- All users affected

**Response:** Immediate, all-hands if needed

### P2 - High
- Major feature broken
- Performance severely degraded
- > 25% users affected

**Response:** Within 15 minutes, may need backup

### P3 - Medium
- Minor feature broken
- Performance degraded
- < 25% users affected

**Response:** Within 1 hour

### P4 - Low
- Cosmetic issues
- Minor bugs
- Non-critical warnings

**Response:** Next business day

## Incident Response Steps

### 1. Acknowledge
```
1. Acknowledge alert in PagerDuty/Slack
2. Join #profile-incidents channel
3. Post initial status: "Investigating [ALERT_NAME]"
```

### 2. Assess
```
1. Review alert details and metrics
2. Check recent deployments
3. Identify affected systems
4. Determine severity level
```

### 3. Communicate
```
1. Update status in #profile-incidents
2. If P1/P2, notify stakeholders
3. Update status page if public-facing
```

### 4. Mitigate
```
1. Follow relevant runbook
2. Apply quick fixes if safe
3. Consider rollback for deployment issues
4. Document all actions taken
```

### 5. Resolve
```
1. Verify metrics return to normal
2. Update status: "Resolved"
3. Close alert in monitoring system
4. Schedule follow-up if needed
```

### 6. Post-Incident
```
1. Create incident report for P1/P2
2. Schedule post-mortem if needed
3. Update runbooks with learnings
4. Create tickets for follow-up work
```

## Escalation Path

### Level 1: On-Call Engineer
- First responder
- Follow runbooks
- Escalate if unable to resolve

### Level 2: Secondary On-Call
- Backup for primary
- Additional expertise
- Help with complex issues

### Level 3: Engineering Lead
- Architectural decisions
- Cross-team coordination
- Customer communication

### Level 4: CTO / VP Engineering
- Major outages
- Security incidents
- Business decisions

## Useful Commands

### Quick Diagnostics
```bash
# Check service health
curl -s https://api.profile.com/health | jq

# Recent logs
kubectl logs -l app=profile-services --since=10m | tail -100

# Current metrics
curl -s http://prometheus:9090/api/v1/query?query=up

# Active alerts
curl -s http://alertmanager:9093/api/v2/alerts | jq
```

### Common Fixes
```bash
# Restart service
kubectl rollout restart deployment/profile-services

# Scale up
kubectl scale deployment/profile-services --replicas=5

# Check database connections
kubectl exec -it postgres-pod -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Clear Redis cache
redis-cli FLUSHDB
```

## Handoff Procedure

### End of Shift
1. Document any ongoing issues
2. Update incident tickets
3. Brief incoming on-call
4. Transfer PagerDuty responsibility

### Start of Shift
1. Review recent alerts and incidents
2. Check for any ongoing issues
3. Verify monitoring is working
4. Confirm contact information is current

## Contact Information

| Role | Contact |
|------|---------|
| On-Call Primary | Check PagerDuty schedule |
| On-Call Secondary | Check PagerDuty schedule |
| Engineering Lead | @engineering-lead on Slack |
| DevOps | @devops on Slack |
| Security | security@profile.com |

## Tools Access

Ensure you have access to:
- [ ] PagerDuty account
- [ ] AWS/GCP console
- [ ] Kubernetes cluster
- [ ] Grafana dashboards
- [ ] Database read access
- [ ] Log aggregation system
- [ ] Slack channels

## Training Requirements

Before going on-call:
1. Complete incident response training
2. Review all runbooks
3. Shadow existing on-call for 1 rotation
4. Perform test deployment
5. Participate in incident drill
