# ProFile Backend Services

Backend API for the ProFile system - Professional resume and portfolio management platform.

## Technology Stack

- **Framework**: NestJS (Node.js 20)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Authentication**: JWT + Passport
- **Validation**: Zod + **@octopus-synapse/profile-contracts** (single source of truth)
- **Email**: SendGrid
- **Storage**: MinIO (S3-compatible)
- **Documentation**: Scalar API Reference (OpenAPI/Swagger)
- **PDF Generation**: Puppeteer
- **Document Processing**: docx
- **Tests**: Jest

## Contract-Driven Development

This service follows a **contract-first approach** using `@octopus-synapse/profile-contracts`:

### Validation Schema Strategy

**✅ DO**: Import validation schemas from contracts
```typescript
import { RegisterSchema, LoginSchema } from '@octopus-synapse/profile-contracts';
```

**❌ DON'T**: Create duplicate Zod schemas
```typescript
// WRONG - creates duplication and drift
const registerSchema = z.object({ ... });
```

### Enforced by CI

The `.github/workflows/validate-contracts.yml` workflow blocks PRs containing:
- Duplicate email/username validation
- Local schema definitions that should use contracts
- Missing contract imports in auth/onboarding modules

### Why This Matters

- **Single Source of Truth**: Validation rules defined once in contracts
- **Zero Drift**: Frontend and backend always use identical validation
- **Type Safety**: Shared TypeScript types across the entire stack
- **Faster Development**: No duplicate maintenance burden

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- SendGrid account for email sending
- MinIO server configured (S3-compatible storage)

## Installation

### Local Development

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd profile-services
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit the .env file with your configurations
```

3. Run Prisma migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Start the development server:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001/api`

### Docker

To run with Docker:

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

Services include:

- **PostgreSQL**: port 5432
- **Redis**: port 6379
- **Backend**: port 3001 (mapped to 8080 on host)

## API Documentation

Interactive documentation is available at:

- **Local**: http://localhost:8080/api/docs
- **Health Check**: http://localhost:8080/api/health

The documentation uses Scalar API Reference with custom dark purple theme.

## Environment Variables

Essential variables (see `.env.example` for complete list):

```bash
# Server
NODE_ENV=production
PORT=3001
ENABLE_SWAGGER=true

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/profile

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_EMAIL_FROM=noreply@profile.app

# MinIO Storage
MINIO_ENDPOINT=http://your-minio-server:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=profile-uploads

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Available Scripts

```bash
# Development
npm run start:dev          # Start in development mode with hot-reload
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build the application
npm run start:prod         # Start compiled version

# Database
npx prisma migrate dev     # Create and apply migrations
npx prisma generate        # Generate Prisma Client
npx prisma studio          # Open Prisma Studio
npx prisma db seed         # Populate database with sample data

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier

# Tests
npm run test               # Unit tests
npm run test:watch         # Tests in watch mode
npm run test:cov           # Tests with coverage
npm run test:e2e           # End-to-end tests
```

## Project Structure

```
profile-services/
├── src/
│   ├── auth/              # JWT authentication and Passport strategies
│   ├── users/             # User management
│   ├── resumes/           # Resume and sections CRUD
│   ├── export/            # PDF/DOCX export
│   ├── upload/            # File upload (MinIO/S3)
│   ├── onboarding/        # Onboarding flow
│   ├── integrations/      # External integrations (GitHub, etc)
│   ├── common/            # Decorators, filters, guards, pipes
│   ├── prisma/            # Prisma service
│   └── main.ts            # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Prisma migrations
│   └── seed.ts           # Seed data
├── test/                  # E2e tests
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Main Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email

### Users

- `GET /api/users/me` - Authenticated user profile
- `PATCH /api/users/me` - Update profile
- `DELETE /api/users/me` - Delete account

### Resumes

- `GET /api/resumes` - List user resumes
- `POST /api/resumes` - Create new resume
- `GET /api/resumes/:id` - Get specific resume
- `PATCH /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### Export

- `POST /api/export/pdf/:resumeId` - Export resume to PDF
- `POST /api/export/docx/:resumeId` - Export resume to DOCX

### Upload

- `POST /api/upload/image` - Profile image upload
- `POST /api/upload/document` - Document upload

### Integrations

- `GET /api/integrations/github/repositories` - Fetch GitHub repositories
- `POST /api/integrations/github/import` - Import GitHub projects

### Health

- `GET /api/health` - Application and services status

## Security

- Helmet.js for HTTP security headers
- Rate limiting (Throttler) per IP
- CORS configured
- Input validation with class-validator
- Data sanitization
- JWT for stateless authentication
- Bcrypt for password hashing (10 rounds)
- Secrets via environment variables

## Testing

```bash
# Run all unit tests
npm run test

# Tests with coverage
npm run test:cov

# E2e tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## Troubleshooting

### PostgreSQL Connection Error

```bash
# Check container status
docker compose ps postgres

# Check logs
docker compose logs postgres

# Check DATABASE_URL
echo $DATABASE_URL
```

### Outdated Prisma Client

```bash
# Regenerate Prisma Client
npx prisma generate
```

### Port in Use

```bash
# Check process on port
lsof -i :3001

# Change port in docker-compose.yml or .env
```

### Container Won't Start

```bash
# Rebuild without cache
docker compose build --no-cache backend

# Check complete logs
docker compose logs backend
```

## License

UNLICENSED - Private project.

## Developer

Developed by [@efpatti](https://github.com/efpatti)
