// Common schemas
export * from './section-item.dto';
export * from './section-progress.dto';
export * from './personal-info.dto';
export * from './professional-profile.dto';
export * from './template-selection.dto';

// Request DTOs
export * from './goto-step-request.dto';
export * from './save-progress-request.dto';
export * from './complete-onboarding-request.dto';

// Response DTOs
export * from './step-meta.dto';
export * from './onboarding-session-response.dto';
export * from './onboarding-status-response.dto';
export * from './save-progress-response.dto';
export * from './complete-onboarding-response.dto';

// Backward compat alias
export { OnboardingSessionDto as OnboardingProgressDto } from './onboarding-session-response.dto';
