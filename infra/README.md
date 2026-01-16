# Infrastructure Configuration

This directory contains infrastructure configuration for ProFile Services.

## Structure

```
infra/
├── alerting/
│   └── alertmanager.yml    # AlertManager configuration
├── prometheus/
│   ├── prometheus.yml      # Prometheus configuration
│   └── alerts.yml          # Alert rules
└── README.md
```

## Observability Stack

### Quick Start

```bash
# Start dev environment with observability
docker-compose -f docker-compose.dev.yml -f docker-compose.observability.yml up -d
```

### Services

| Service | Port | URL |
|---------|------|-----|
| Prometheus | 9090 | http://localhost:9090 |
| AlertManager | 9093 | http://localhost:9093 |
| Grafana | 3000 | http://localhost:3000 |

### Environment Variables

Configure these in your `.env` file:

```env
# Slack integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# PagerDuty integration (optional)
PAGERDUTY_SERVICE_KEY=your-service-key

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=your-secure-password
```

## Alert Configuration

### Critical Thresholds

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error Rate | > 1% | HighErrorRate |
| P95 Latency | > 2s | HighP95Latency |
| Export Queue | > 100 | HighExportQueueDepth |
| DB Connections | > 90% | DatabaseConnectionPoolExhausted |
| Redis | Down | RedisUnavailable |

### Adding New Alerts

1. Add rule to `prometheus/alerts.yml`
2. Create runbook in `docs/runbooks/`
3. Test alert firing in staging
4. Update AlertManager routes if needed

## Testing Alerts

### Verify Configuration

```bash
# Check Prometheus config
docker exec profile-prometheus promtool check config /etc/prometheus/prometheus.yml

# Check alert rules
docker exec profile-prometheus promtool check rules /etc/prometheus/alerts.yml

# Check AlertManager config
docker exec profile-alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

### Trigger Test Alert

```bash
# Send test alert to AlertManager
curl -H "Content-Type: application/json" -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "service": "profile-services"
    },
    "annotations": {
      "summary": "This is a test alert",
      "description": "Testing alert delivery"
    }
  }
]' http://localhost:9093/api/v2/alerts
```

## Maintenance

### Prometheus Data Retention

Default retention is 15 days. Adjust in `docker-compose.observability.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

### Silencing Alerts

Use AlertManager UI at http://localhost:9093/#/silences or:

```bash
amtool silence add alertname=TestAlert --duration=2h --comment="Maintenance window"
```
