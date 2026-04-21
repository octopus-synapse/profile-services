/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class IntegrationAuthFailedException extends DomainException {
  readonly code: string = 'INTEGRATION_AUTH_FAILED';
  readonly statusHint = 502;
  constructor(provider: string) {
    super(`Authentication with ${provider} failed`);
  }
}

export class IntegrationRateLimitedException extends DomainException {
  readonly code: string = 'INTEGRATION_RATE_LIMITED';
  readonly statusHint = 503;
  constructor(provider: string, retryAfterSeconds?: number) {
    super(
      `${provider} rate-limited this request${retryAfterSeconds ? ` (retry in ${retryAfterSeconds}s)` : ''}`,
    );
  }
}

export class IntegrationTimeoutException extends DomainException {
  readonly code: string = 'INTEGRATION_TIMEOUT';
  readonly statusHint = 504;
  constructor(provider: string) {
    super(`Request to ${provider} timed out`);
  }
}

export class IntegrationResponseInvalidException extends DomainException {
  readonly code: string = 'INTEGRATION_RESPONSE_INVALID';
  readonly statusHint = 502;
  constructor(provider: string, reason: string) {
    super(`${provider} returned invalid response: ${reason}`);
  }
}

export class IntegrationNotConfiguredException extends DomainException {
  readonly code: string = 'INTEGRATION_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor(provider: string) {
    super(`${provider} integration is not configured on this instance`);
  }
}

export class ExternalHandleInvalidException extends ValidationException {
  readonly code: string = 'EXTERNAL_HANDLE_INVALID';
  constructor(provider: string) {
    super(`The ${provider} handle provided is not valid`);
  }
}

export class SyncCooldownActiveException extends ValidationException {
  readonly code: string = 'SYNC_COOLDOWN_ACTIVE';
  constructor(retryAfterMinutes: number) {
    super(`Sync cooldown is active. Try again in ${retryAfterMinutes} minutes`);
  }
}

export class UploadStorageUnavailableException extends DomainException {
  readonly code: string = 'UPLOAD_STORAGE_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('File storage backend is temporarily unavailable');
  }
}

export class UploadFileTooLargeException extends ValidationException {
  readonly code: string = 'UPLOAD_FILE_TOO_LARGE';
  constructor(maxBytes: number) {
    super(`File size exceeds maximum allowed size of ${maxBytes} bytes`);
  }
}

export class UploadInvalidFileTypeException extends ValidationException {
  readonly code: string = 'UPLOAD_INVALID_FILE_TYPE';
  constructor(allowed: string[]) {
    super(`Invalid file type. Allowed types: ${allowed.join(', ')}`);
  }
}

export class UploadFilenameUnsafeException extends ValidationException {
  readonly code: string = 'UPLOAD_FILENAME_UNSAFE';
  constructor(reason: 'null_bytes' | 'directory_traversal') {
    super(
      reason === 'null_bytes'
        ? 'Invalid filename: contains null bytes'
        : 'Invalid filename: directory traversal detected',
    );
  }
}

export class UploadExtensionMismatchException extends ValidationException {
  readonly code: string = 'UPLOAD_EXTENSION_MISMATCH';
  constructor(ext: string, mime: string) {
    super(`File extension .${ext} does not match file type ${mime}`);
  }
}

export class UploadContentInvalidException extends ValidationException {
  readonly code: string = 'UPLOAD_CONTENT_INVALID';
  constructor(reason: 'too_small' | 'bad_magic_jpeg' | 'bad_magic_png' | 'bad_magic_webp') {
    super(
      reason === 'too_small'
        ? 'Invalid file content'
        : reason === 'bad_magic_jpeg'
          ? 'Invalid JPEG file content'
          : reason === 'bad_magic_png'
            ? 'Invalid PNG file content'
            : 'Invalid WEBP file content',
    );
  }
}

export class GitHubSyncFailedException extends DomainException {
  readonly code: string = 'GITHUB_SYNC_FAILED';
  readonly statusHint = 502;
  constructor() {
    super('Failed to sync GitHub data');
  }
}

export class GitHubUsernameMissingException extends ValidationException {
  readonly code: string = 'GITHUB_USERNAME_MISSING';
  constructor() {
    super('No GitHub username found in resume');
  }
}

export class GitHubApiRequestFailedException extends DomainException {
  readonly code: string = 'GITHUB_API_REQUEST_FAILED';
  readonly statusHint = 502;
  constructor(path: string, status: number) {
    super(`GitHub API ${path} ${status}`);
  }
}

export class MecCsvDownloadFailedException extends DomainException {
  readonly code: string = 'MEC_CSV_DOWNLOAD_FAILED';
  readonly statusHint = 502;
  constructor(reason: string) {
    super(`MEC CSV download failed: ${reason}. No cache available.`);
  }
}

export class MecCsvEmptyException extends DomainException {
  readonly code: string = 'MEC_CSV_EMPTY';
  readonly statusHint = 502;
  constructor() {
    super('CSV file is empty or has no data rows');
  }
}

export class MecCsvNoResponseException extends DomainException {
  readonly code: string = 'MEC_CSV_NO_RESPONSE';
  readonly statusHint = 502;
  constructor() {
    super('No response received from MEC CSV source');
  }
}

export class MecCsvBlockedException extends DomainException {
  readonly code: string = 'MEC_CSV_BLOCKED';
  readonly statusHint = 502;
  constructor() {
    super('Received HTML instead of CSV - Cloudflare may still be blocking');
  }
}
