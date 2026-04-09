import { describe, expect, it } from 'bun:test';
import {
  canCompleteOnboarding,
  canProceedFromStep,
  type OnboardingDataForValidation,
} from './onboarding-validation';

describe('canProceedFromStep', () => {
  const emptyData: OnboardingDataForValidation = {};

  describe('welcome step', () => {
    it('should always allow proceeding', () => {
      expect(canProceedFromStep('welcome', emptyData)).toBe(true);
    });
  });

  describe('personal-info step', () => {
    it('should allow proceeding when fullName and email are present', () => {
      const data: OnboardingDataForValidation = {
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
      };
      expect(canProceedFromStep('personal-info', data)).toBe(true);
    });

    it('should block when fullName is missing', () => {
      const data: OnboardingDataForValidation = {
        personalInfo: { email: 'john@example.com' },
      };
      expect(canProceedFromStep('personal-info', data)).toBe(false);
    });

    it('should block when email is missing', () => {
      const data: OnboardingDataForValidation = {
        personalInfo: { fullName: 'John Doe' },
      };
      expect(canProceedFromStep('personal-info', data)).toBe(false);
    });

    it('should block when personalInfo is undefined', () => {
      expect(canProceedFromStep('personal-info', emptyData)).toBe(false);
    });

    it('should block when fullName is empty string', () => {
      const data: OnboardingDataForValidation = {
        personalInfo: { fullName: '', email: 'john@example.com' },
      };
      expect(canProceedFromStep('personal-info', data)).toBe(false);
    });
  });

  describe('username step', () => {
    it('should allow proceeding with a valid username (>= 3 chars, <= 30 chars)', () => {
      const data: OnboardingDataForValidation = { username: 'john' };
      expect(canProceedFromStep('username', data)).toBe(true);
    });

    it('should allow proceeding with exactly 3 characters', () => {
      const data: OnboardingDataForValidation = { username: 'abc' };
      expect(canProceedFromStep('username', data)).toBe(true);
    });

    it('should allow proceeding with exactly 30 characters', () => {
      const data: OnboardingDataForValidation = { username: 'a'.repeat(30) };
      expect(canProceedFromStep('username', data)).toBe(true);
    });

    it('should block when username is too short (< 3 chars)', () => {
      const data: OnboardingDataForValidation = { username: 'ab' };
      expect(canProceedFromStep('username', data)).toBe(false);
    });

    it('should block when username is too long (> 30 chars)', () => {
      const data: OnboardingDataForValidation = { username: 'a'.repeat(31) };
      expect(canProceedFromStep('username', data)).toBe(false);
    });

    it('should block when username is null', () => {
      const data: OnboardingDataForValidation = { username: null };
      expect(canProceedFromStep('username', data)).toBe(false);
    });

    it('should block when username is undefined', () => {
      expect(canProceedFromStep('username', emptyData)).toBe(false);
    });
  });

  describe('professional-profile step', () => {
    it('should allow proceeding when jobTitle is present', () => {
      const data: OnboardingDataForValidation = {
        professionalProfile: { jobTitle: 'Software Engineer' },
      };
      expect(canProceedFromStep('professional-profile', data)).toBe(true);
    });

    it('should block when jobTitle is empty string', () => {
      const data: OnboardingDataForValidation = {
        professionalProfile: { jobTitle: '' },
      };
      expect(canProceedFromStep('professional-profile', data)).toBe(false);
    });

    it('should block when jobTitle is only whitespace', () => {
      const data: OnboardingDataForValidation = {
        professionalProfile: { jobTitle: '   ' },
      };
      expect(canProceedFromStep('professional-profile', data)).toBe(false);
    });

    it('should block when professionalProfile is undefined', () => {
      expect(canProceedFromStep('professional-profile', emptyData)).toBe(false);
    });
  });

  describe('template step', () => {
    it('should allow proceeding when colorScheme is present', () => {
      const data: OnboardingDataForValidation = {
        templateSelection: { colorScheme: 'dark' },
      };
      expect(canProceedFromStep('template', data)).toBe(true);
    });

    it('should block when colorScheme is missing', () => {
      const data: OnboardingDataForValidation = { templateSelection: {} };
      expect(canProceedFromStep('template', data)).toBe(false);
    });

    it('should block when templateSelection is undefined', () => {
      expect(canProceedFromStep('template', emptyData)).toBe(false);
    });
  });

  describe('review step', () => {
    it('should always allow proceeding', () => {
      expect(canProceedFromStep('review', emptyData)).toBe(true);
    });
  });

  describe('complete step', () => {
    it('should always allow proceeding', () => {
      expect(canProceedFromStep('complete', emptyData)).toBe(true);
    });
  });

  describe('section steps', () => {
    it('should always allow proceeding for section:work_experience_v1', () => {
      expect(canProceedFromStep('section:work_experience_v1', emptyData)).toBe(true);
    });

    it('should always allow proceeding for section:education_v1', () => {
      expect(canProceedFromStep('section:education_v1', emptyData)).toBe(true);
    });

    it('should always allow proceeding for any section step', () => {
      expect(canProceedFromStep('section:custom_section', emptyData)).toBe(true);
    });
  });

  describe('unknown step', () => {
    it('should allow proceeding for unknown steps', () => {
      expect(canProceedFromStep('unknown-step', emptyData)).toBe(true);
    });
  });
});

describe('canCompleteOnboarding', () => {
  const allRequiredSteps = [
    'welcome',
    'personal-info',
    'username',
    'professional-profile',
    'template',
    'review',
  ];

  const validData: OnboardingDataForValidation = {
    username: 'johndoe',
    personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
    professionalProfile: { jobTitle: 'Software Engineer' },
    templateSelection: { colorScheme: 'dark' },
  };

  it('should return valid when all steps are completed and data is valid', () => {
    const result = canCompleteOnboarding(allRequiredSteps, validData);
    expect(result.valid).toBe(true);
    expect(result.missingSteps).toEqual([]);
  });

  it('should report missing steps when some are not completed', () => {
    const completedSteps = ['welcome', 'personal-info'];
    const result = canCompleteOnboarding(completedSteps, validData);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toContain('username');
    expect(result.missingSteps).toContain('professional-profile');
    expect(result.missingSteps).toContain('template');
    expect(result.missingSteps).toContain('review');
  });

  it('should report missing steps when none are completed', () => {
    const result = canCompleteOnboarding([], validData);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toEqual(allRequiredSteps);
  });

  it('should detect invalid personal info even when step is marked completed', () => {
    const dataWithBadPersonalInfo: OnboardingDataForValidation = {
      ...validData,
      personalInfo: { fullName: '', email: '' },
    };
    const result = canCompleteOnboarding(allRequiredSteps, dataWithBadPersonalInfo);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toContain('personal-info');
  });

  it('should detect missing username even when step is marked completed', () => {
    const dataWithBadUsername: OnboardingDataForValidation = {
      ...validData,
      username: 'ab', // too short
    };
    const result = canCompleteOnboarding(allRequiredSteps, dataWithBadUsername);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toContain('username');
  });

  it('should detect missing professional profile even when step is marked completed', () => {
    const dataWithBadProfile: OnboardingDataForValidation = {
      ...validData,
      professionalProfile: { jobTitle: '   ' },
    };
    const result = canCompleteOnboarding(allRequiredSteps, dataWithBadProfile);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toContain('professional-profile');
  });

  it('should detect missing template selection even when step is marked completed', () => {
    const dataWithNoTemplate: OnboardingDataForValidation = {
      ...validData,
      templateSelection: {},
    };
    const result = canCompleteOnboarding(allRequiredSteps, dataWithNoTemplate);
    expect(result.valid).toBe(false);
    expect(result.missingSteps).toContain('template');
  });

  it('should not duplicate missing steps when both step and data are missing', () => {
    const completedSteps = ['welcome', 'review'];
    const incompleteData: OnboardingDataForValidation = {};
    const result = canCompleteOnboarding(completedSteps, incompleteData);

    const personalInfoCount = result.missingSteps.filter((s) => s === 'personal-info').length;
    const usernameCount = result.missingSteps.filter((s) => s === 'username').length;
    expect(personalInfoCount).toBe(1);
    expect(usernameCount).toBe(1);
  });

  it('should ignore section steps in required steps check', () => {
    const stepsWithSections = [
      ...allRequiredSteps,
      'section:work_experience_v1',
      'section:education_v1',
    ];
    const result = canCompleteOnboarding(stepsWithSections, validData);
    expect(result.valid).toBe(true);
    expect(result.missingSteps).toEqual([]);
  });
});
