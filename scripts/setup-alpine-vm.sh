#!/bin/sh
# ==================================
# Alpine Linux VM Setup Script
# ==================================
# This script prepares an Alpine Linux VM for running the ProFile Backend
# Run as root or with sudo privileges

set -e

echo "=================================="
echo "ProFile Backend - Alpine Linux VM Setup"
echo "=================================="

# ==================================
# Update system
# ==================================
echo "Updating system packages..."
apk update
apk upgrade

# ==================================
# Install Docker
# ==================================
echo "Installing Docker..."
apk add docker docker-cli-compose

# Start and enable Docker
rc-update add docker boot
service docker start

# Verify Docker installation
docker --version
docker compose version

# ==================================
# Install required packages
# ==================================
echo "Installing additional packages..."
apk add \
    curl \
    git \
    bash \
    openssh \
    openssl \
    ca-certificates

# ==================================
# Create deployment user
# ==================================
echo "Setting up deployment user..."
DEPLOY_USER="${DEPLOY_USER:-deploy}"

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
    adduser -D -s /bin/bash "$DEPLOY_USER"
    addgroup "$DEPLOY_USER" docker
    echo "User $DEPLOY_USER created and added to docker group"
else
    echo "User $DEPLOY_USER already exists"
    addgroup "$DEPLOY_USER" docker 2>/dev/null || true
fi

# ==================================
# Create deployment directory
# ==================================
DEPLOY_PATH="${DEPLOY_PATH:-/opt/profile-services}"
echo "Creating deployment directory: $DEPLOY_PATH"

mkdir -p "$DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH/logs"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"
chmod 755 "$DEPLOY_PATH"

# ==================================
# Setup SSH for deployments
# ==================================
echo "Configuring SSH for deployments..."

# Create .ssh directory for deploy user
DEPLOY_HOME="/home/$DEPLOY_USER"
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
touch "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_HOME/.ssh"

echo ""
echo "Add your deployment SSH public key to: $DEPLOY_HOME/.ssh/authorized_keys"
echo "Example:"
echo "  echo 'ssh-rsa YOUR_PUBLIC_KEY' >> $DEPLOY_HOME/.ssh/authorized_keys"
echo ""

# ==================================
# Configure firewall (optional)
# ==================================
echo "Installing and configuring firewall..."
apk add iptables ip6tables

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow application ports
BACKEND_PORT="${BACKEND_PORT:-3001}"
iptables -A INPUT -p tcp --dport "$BACKEND_PORT" -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Save iptables rules
/etc/init.d/iptables save
rc-update add iptables

# ==================================
# Setup log rotation
# ==================================
echo "Setting up log rotation..."
apk add logrotate

cat > /etc/logrotate.d/profile-backend <<'EOF'
/opt/profile-services/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        docker-compose -f /opt/profile-services/docker-compose.yml restart backend >/dev/null 2>&1 || true
    endscript
}
EOF

# ==================================
# Setup Docker daemon
# ==================================
echo "Configuring Docker daemon..."
mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF

service docker restart

# ==================================
# Setup systemd-like service (OpenRC)
# ==================================
echo "Creating OpenRC service..."

cat > /etc/init.d/profile-backend <<'EOF'
#!/sbin/openrc-run

name="profile-backend"
description="ProFile Backend Service"

DEPLOY_PATH="${DEPLOY_PATH:-/opt/profile-services}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

depend() {
    need docker
    after docker
}

start() {
    ebegin "Starting ProFile Backend"
    cd "$DEPLOY_PATH"
    su -c "docker compose up -d" - "$DEPLOY_USER"
    eend $?
}

stop() {
    ebegin "Stopping ProFile Backend"
    cd "$DEPLOY_PATH"
    su -c "docker compose down" - "$DEPLOY_USER"
    eend $?
}

restart() {
    ebegin "Restarting ProFile Backend"
    cd "$DEPLOY_PATH"
    su -c "docker compose restart" - "$DEPLOY_USER"
    eend $?
}

status() {
    cd "$DEPLOY_PATH"
    su -c "docker compose ps" - "$DEPLOY_USER"
}
EOF

chmod +x /etc/init.d/profile-backend

echo ""
echo "To enable the service at boot:"
echo "  rc-update add profile-backend default"
echo ""

# ==================================
# Setup monitoring (optional)
# ==================================
echo "Setting up basic monitoring..."

# Install htop for monitoring
apk add htop

# Create a simple health check script
cat > "$DEPLOY_PATH/healthcheck.sh" <<'EOF'
#!/bin/sh
BACKEND_PORT="${BACKEND_PORT:-3001}"
HEALTH_URL="http://localhost:${BACKEND_PORT}/api/health"

if curl -f "$HEALTH_URL" >/dev/null 2>&1; then
    echo "✓ Backend is healthy"
    exit 0
else
    echo "✗ Backend health check failed"
    exit 1
fi
EOF

chmod +x "$DEPLOY_PATH/healthcheck.sh"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH/healthcheck.sh"

# ==================================
# Create useful aliases
# ==================================
echo "Creating useful aliases..."

cat >> "$DEPLOY_HOME/.bashrc" <<'EOF'

# ProFile Backend aliases
alias profile-logs='cd /opt/profile-services && docker compose logs -f'
alias profile-status='cd /opt/profile-services && docker compose ps'
alias profile-restart='cd /opt/profile-services && docker compose restart'
alias profile-health='/opt/profile-services/healthcheck.sh'
EOF

chown "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_HOME/.bashrc"

# ==================================
# Display summary
# ==================================
echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Deployment directory: $DEPLOY_PATH"
echo "Deployment user: $DEPLOY_USER"
echo "Backend port: ${BACKEND_PORT:-3001}"
echo ""
echo "Next steps:"
echo "1. Add your SSH public key to: $DEPLOY_HOME/.ssh/authorized_keys"
echo "2. Configure GitHub repository secrets (see SECRETS.md)"
echo "3. Push code to trigger deployment"
echo ""
echo "Useful commands:"
echo "  - Check service status: profile-status"
echo "  - View logs: profile-logs"
echo "  - Health check: profile-health"
echo "  - Restart service: profile-restart"
echo ""
echo "Service management:"
echo "  - Start: rc-service profile-backend start"
echo "  - Stop: rc-service profile-backend stop"
echo "  - Enable at boot: rc-update add profile-backend default"
echo ""
