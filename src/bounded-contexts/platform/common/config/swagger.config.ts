import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Check if Swagger documentation should be enabled
 */
export function isSwaggerEnabled(): boolean {
  return (
    process.env.ENABLE_SWAGGER === 'true' ||
    (process.env.ENABLE_SWAGGER !== 'false' && process.env.NODE_ENV !== 'production')
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
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ProFile API Documentation',
  });

  SwaggerModule.setup('api/swagger', app, document);
}

function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('ProFile API')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0.0')
    .setContact('ProFile Team', 'https://github.com/your-org/profile', 'support@profile.app')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(`http://localhost:${process.env.PORT ?? 3001}`, 'Development Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /api/auth/login',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints - Login, Signup, Password Reset, Email Verification')
    .addTag('users', 'User profile management - View and update user information')
    .addTag('onboarding', 'User onboarding flow - Complete profile setup for new users')
    .addTag(
      'resumes',
      'Resume CRUD operations - Create, read, update, and delete resumes with all sections',
    )
    .addTag('upload', 'File upload endpoints - Upload profile pictures and attachments')
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
