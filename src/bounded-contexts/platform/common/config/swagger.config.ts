import type { INestApplication } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import {
  SDK_EXPORT_KEY,
  type SdkExportOptions,
} from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';

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
  const document = createSwaggerDocument(app);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ProFile API Documentation',
  });

  SwaggerModule.setup('api/swagger', app, document);
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const operationIdStrategy = buildOperationIdStrategy(app);

  return SwaggerModule.createDocument(app, buildSwaggerConfig(), {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      operationIdStrategy.create(controllerKey, methodKey),
  });
}

type ControllerClass = {
  name: string;
  prototype: Record<string, unknown>;
};

type ControllerWrapper = {
  metatype?: ControllerClass;
};

type ModuleWithControllers = {
  controllers: Map<unknown, ControllerWrapper>;
};

type NestApplicationWithContainer = INestApplication & {
  container: {
    getModules(): Map<unknown, ModuleWithControllers>;
  };
};

type ControllerOperationMetadata = {
  sdkPrefix?: string;
  routeMethodNames: string[];
};

function buildOperationIdStrategy(app: INestApplication) {
  const controllerMetadata = collectControllerMetadata(app);
  const candidateCounts = new Map<string, number>();

  for (const metadata of controllerMetadata.values()) {
    if (!metadata.sdkPrefix) {
      continue;
    }

    for (const routeMethodName of metadata.routeMethodNames) {
      const candidateKey = buildOperationId(metadata.sdkPrefix, routeMethodName);

      candidateCounts.set(candidateKey, (candidateCounts.get(candidateKey) ?? 0) + 1);
    }
  }

  return {
    create(controllerKey: string, methodKey: string): string {
      const normalizedControllerKey = stripControllerSuffix(controllerKey);
      const metadata = controllerMetadata.get(normalizedControllerKey);

      if (metadata?.sdkPrefix) {
        const sdkOperationId = buildOperationId(metadata.sdkPrefix, methodKey);

        if ((candidateCounts.get(sdkOperationId) ?? 0) === 1) {
          return sdkOperationId;
        }
      }

      return buildOperationId(toControllerPrefix(normalizedControllerKey), methodKey);
    },
  };
}

function collectControllerMetadata(
  app: INestApplication,
): Map<string, ControllerOperationMetadata> {
  const modules = (app as NestApplicationWithContainer).container.getModules();
  const controllerMetadata = new Map<string, ControllerOperationMetadata>();

  for (const moduleRef of modules.values()) {
    for (const controllerRef of moduleRef.controllers.values()) {
      const metatype = controllerRef.metatype;

      if (!metatype?.name) {
        continue;
      }

      const controllerKey = stripControllerSuffix(metatype.name);
      const sdkExport = Reflect.getMetadata(SDK_EXPORT_KEY, metatype) as
        | SdkExportOptions
        | undefined;

      controllerMetadata.set(controllerKey, {
        sdkPrefix: sdkExport?.tag ? toSdkPrefix(sdkExport.tag) : undefined,
        routeMethodNames: getRouteMethodNames(metatype),
      });
    }
  }

  return controllerMetadata;
}

function getRouteMethodNames(controller: ControllerClass): string[] {
  return Object.getOwnPropertyNames(controller.prototype).filter((propertyName) => {
    if (propertyName === 'constructor') {
      return false;
    }

    const propertyValue = controller.prototype[propertyName];

    return (
      typeof propertyValue === 'function' &&
      Reflect.getMetadata(METHOD_METADATA, propertyValue) !== undefined
    );
  });
}

function stripControllerSuffix(value: string): string {
  return value.replace(/Controller$/, '');
}

function toControllerPrefix(controllerKey: string): string {
  return controllerKey.charAt(0).toLowerCase() + controllerKey.slice(1);
}

function toSdkPrefix(tag: string): string {
  const segments = tag.split(/[^A-Za-z0-9]+/).filter(Boolean);

  if (segments.length === 0) {
    return tag;
  }

  const [firstSegment, ...remainingSegments] = segments;

  return [
    firstSegment.charAt(0).toLowerCase() + firstSegment.slice(1),
    ...remainingSegments.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)),
  ].join('');
}

function buildOperationId(prefix: string, methodKey: string): string {
  return `${prefix}_${methodKey}`;
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
