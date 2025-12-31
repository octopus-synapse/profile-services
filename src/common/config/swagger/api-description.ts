/**
 * API Description for Swagger Documentation
 * Single Responsibility: API description text only
 */

export const API_DESCRIPTION = `
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
