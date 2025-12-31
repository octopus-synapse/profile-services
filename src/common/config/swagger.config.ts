import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

/**
 * Check if Swagger documentation should be enabled
 */
export function isSwaggerEnabled(): boolean {
  return (
    process.env.ENABLE_SWAGGER === 'true' ||
    (process.env.ENABLE_SWAGGER !== 'false' &&
      process.env.NODE_ENV !== 'production')
  );
}

/**
 * Swagger documentation configuration
 * Single Responsibility: Configure API documentation only
 */
export function configureSwagger(app: INestApplication): void {
  const config = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  app.use(
    '/api/docs',
    apiReference({
      spec: { content: document },
      theme: 'purple',
      darkMode: true,
      metaData: { title: 'ProFile API Documentation' },
      customCss: SCALAR_CUSTOM_CSS,
    }),
  );
}

function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('ProFile API')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0.0')
    .setContact(
      'ProFile Team',
      'https://github.com/your-org/profile',
      'support@profile.app',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(
      `http://localhost:${process.env.PORT ?? 3001}`,
      'Development Server',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token obtained from /api/auth/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(
      'auth',
      'Authentication endpoints - Login, Signup, Password Reset, Email Verification',
    )
    .addTag(
      'users',
      'User profile management - View and update user information',
    )
    .addTag(
      'onboarding',
      'User onboarding flow - Complete profile setup for new users',
    )
    .addTag(
      'resumes',
      'Resume CRUD operations - Create, read, update, and delete resumes with all sections',
    )
    .addTag(
      'upload',
      'File upload endpoints - Upload profile pictures and attachments',
    )
    .addTag('export', 'Export resumes - Generate PDF and DOCX documents')
    .addTag('github', 'GitHub integration - Import projects and contributions')
    .build();
}

const API_DESCRIPTION = `
## ProFile - Resume & Portfolio Management API

ProFile is a comprehensive platform for creating, managing, and exporting professional resumes and portfolios.

### Features
- **Authentication**: JWT-based authentication with email verification and password reset
- **Resume Management**: Full CRUD operations for resumes with multiple sections
- **Rich Content Sections**: Education, Experience, Skills, Projects, Certifications, and more
- **Export Options**: Generate PDF and DOCX documents from resumes
- **File Upload**: Upload profile pictures and attachments via S3-compatible storage
- **User Onboarding**: Guided onboarding flow for new users

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting
- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute

### Error Responses
All errors follow a consistent format:
\`\`\`json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
\`\`\`
`.trim();

const SCALAR_CUSTOM_CSS = `
/* ProFile Dark Purple Theme */
:root {
  --scalar-background-1: #1a1625 !important;
  --scalar-background-2: #252033 !important;
  --scalar-background-3: #3d2e5c !important;
  --scalar-background-accent: #7c3aed !important;

  --scalar-color-1: #e9d5ff !important;
  --scalar-color-2: #c9b3ff !important;
  --scalar-color-3: #a89dc4 !important;
  --scalar-color-accent: #a78bfa !important;

  --scalar-border-color: #4c3a6e !important;

  --scalar-color-green: #8b5cf6 !important;
  --scalar-color-blue: #a855f7 !important;
  --scalar-color-orange: #c084fc !important;
  --scalar-color-red: #ef4444 !important;

  --scalar-button-1: #7c3aed !important;
  --scalar-button-1-hover: #6d28d9 !important;
  --scalar-button-1-color: #ffffff !important;
}

/* Sidebar */
.sidebar { background: #1a1625 !important; border-right: 1px solid #4c3a6e !important; }
.sidebar-search { background: #252033 !important; border: 1px solid #4c3a6e !important; }
.sidebar-search input { color: #e9d5ff !important; }
.sidebar-search input::placeholder { color: #8b7aa8 !important; }

/* Sidebar items */
[class*="sidebar"] a, [class*="sidebar"] button { color: #c9b3ff !important; }
[class*="sidebar"] a:hover, [class*="sidebar"] button:hover { background: #252033 !important; }

/* Method badges */
.scalar-api-reference [data-method="get"] {
  background: #8b5cf6 !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="post"] {
  background: #a855f7 !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="put"],
.scalar-api-reference [data-method="patch"] {
  background: #c084fc !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="delete"] {
  background: #ef4444 !important;
  color: #fff !important;
}

/* Content area */
.scalar-api-reference { background: #1a1625 !important; }
.scalar-card { background: #252033 !important; border-color: #4c3a6e !important; }

/* Code blocks */
pre, code { background: #1e1a2e !important; }

/* Inputs */
input, textarea, select {
  background: #252033 !important;
  border-color: #4c3a6e !important;
  color: #e9d5ff !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1625; }
::-webkit-scrollbar-thumb { background: #4c3a6e; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #6d28d9; }
`;
