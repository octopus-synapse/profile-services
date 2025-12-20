.PHONY: help dev prod build up down logs clean restart status

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
	docker-compose -f docker-compose.dev.yml up -d

dev-build:
	docker-compose -f docker-compose.dev.yml up -d --build

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# ==========================================
# Production Environment
# ==========================================
prod:
	docker-compose up -d

prod-build:
	docker-compose up -d --build

prod-down:
	docker-compose down

prod-logs:
	docker-compose logs -f

# ==========================================
# Database Commands
# ==========================================
db-migrate:
	docker-compose exec frontend npx prisma migrate dev

db-migrate-deploy:
	docker-compose exec frontend npx prisma migrate deploy

db-studio:
	docker-compose exec frontend npx prisma studio

db-seed:
	docker-compose exec frontend npx prisma db seed

db-backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres profile > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully!"

db-restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T postgres psql -U postgres profile < $$backup_file
	@echo "Database restored successfully!"

# ==========================================
# Shell Access
# ==========================================
backend-shell:
	docker-compose exec backend sh

frontend-shell:
	docker-compose exec frontend sh

postgres-shell:
	docker-compose exec postgres psql -U postgres -d profile

redis-shell:
	docker-compose exec redis redis-cli

# ==========================================
# Backend Commands
# ==========================================
backend-test:
	docker-compose exec backend npm test

backend-lint:
	docker-compose exec backend npm run lint

backend-build:
	docker-compose exec backend npm run build

# ==========================================
# Frontend Commands
# ==========================================
frontend-test:
	docker-compose exec frontend npm test

frontend-lint:
	docker-compose exec frontend npm run lint

frontend-build:
	docker-compose exec frontend npm run build

# ==========================================
# Utility Commands
# ==========================================
status:
	docker-compose ps

logs:
	docker-compose logs -f

restart:
	docker-compose restart

clean:
	@echo "WARNING: This will remove all containers and volumes!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose -f docker-compose.dev.yml down -v; \
		echo "Cleanup completed!"; \
	fi

clean-all:
	@echo "WARNING: This will remove EVERYTHING (containers, volumes, images)!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v --rmi all; \
		docker-compose -f docker-compose.dev.yml down -v --rmi all; \
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
	@docker-compose exec postgres pg_isready -U postgres || echo "PostgreSQL: DOWN"
	@docker-compose exec redis redis-cli ping || echo "Redis: DOWN"
