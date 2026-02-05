#!/usr/bin/env bun
/**
 * Apply @ApiResponse({ type: XxxDto }) decorators to all controllers
 *
 * This script:
 * 1. Finds endpoints without @ApiResponse type
 * 2. Matches method calls to known DTOs
 * 3. Adds import for DTOs from @/shared-kernel
 * 4. Adds @ApiResponse decorator after @ApiOperation
 *
 * Run: bun run scripts/apply-api-response-decorators.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(import.meta.dir, '../src');

// Method name to DTO mapping
const METHOD_TO_DTO: Record<string, { dto: string; isArray: boolean }> = {
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
  validateUsernameAvailability: {
    dto: 'UsernameValidationResponseDto',
    isArray: false,
  },
  listUsers: { dto: 'UserListItemDto', isArray: true },
  getUserDetails: { dto: 'UserDetailsResponseDto', isArray: false },
  createUser: { dto: 'UserDetailsResponseDto', isArray: false },
  updateUser: { dto: 'UserDetailsResponseDto', isArray: false },
  deleteUser: { dto: 'DeleteResponseDto', isArray: false },
  changeUserRole: { dto: 'UserDetailsResponseDto', isArray: false },

  // Resumes
  findAllUserResumes: { dto: 'ResumeListItemDto', isArray: true },
  getAllUserResumes: { dto: 'ResumeListItemDto', isArray: true },
  getRemainingSlots: { dto: 'ResumeSlotsResponseDto', isArray: false },
  findResumeByIdForUser: { dto: 'ResumeFullResponseDto', isArray: false },
  getResumeByIdForUser: { dto: 'ResumeFullResponseDto', isArray: false },
  getResumeByIdWithAllSections: {
    dto: 'ResumeFullResponseDto',
    isArray: false,
  },
  createResumeForUser: { dto: 'ResumeResponseDto', isArray: false },
  updateResumeForUser: { dto: 'ResumeResponseDto', isArray: false },
  deleteResumeForUser: { dto: 'DeleteResponseDto', isArray: false },
  listResumesForUser: { dto: 'ResumeListItemDto', isArray: true },
  getResumeDetails: { dto: 'ResumeFullResponseDto', isArray: false },
  deleteResume: { dto: 'DeleteResponseDto', isArray: false },
  findAllSkillsForResume: { dto: 'ResumeSkillResponseDto', isArray: true },
  createBulk: { dto: 'ResumeSkillResponseDto', isArray: true },

  // Themes
  getUserThemes: { dto: 'ThemeResponseDto', isArray: true },
  createUserTheme: { dto: 'ThemeResponseDto', isArray: false },
  updateUserTheme: { dto: 'ThemeResponseDto', isArray: false },
  deleteUserTheme: { dto: 'DeleteResponseDto', isArray: false },
  forkTheme: { dto: 'ThemeResponseDto', isArray: false },
  fork: { dto: 'ThemeResponseDto', isArray: false },
  setActiveTheme: { dto: 'ThemeResponseDto', isArray: false },
  getActiveTheme: { dto: 'ThemeResponseDto', isArray: false },
  getUserTheme: { dto: 'ThemeResponseDto', isArray: false },
  findAllSystemThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  findAllFeaturedThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  findAllPublicThemes: { dto: 'SystemThemeResponseDto', isArray: true },
  getThemeById: { dto: 'ThemeResponseDto', isArray: false },
  getPendingThemes: { dto: 'ThemeApprovalResponseDto', isArray: true },
  approveTheme: { dto: 'ThemeApprovalResponseDto', isArray: false },
  rejectTheme: { dto: 'ThemeApprovalResponseDto', isArray: false },

  // Section Config
  saveSectionConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  getSectionConfig: { dto: 'SectionConfigResponseDto', isArray: false },
  getSectionConfigByType: { dto: 'SectionConfigResponseDto', isArray: false },
  saveSectionLayout: { dto: 'SectionConfigResponseDto', isArray: false },
  batchSaveSectionConfigs: { dto: 'SectionConfigResponseDto', isArray: true },
  resetAllConfigs: { dto: 'SectionConfigResponseDto', isArray: true },

  // Analytics
  trackEvent: { dto: 'TrackEventResponseDto', isArray: false },
  trackView: { dto: 'TrackEventResponseDto', isArray: false },
  getResumeViews: { dto: 'ResumeViewsResponseDto', isArray: false },
  getResumeViewsByPeriod: { dto: 'ResumeViewsByPeriodDto', isArray: true },
  getPopularSections: { dto: 'PopularSectionsResponseDto', isArray: true },
  recordEngagement: { dto: 'EngagementResponseDto', isArray: false },
  getEngagementMetrics: { dto: 'EngagementMetricsResponseDto', isArray: false },
  getEventHistory: { dto: 'EventHistoryResponseDto', isArray: true },
  getGeographicDistribution: {
    dto: 'GeographicDistributionDto',
    isArray: true,
  },
  getDeviceStats: { dto: 'DeviceStatsResponseDto', isArray: true },
  getViewsByCountry: { dto: 'GeographicDistributionDto', isArray: true },
  getViewsByDevice: { dto: 'DeviceStatsResponseDto', isArray: true },
  getViewsByDate: { dto: 'ResumeViewsByPeriodDto', isArray: true },
  getAnalyticsDashboard: {
    dto: 'EngagementMetricsResponseDto',
    isArray: false,
  },

  // Collaboration
  invite: { dto: 'CollaboratorResponseDto', isArray: false },
  inviteCollaborator: { dto: 'CollaboratorResponseDto', isArray: false },
  getCollaborators: { dto: 'CollaboratorResponseDto', isArray: true },
  updateRole: { dto: 'CollaboratorResponseDto', isArray: false },
  updateCollaboratorRole: { dto: 'CollaboratorResponseDto', isArray: false },
  remove: { dto: 'DeleteResponseDto', isArray: false },
  removeCollaborator: { dto: 'DeleteResponseDto', isArray: false },
  getSharedWithMe: { dto: 'SharedResumeResponseDto', isArray: true },

  // Chat
  sendMessage: { dto: 'ChatMessageResponseDto', isArray: false },
  sendMessageToConversation: { dto: 'ChatMessageResponseDto', isArray: false },
  getMessages: { dto: 'ChatMessageResponseDto', isArray: true },
  getConversations: { dto: 'ConversationResponseDto', isArray: true },
  getConversation: { dto: 'ConversationDetailResponseDto', isArray: false },
  getConversationWith: { dto: 'ConversationDetailResponseDto', isArray: false },
  markAsRead: { dto: 'MarkAsReadResponseDto', isArray: false },
  markConversationAsRead: { dto: 'MarkAsReadResponseDto', isArray: false },
  getUnreadCount: { dto: 'UnreadCountResponseDto', isArray: false },
  block: { dto: 'BlockUserResponseDto', isArray: false },
  blockUser: { dto: 'BlockUserResponseDto', isArray: false },
  unblock: { dto: 'DeleteResponseDto', isArray: false },
  unblockUser: { dto: 'DeleteResponseDto', isArray: false },
  getBlockedUsers: { dto: 'BlockedUserResponseDto', isArray: true },
  isBlocked: { dto: 'IsBlockedResponseDto', isArray: false },

  // Onboarding
  start: { dto: 'OnboardingProgressResponseDto', isArray: false },
  startOnboarding: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getStatus: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getOnboardingStatus: { dto: 'OnboardingProgressResponseDto', isArray: false },
  getSteps: { dto: 'OnboardingStepResponseDto', isArray: true },
  complete: { dto: 'OnboardingProgressResponseDto', isArray: false },
  completeStep: { dto: 'OnboardingProgressResponseDto', isArray: false },

  // Auth
  register: { dto: 'AuthResponseDto', isArray: false },
  login: { dto: 'AuthResponseDto', isArray: false },
  getCurrentUser: { dto: 'CurrentUserResponseDto', isArray: false },
  me: { dto: 'CurrentUserResponseDto', isArray: false },
  forgotPassword: { dto: 'MessageResponseDto', isArray: false },
  requestPasswordReset: { dto: 'MessageResponseDto', isArray: false },
  resetPassword: { dto: 'MessageResponseDto', isArray: false },
  changePassword: { dto: 'MessageResponseDto', isArray: false },
  requestEmailVerification: { dto: 'MessageResponseDto', isArray: false },
  verifyEmail: { dto: 'MessageResponseDto', isArray: false },
  enable2FA: { dto: 'TwoFactorSetupResponseDto', isArray: false },
  disable2FA: { dto: 'MessageResponseDto', isArray: false },
  verifyAccount: { dto: 'MessageResponseDto', isArray: false },
  resendVerification: { dto: 'MessageResponseDto', isArray: false },

  // GDPR
  exportUserData: { dto: 'GdprExportResponseDto', isArray: false },
  requestDataExport: { dto: 'GdprExportResponseDto', isArray: false },
  deleteAccount: { dto: 'DeleteResponseDto', isArray: false },

  // Consent
  accept: { dto: 'ConsentResponseDto', isArray: false },
  acceptConsent: { dto: 'ConsentResponseDto', isArray: false },
  getConsentHistory: { dto: 'ConsentHistoryResponseDto', isArray: true },
  getActive: { dto: 'ConsentResponseDto', isArray: true },
  getActiveConsents: { dto: 'ConsentResponseDto', isArray: true },

  // Import
  importFromJson: { dto: 'ImportResultDto', isArray: false },
  importFromFile: { dto: 'ImportJobDto', isArray: false },
  getImportStatus: { dto: 'ImportJobDto', isArray: false },
  getHistory: { dto: 'ImportJobDto', isArray: true },
  getImportHistory: { dto: 'ImportJobDto', isArray: true },
  cancel: { dto: 'DeleteResponseDto', isArray: false },
  cancelImport: { dto: 'DeleteResponseDto', isArray: false },
  validate: { dto: 'ValidationResultDto', isArray: false },
  validateJsonResume: { dto: 'ValidationResultDto', isArray: false },
  parseFile: { dto: 'ImportResultDto', isArray: false },

  // Export
  exportToPdf: { dto: 'ExportResultDto', isArray: false },
  exportToDocx: { dto: 'ExportResultDto', isArray: false },
  exportToImage: { dto: 'ExportResultDto', isArray: false },
  exportResume: { dto: 'ExportResultDto', isArray: false },
  exportResumePDF: { dto: 'ExportResultDto', isArray: false },
  exportResumeDOCX: { dto: 'ExportResultDto', isArray: false },
  exportBanner: { dto: 'BannerPreviewResponseDto', isArray: false },
  previewBanner: { dto: 'BannerPreviewResponseDto', isArray: false },
  exportJson: { dto: 'ExportResultDto', isArray: false },
  exportLatex: { dto: 'ExportResultDto', isArray: false },

  // DSL
  render: { dto: 'DslRenderResponseDto', isArray: false },
  parseDsl: { dto: 'DslParseResponseDto', isArray: false },
  parse: { dto: 'DslParseResponseDto', isArray: false },
  validateDsl: { dto: 'DslValidationResponseDto', isArray: false },
  getSuggestions: { dto: 'DslSuggestionResponseDto', isArray: true },
  preview: { dto: 'DslRenderResponseDto', isArray: false },
  getSchema: { dto: 'DslParseResponseDto', isArray: false },

  // Translation
  healthCheck: { dto: 'HealthCheckResponseDto', isArray: false },
  translateText: { dto: 'TranslationResponseDto', isArray: false },
  translate: { dto: 'TranslationResponseDto', isArray: false },
  translateBatch: { dto: 'BatchTranslationResponseDto', isArray: false },
  translatePtToEn: { dto: 'TranslationResponseDto', isArray: false },
  translateEnToPt: { dto: 'TranslationResponseDto', isArray: false },

  // Skills
  listSkillsForResume: { dto: 'ResumeSkillResponseDto', isArray: true },
  addSkill: { dto: 'ResumeSkillResponseDto', isArray: false },
  addSkillToResume: { dto: 'ResumeSkillResponseDto', isArray: false },
  updateSkill: { dto: 'ResumeSkillResponseDto', isArray: false },
  deleteSkill: { dto: 'DeleteResponseDto', isArray: false },
  getSkills: { dto: 'TechSkillDto', isArray: true },
  searchSkills: { dto: 'TechSkillDto', isArray: true },
  getSkillById: { dto: 'TechSkillDto', isArray: false },
  getSkillsByType: { dto: 'TechSkillDto', isArray: true },
  getSkillsByNiche: { dto: 'TechSkillDto', isArray: true },
  getNiches: { dto: 'TechNicheDto', isArray: true },
  searchNiches: { dto: 'TechNicheDto', isArray: true },
  getNichesByArea: { dto: 'TechNicheDto', isArray: true },
  getAreas: { dto: 'TechAreaDto', isArray: true },
  searchAreas: { dto: 'TechAreaDto', isArray: true },

  // MEC
  listInstitutions: { dto: 'MecInstitutionDto', isArray: true },
  getInstitution: { dto: 'MecInstitutionDto', isArray: false },
  searchInstitutions: { dto: 'MecInstitutionDto', isArray: true },
  getInstitutionById: { dto: 'MecInstitutionDto', isArray: false },
  listCourses: { dto: 'MecCourseDto', isArray: true },
  getCourse: { dto: 'MecCourseDto', isArray: false },
  searchCourses: { dto: 'MecCourseDto', isArray: true },
  getCourseById: { dto: 'MecCourseDto', isArray: false },
  listAllStateCodes: { dto: 'StateCodeResponseDto', isArray: true },
  listAllKnowledgeAreas: { dto: 'KnowledgeAreaResponseDto', isArray: true },
  getMecStatistics: { dto: 'MecStatisticsResponseDto', isArray: false },
  triggerSync: { dto: 'MecSyncStatusResponseDto', isArray: false },
  getSyncStatus: { dto: 'MecSyncStatusResponseDto', isArray: false },
  getSyncHistory: { dto: 'MecSyncHistoryResponseDto', isArray: true },

  // GitHub
  getAuthUrl: { dto: 'GitHubAuthUrlResponseDto', isArray: false },
  handleCallback: { dto: 'GitHubCallbackResponseDto', isArray: false },
  callback: { dto: 'GitHubCallbackResponseDto', isArray: false },
  importGitHubData: { dto: 'GitHubImportResponseDto', isArray: false },
  importData: { dto: 'GitHubImportResponseDto', isArray: false },
  getConnectionStatus: { dto: 'GitHubConnectionStatusDto', isArray: false },
  status: { dto: 'GitHubConnectionStatusDto', isArray: false },

  // Upload
  uploadFile: { dto: 'FileUploadResponseDto', isArray: false },
  upload: { dto: 'FileUploadResponseDto', isArray: false },
  uploadImage: { dto: 'ImageUploadResponseDto', isArray: false },
  deleteFile: { dto: 'DeleteResponseDto', isArray: false },

  // ATS
  validateResume: { dto: 'AtsValidationResponseDto', isArray: false },
  validateATS: { dto: 'AtsValidationResponseDto', isArray: false },

  // Platform Stats
  getStatistics: { dto: 'PlatformStatsResponseDto', isArray: false },
  getStats: { dto: 'PlatformStatsResponseDto', isArray: false },
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
    } catch {}
  }
  walk(dir);
  return results;
}

function processController(filePath: string): {
  modified: boolean;
  dtosAdded: string[];
} {
  let content = readFileSync(filePath, 'utf-8');
  const dtosNeeded = new Set<string>();
  let modified = false;

  // Skip if no @SdkExport
  if (!content.includes('@SdkExport')) {
    return { modified: false, dtosAdded: [] };
  }

  const lines = content.split('\n');
  const httpMethods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    let foundHttpDecorator = false;
    let httpMethod = '';

    // Check for HTTP decorator
    for (const method of httpMethods) {
      if (line.includes(`@${method}(`)) {
        foundHttpDecorator = true;
        httpMethod = method;
        break;
      }
    }

    if (foundHttpDecorator) {
      // Look ahead to check if we already have @ApiResponse with type
      let hasApiResponseType = false;
      let methodName = '';
      let apiOperationLine = -1;

      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        const checkLine = lines[j];

        if (checkLine.includes('@ApiResponse') && checkLine.includes('type:')) {
          hasApiResponseType = true;
          break;
        }

        if (checkLine.includes('@ApiOperation')) {
          apiOperationLine = j;
        }

        // Find method name
        const methodMatch = checkLine.match(/async\s+(\w+)\s*\(/);
        if (methodMatch) {
          methodName = methodMatch[1];
          break;
        }
      }

      // If no @ApiResponse with type and we know the DTO
      const mapping = METHOD_TO_DTO[methodName];
      if (!hasApiResponseType && mapping && apiOperationLine >= 0) {
        dtosNeeded.add(mapping.dto);
        modified = true;

        // Add lines up to and including @ApiOperation
        while (i <= apiOperationLine) {
          newLines.push(lines[i]);
          i++;
        }

        // Add @ApiResponse after @ApiOperation
        const indent = lines[apiOperationLine].match(/^(\s*)/)?.[1] || '  ';
        const status = httpMethod === 'Post' ? 201 : 200;
        const typeExpr = mapping.isArray ? `[${mapping.dto}]` : mapping.dto;
        newLines.push(
          `${indent}@ApiResponse({ status: ${status}, type: ${typeExpr} })`,
        );
        continue;
      }
    }

    newLines.push(line);
    i++;
  }

  if (modified) {
    content = newLines.join('\n');

    // Add import if needed
    if (dtosNeeded.size > 0) {
      const dtoImportLine = `import {\n  ${[...dtosNeeded].sort().join(',\n  ')},\n} from '@/shared-kernel';`;

      // Find where to insert import
      const importMatch = content.match(
        /import[\s\S]*?from\s*['"]@\/shared-kernel['"];?\n/,
      );
      if (importMatch) {
        // Existing import - add DTOs to it
        const existingImport = importMatch[0];
        const existingDtos =
          existingImport.match(/{\s*([\s\S]*?)\s*}/)?.[1] || '';
        const existingItems = existingDtos
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const allItems = [...new Set([...existingItems, ...dtosNeeded])].sort();
        const newImport = existingImport.replace(
          /{\s*[\s\S]*?\s*}/,
          `{\n  ${allItems.join(',\n  ')},\n}`,
        );
        content = content.replace(existingImport, newImport);
      } else {
        // No existing import - add new one after other imports
        const lastImportMatch = content.match(
          /^import[\s\S]*?from\s*['"][^'"]+['"];?\n/gm,
        );
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1];
          const insertPos = content.indexOf(lastImport) + lastImport.length;
          content =
            content.slice(0, insertPos) +
            dtoImportLine +
            '\n' +
            content.slice(insertPos);
        }
      }
    }

    writeFileSync(filePath, content, 'utf-8');
  }

  return { modified, dtosAdded: [...dtosNeeded] };
}

async function main() {
  console.log('🚀 Applying @ApiResponse decorators to all controllers...\n');

  const controllerFiles = findFiles(SRC_DIR, /\.controller\.ts$/);
  let totalModified = 0;
  const allDtos = new Set<string>();

  for (const file of controllerFiles) {
    const result = processController(file);
    if (result.modified) {
      totalModified++;
      result.dtosAdded.forEach((dto) => allDtos.add(dto));
      console.log(
        `✅ ${relative(SRC_DIR, file)} (+${result.dtosAdded.length} DTOs)`,
      );
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Modified ${totalModified} controllers`);
  console.log(`📋 Added ${allDtos.size} unique DTOs`);
}

main().catch(console.error);
