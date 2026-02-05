#!/usr/bin/env bun
/**
 * Automatically add @ApiResponse({ type: XxxDto }) to all endpoints
 *
 * Strategy:
 * 1. Analyze each controller method's return value
 * 2. If service method returns a Prisma model, create/use corresponding DTO
 * 3. Add @ApiResponse with proper type to each endpoint
 *
 * Run: bun run scripts/add-api-response-decorators.ts --fix
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'fs';
import { join, dirname, basename, relative } from 'path';

const SRC_DIR = join(import.meta.dir, '../src');
const DRY_RUN = !process.argv.includes('--fix');

interface EndpointAnalysis {
  methodName: string;
  httpMethod: string;
  lineNumber: number;
  hasApiResponseType: boolean;
  serviceMethodCall: string | null;
  inferredType: string | null;
  isArray: boolean;
}

// Known response DTOs mapping (service return -> DTO)
const KNOWN_DTO_MAPPINGS: Record<string, { dto: string; isArray: boolean }> = {
  // Users
  getPublicProfileByUsername: {
    dto: 'PublicProfileResponseDto',
    isArray: false,
  },
  getProfile: { dto: 'UserProfileResponseDto', isArray: false },
  updateProfile: { dto: 'UserProfileResponseDto', isArray: false },
  getPreferences: { dto: 'UserPreferencesResponseDto', isArray: false },
  updatePreferences: { dto: 'UserPreferencesResponseDto', isArray: false },
  getFullPreferences: { dto: 'UserFullPreferencesResponseDto', isArray: false },
  updateFullPreferences: {
    dto: 'UserFullPreferencesResponseDto',
    isArray: false,
  },
  updateUsername: { dto: 'UsernameUpdateResponseDto', isArray: false },
  validateUsername: { dto: 'UsernameValidationResponseDto', isArray: false },
  listUsers: { dto: 'UserListItemDto', isArray: true },
  getUserDetails: { dto: 'UserDetailsResponseDto', isArray: false },
  createUser: { dto: 'UserDetailsResponseDto', isArray: false },
  updateUser: { dto: 'UserDetailsResponseDto', isArray: false },
  deleteUser: { dto: 'DeleteResponseDto', isArray: false },
  changeUserRole: { dto: 'UserDetailsResponseDto', isArray: false },

  // Resumes
  findAllUserResumes: { dto: 'ResumeListItemDto', isArray: true },
  getRemainingSlots: { dto: 'ResumeSlotsResponseDto', isArray: false },
  findResumeByIdForUser: { dto: 'ResumeFullResponseDto', isArray: false },
  createResumeForUser: { dto: 'ResumeResponseDto', isArray: false },
  updateResumeForUser: { dto: 'ResumeResponseDto', isArray: false },
  deleteResumeForUser: { dto: 'DeleteResponseDto', isArray: false },
  listResumesForUser: { dto: 'ResumeListItemDto', isArray: true },
  getResumeDetails: { dto: 'ResumeFullResponseDto', isArray: false },
  deleteResume: { dto: 'DeleteResponseDto', isArray: false },

  // Themes
  getUserThemes: { dto: 'ThemeResponseDto', isArray: true },
  createUserTheme: { dto: 'ThemeResponseDto', isArray: false },
  updateUserTheme: { dto: 'ThemeResponseDto', isArray: false },
  deleteUserTheme: { dto: 'DeleteResponseDto', isArray: false },
  forkTheme: { dto: 'ThemeResponseDto', isArray: false },
  fork: { dto: 'ThemeResponseDto', isArray: false },
  setActiveTheme: { dto: 'ThemeResponseDto', isArray: false },
  getActiveTheme: { dto: 'ThemeResponseDto', isArray: false },
  findAllSystemThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  findAllFeaturedThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  findAllPublicThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  getThemeById: { dto: 'ThemeResponseDto', isArray: false },
  getPendingThemes: { dto: 'ThemeApprovalResponseDto', isArray: true },
  approveTheme: { dto: 'ThemeApprovalResponseDto', isArray: false },
  rejectTheme: { dto: 'ThemeApprovalResponseDto', isArray: false },

  // Analytics
  trackEvent: { dto: 'TrackEventResponseDto', isArray: false },
  getResumeViews: { dto: 'ResumeViewsResponseDto', isArray: false },
  getResumeViewsByPeriod: { dto: 'ResumeViewsByPeriodDto', isArray: false },
  getPopularSections: { dto: 'PopularSectionsResponseDto', isArray: false },
  recordEngagement: { dto: 'EngagementResponseDto', isArray: false },
  getEngagementMetrics: { dto: 'EngagementMetricsResponseDto', isArray: false },
  getEventHistory: { dto: 'EventHistoryResponseDto', isArray: false },
  getGeographicDistribution: {
    dto: 'GeographicDistributionDto',
    isArray: false,
  },
  getDeviceStats: { dto: 'DeviceStatsResponseDto', isArray: false },

  // Collaboration
  inviteCollaborator: { dto: 'CollaboratorResponseDto', isArray: false },
  getCollaborators: { dto: 'CollaboratorResponseDto', isArray: true },
  updateCollaboratorRole: { dto: 'CollaboratorResponseDto', isArray: false },
  removeCollaborator: { dto: 'DeleteResponseDto', isArray: false },
  getSharedWithMe: { dto: 'SharedResumeResponseDto', isArray: true },

  // Chat
  sendMessage: { dto: 'ChatMessageResponseDto', isArray: false },
  getMessages: { dto: 'ChatMessageResponseDto', isArray: true },
  getConversations: { dto: 'ConversationResponseDto', isArray: true },
  getConversation: { dto: 'ConversationDetailResponseDto', isArray: false },
  markAsRead: { dto: 'MarkAsReadResponseDto', isArray: false },
  getUnreadCount: { dto: 'UnreadCountResponseDto', isArray: false },
  blockUser: { dto: 'BlockUserResponseDto', isArray: false },
  unblockUser: { dto: 'DeleteResponseDto', isArray: false },
  getBlockedUsers: { dto: 'BlockedUserResponseDto', isArray: true },
  isBlocked: { dto: 'IsBlockedResponseDto', isArray: false },

  // Onboarding
  startOnboarding: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getStatus: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getOnboardingStatus: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getSteps: { dto: 'OnboardingStepResponseDto', isArray: true },
  completeStep: { dto: 'OnboardingProgressResponseDto', isArray: false },

  // Auth
  register: { dto: 'AuthResponseDto', isArray: false },
  login: { dto: 'AuthResponseDto', isArray: false },
  getCurrentUser: { dto: 'CurrentUserResponseDto', isArray: false },
  forgotPassword: { dto: 'MessageResponseDto', isArray: false },
  resetPassword: { dto: 'MessageResponseDto', isArray: false },
  changePassword: { dto: 'MessageResponseDto', isArray: false },
  requestEmailVerification: { dto: 'MessageResponseDto', isArray: false },
  verifyEmail: { dto: 'MessageResponseDto', isArray: false },
  enable2FA: { dto: 'TwoFactorSetupResponseDto', isArray: false },
  disable2FA: { dto: 'MessageResponseDto', isArray: false },

  // GDPR
  exportUserData: { dto: 'GdprExportResponseDto', isArray: false },
  deleteAccount: { dto: 'DeleteResponseDto', isArray: false },

  // Consent
  acceptConsent: { dto: 'ConsentResponseDto', isArray: false },
  getConsentHistory: { dto: 'ConsentHistoryResponseDto', isArray: true },
  getActiveConsents: { dto: 'ConsentResponseDto', isArray: true },

  // Import
  importFromJson: { dto: 'ImportResultDto', isArray: false },
  importFromFile: { dto: 'ImportJobDto', isArray: false },
  getImportStatus: { dto: 'ImportJobDto', isArray: false },
  getHistory: { dto: 'ImportJobDto', isArray: true },
  getImportHistory: { dto: 'ImportJobDto', isArray: true },
  cancelImport: { dto: 'DeleteResponseDto', isArray: false },
  validateJsonResume: { dto: 'ValidationResultDto', isArray: false },

  // Export
  exportToPdf: { dto: 'ExportResultDto', isArray: false },
  exportToDocx: { dto: 'ExportResultDto', isArray: false },
  exportToImage: { dto: 'ExportResultDto', isArray: false },
  exportResume: { dto: 'ExportResultDto', isArray: false },
  previewBanner: { dto: 'BannerPreviewResponseDto', isArray: false },

  // DSL
  render: { dto: 'DslRenderResponseDto', isArray: false },
  parseDsl: { dto: 'DslParseResponseDto', isArray: false },
  validateDsl: { dto: 'DslValidationResponseDto', isArray: false },
  getSuggestions: { dto: 'DslSuggestionResponseDto', isArray: true },

  // Translation
  healthCheck: { dto: 'HealthCheckResponseDto', isArray: false },
  translateText: { dto: 'TranslationResponseDto', isArray: false },
  translateBatch: { dto: 'BatchTranslationResponseDto', isArray: false },
  translatePtToEn: { dto: 'TranslationResponseDto', isArray: false },
  translateEnToPt: { dto: 'TranslationResponseDto', isArray: false },

  // Skills
  listSkillsForResume: { dto: 'ResumeSkillResponseDto', isArray: true },
  addSkill: { dto: 'ResumeSkillResponseDto', isArray: false },
  updateSkill: { dto: 'ResumeSkillResponseDto', isArray: false },
  deleteSkill: { dto: 'DeleteResponseDto', isArray: false },
  getSkills: { dto: 'TechSkillDto', isArray: true },
  searchSkills: { dto: 'TechSkillDto', isArray: true },
  getSkillById: { dto: 'TechSkillDto', isArray: false },
  getNiches: { dto: 'TechNicheDto', isArray: true },
  searchNiches: { dto: 'TechNicheDto', isArray: true },
  getAreas: { dto: 'TechAreaDto', isArray: true },
  searchAreas: { dto: 'TechAreaDto', isArray: true },

  // Section Config
  saveConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  saveSectionConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  getConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  getSectionConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  resetConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  saveAllConfigs: { dto: 'SectionConfigResponseDto', isArray: true },
  getAllConfigs: { dto: 'SectionConfigResponseDto', isArray: true },

  // MEC
  listInstitutions: { dto: 'MecInstitutionDto', isArray: true },
  getInstitution: { dto: 'MecInstitutionDto', isArray: false },
  searchInstitutions: { dto: 'MecInstitutionDto', isArray: true },
  getInstitutionById: { dto: 'MecInstitutionDto', isArray: false },
  listCourses: { dto: 'MecCourseDto', isArray: true },
  getCourse: { dto: 'MecCourseDto', isArray: false },
  searchCourses: { dto: 'MecCourseDto', isArray: true },
  listAllStateCodes: { dto: 'StateCodeResponseDto', isArray: true },
  listAllKnowledgeAreas: { dto: 'KnowledgeAreaResponseDto', isArray: true },
  getMecStatistics: { dto: 'MecStatisticsResponseDto', isArray: false },
  triggerSync: { dto: 'MecSyncStatusResponseDto', isArray: false },
  getSyncStatus: { dto: 'MecSyncStatusResponseDto', isArray: false },
  getSyncHistory: { dto: 'MecSyncHistoryResponseDto', isArray: true },

  // GitHub
  getAuthUrl: { dto: 'GitHubAuthUrlResponseDto', isArray: false },
  handleCallback: { dto: 'GitHubCallbackResponseDto', isArray: false },
  importGitHubData: { dto: 'GitHubImportResponseDto', isArray: false },
  getConnectionStatus: { dto: 'GitHubConnectionStatusDto', isArray: false },

  // Upload
  uploadFile: { dto: 'FileUploadResponseDto', isArray: false },
  uploadImage: { dto: 'ImageUploadResponseDto', isArray: false },
  deleteFile: { dto: 'DeleteResponseDto', isArray: false },

  // ATS
  validateResume: { dto: 'AtsValidationResponseDto', isArray: false },

  // Platform Stats
  getStatistics: { dto: 'PlatformStatsResponseDto', isArray: false },
};

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.includes('node_modules')) {
          walk(fullPath);
        } else if (stat.isFile() && pattern.test(entry)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walk(dir);
  return results;
}

function extractServiceMethodCall(methodBody: string): string | null {
  // Find this.xxxService.methodName pattern
  const match = methodBody.match(/this\.\w+Service\.(\w+)\(/);
  return match ? match[1] : null;
}

function analyzeControllerEndpoints(filePath: string): EndpointAnalysis[] {
  const content = readFileSync(filePath, 'utf-8');

  if (!content.includes('@SdkExport')) {
    return [];
  }

  const endpoints: EndpointAnalysis[] = [];
  const lines = content.split('\n');
  const httpMethods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const method of httpMethods) {
      if (line.includes(`@${method}(`)) {
        let hasApiResponseType = false;
        let serviceMethodCall: string | null = null;
        let methodName = 'unknown';

        // Look backward for @ApiResponse with type
        for (let j = i; j >= Math.max(0, i - 10); j--) {
          if (lines[j].includes('@ApiResponse') && lines[j].includes('type:')) {
            hasApiResponseType = true;
            break;
          }
        }

        // Look forward for method definition and body
        let methodBodyStart = -1;
        let braceCount = 0;
        let methodBody = '';

        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
          const checkLine = lines[j];

          // Look forward for @ApiResponse
          if (
            checkLine.includes('@ApiResponse') &&
            checkLine.includes('type:')
          ) {
            hasApiResponseType = true;
          }

          // Find method name
          const methodMatch = checkLine.match(/async\s+(\w+)\s*\(/);
          if (methodMatch) {
            methodName = methodMatch[1];
            methodBodyStart = j;
          }

          // Track method body
          if (methodBodyStart > -1) {
            methodBody += checkLine + '\n';
            braceCount += (checkLine.match(/{/g) || []).length;
            braceCount -= (checkLine.match(/}/g) || []).length;

            if (braceCount === 0 && methodBody.includes('{')) {
              break;
            }
          }
        }

        // Extract service method call
        serviceMethodCall = extractServiceMethodCall(methodBody);

        // Infer type from known mappings
        const mapping = serviceMethodCall
          ? KNOWN_DTO_MAPPINGS[serviceMethodCall]
          : null;

        endpoints.push({
          methodName,
          httpMethod: method,
          lineNumber: i + 1,
          hasApiResponseType,
          serviceMethodCall,
          inferredType: mapping?.dto || null,
          isArray: mapping?.isArray || false,
        });
      }
    }
  }

  return endpoints;
}

function addApiResponseToController(
  filePath: string,
  endpoints: EndpointAnalysis[],
): string {
  let content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const endpointsToFix = endpoints.filter(
    (e) => !e.hasApiResponseType && e.inferredType,
  );

  if (endpointsToFix.length === 0) {
    return content;
  }

  // Collect required imports
  const requiredDtos = new Set<string>();
  for (const endpoint of endpointsToFix) {
    if (endpoint.inferredType) {
      requiredDtos.add(endpoint.inferredType);
    }
  }

  // Sort endpoints by line number (descending) to avoid line number shifts
  endpointsToFix.sort((a, b) => b.lineNumber - a.lineNumber);

  // Add @ApiResponse decorators
  for (const endpoint of endpointsToFix) {
    const lineIndex = endpoint.lineNumber - 1;
    const line = lines[lineIndex];

    // Find the indentation
    const indent = line.match(/^(\s*)/)?.[1] || '  ';

    // Build the ApiResponse decorator
    const typeExpr = endpoint.isArray
      ? `type: [${endpoint.inferredType}]`
      : `type: ${endpoint.inferredType}`;

    const successStatus = endpoint.httpMethod === 'Post' ? 201 : 200;
    const newDecorator = `${indent}@ApiResponse({ status: ${successStatus}, ${typeExpr} })`;

    // Find @ApiOperation line above this endpoint
    let insertIndex = lineIndex;
    for (let j = lineIndex - 1; j >= Math.max(0, lineIndex - 10); j--) {
      if (lines[j].includes('@ApiOperation')) {
        insertIndex = j + 1;
        break;
      }
    }

    // Insert the new decorator
    lines.splice(insertIndex, 0, newDecorator);
  }

  return lines.join('\n');
}

async function main() {
  console.log(
    `🔍 Analyzing controllers for @ApiResponse types... ${DRY_RUN ? '(DRY RUN)' : ''}\n`,
  );

  const controllerFiles = findFiles(SRC_DIR, /\.controller\.ts$/);
  let totalFixed = 0;
  let totalMissing = 0;

  for (const file of controllerFiles) {
    const endpoints = analyzeControllerEndpoints(file);
    if (endpoints.length === 0) continue;

    const needsFix = endpoints.filter((e) => !e.hasApiResponseType);
    const canFix = needsFix.filter((e) => e.inferredType);

    if (needsFix.length > 0) {
      const relativePath = relative(SRC_DIR, file);
      console.log(`\n📁 ${relativePath}`);

      for (const endpoint of needsFix) {
        const status = endpoint.inferredType ? '✅ Can fix' : '❓ Unknown';
        const typeInfo = endpoint.inferredType
          ? ` → ${endpoint.inferredType}${endpoint.isArray ? '[]' : ''}`
          : '';
        console.log(
          `   ${status}: ${endpoint.httpMethod} ${endpoint.methodName}${typeInfo}`,
        );
      }

      totalMissing += needsFix.length;

      if (!DRY_RUN && canFix.length > 0) {
        const updated = addApiResponseToController(file, endpoints);
        writeFileSync(file, updated, 'utf-8');
        totalFixed += canFix.length;
        console.log(`   💾 Fixed ${canFix.length} endpoints`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 Summary:`);
  console.log(`   Endpoints missing @ApiResponse: ${totalMissing}`);
  console.log(`   Endpoints fixed: ${totalFixed}`);

  if (DRY_RUN) {
    console.log(`\n💡 Run with --fix to apply changes`);
  }

  // Now list DTOs that need to be created
  const requiredDtos = new Set<string>();
  for (const mapping of Object.values(KNOWN_DTO_MAPPINGS)) {
    requiredDtos.add(mapping.dto);
  }

  console.log(`\n📋 Response DTOs to create: ${requiredDtos.size}`);
  console.log([...requiredDtos].sort().join('\n'));
}

main().catch(console.error);
