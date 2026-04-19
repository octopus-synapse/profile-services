.PHONY: help dev prod build up down logs clean restart status

DOCKER_COMPOSE ?= docker compose

# Default target
help:
	@echo "Profile Application - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start development environment"
	@echo "  make dev-build        - Build and start development environment"
	@echo "  make dev-down         - Stop development environment"
	@echo "  make dev-logs         - Show development logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod             - Start production environment"
	@echo "  make prod-build       - Build and start production environment"
	@echo "  make prod-down        - Stop production environment"
	@echo "  make prod-logs        - Show production logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate       - Run Prisma migrations"
	@echo "  make db-studio        - Open Prisma Studio"
	@echo "  make db-seed          - Seed database"
	@echo "  make db-backup        - Backup database"
	@echo "  make db-restore       - Restore database from backup"
	@echo ""
	@echo "Services:"
	@echo "  make backend-shell    - Open shell in backend container"
	@echo "  make frontend-shell   - Open shell in frontend container"
	@echo "  make postgres-shell   - Open PostgreSQL shell"
	@echo "  make redis-shell      - Open Redis CLI"
	@echo ""
	@echo "Utility:"
	@echo "  make status           - Show containers status"
	@echo "  make logs             - Show all logs"
	@echo "  make restart          - Restart all containers"
	@echo "  make clean            - Remove containers and volumes"
	@echo "  make clean-all        - Remove everything (containers, volumes, images)"

# ==========================================
# Development Environment
# ==========================================
dev:
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d

dev-build:
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d --build

dev-down:
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down

dev-logs:
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f

# ==========================================
# Production Environment
# ==========================================
prod:
	$(DOCKER_COMPOSE) up -d

prod-build:
	$(DOCKER_COMPOSE) up -d --build

prod-down:
	$(DOCKER_COMPOSE) down

prod-logs:
	$(DOCKER_COMPOSE) logs -f

# ==========================================
# Database Commands
# ==========================================
db-migrate:
	$(DOCKER_COMPOSE) exec frontend bunx prisma migrate dev

db-migrate-deploy:
	$(DOCKER_COMPOSE) exec frontend bunx prisma migrate deploy

db-studio:
	$(DOCKER_COMPOSE) exec frontend bunx prisma studio

db-seed:
	$(DOCKER_COMPOSE) exec frontend bunx prisma db seed

db-backup:
	@echo "Creating database backup..."
	$(DOCKER_COMPOSE) exec postgres pg_dump -U postgres profile > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully!"

db-restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup file path: " backup_file; \
	$(DOCKER_COMPOSE) exec -T postgres psql -U postgres profile < $$backup_file
	@echo "Database restored successfully!"

# ==========================================
# Shell Access
# ==========================================
backend-shell:
	$(DOCKER_COMPOSE) exec backend sh

frontend-shell:
	$(DOCKER_COMPOSE) exec frontend sh

postgres-shell:
	$(DOCKER_COMPOSE) exec postgres psql -U postgres -d profile

redis-shell:
	$(DOCKER_COMPOSE) exec redis redis-cli

# ==========================================
# Backend Commands
# ==========================================
backend-test:
	$(DOCKER_COMPOSE) exec backend npm test

backend-lint:
	$(DOCKER_COMPOSE) exec backend bun run lint

backend-build:
	$(DOCKER_COMPOSE) exec backend bun run build

# ==========================================
# Frontend Commands
# ==========================================
frontend-test:
	$(DOCKER_COMPOSE) exec frontend bun test

frontend-lint:
	$(DOCKER_COMPOSE) exec frontend bun run lint

frontend-build:
	$(DOCKER_COMPOSE) exec frontend bun run build

# ==========================================
# Utility Commands
# ==========================================
status:
	$(DOCKER_COMPOSE) ps

logs:
	$(DOCKER_COMPOSE) logs -f

restart:
	$(DOCKER_COMPOSE) restart

clean:
	@echo "WARNING: This will remove all containers and volumes!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) down -v; \
		$(DOCKER_COMPOSE) -f docker-compose.dev.yml down -v; \
		echo "Cleanup completed!"; \
	fi

clean-all:
	@echo "WARNING: This will remove EVERYTHING (containers, volumes, images)!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) down -v --rmi all; \
		$(DOCKER_COMPOSE) -f docker-compose.dev.yml down -v --rmi all; \
		docker system prune -a -f; \
		echo "Complete cleanup done!"; \
	fi

# ==========================================
# Setup Commands
# ==========================================
setup:
	@echo "Setting up the project..."
	cp .env.example .env || true
	cp backend/.env.example backend/.env || true
	cp frontend/.env.example frontend/.env || true
	@echo "Environment files created. Please update them with your values."
	@echo "Run 'make dev-build' to start development environment."

# ==========================================
# Health Checks
# ==========================================
health:
	@echo "Checking services health..."
	@curl -f http://localhost:3001/health || echo "Backend: DOWN"
	@curl -f http://localhost:3000/api/health || echo "Frontend: DOWN"
	@$(DOCKER_COMPOSE) exec postgres pg_isready -U postgres || echo "PostgreSQL: DOWN"
	@$(DOCKER_COMPOSE) exec redis redis-cli ping || echo "Redis: DOWN"
