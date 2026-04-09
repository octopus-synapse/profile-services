import { beforeEach, describe, expect, it } from 'bun:test';
import type { OnboardingProgressData } from '../../../domain/ports/onboarding-progress.port';
import { OnboardingStepDataMapper } from './onboarding-step-data.mapper';

describe('OnboardingStepDataMapper', () => {
  let mapper: OnboardingStepDataMapper;
  let baseProgress: OnboardingProgressData;

  beforeEach(() => {
    mapper = new OnboardingStepDataMapper();
    baseProgress = {
      currentStep: 'welcome',
      completedSteps: [],
      sections: [],
    };
  });

  describe('personal-info step', () => {
    it('should merge personalInfo when provided as nested object', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        personalInfo: { fullName: 'John Doe', email: 'john@example.com', phone: '123456' },
      };

      mapper.mergeStepData(update, 'personal-info', stepData, baseProgress);

      expect(update.personalInfo).toEqual({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '123456',
      });
    });

    it('should merge personalInfo when provided as root-level keys', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        location: 'NYC',
      };

      mapper.mergeStepData(update, 'personal-info', stepData, baseProgress);

      expect(update.personalInfo).toEqual({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        location: 'NYC',
      });
    });

    it('should prefer nested object over root keys', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        personalInfo: { fullName: 'Nested Name' },
        fullName: 'Root Name',
      };

      mapper.mergeStepData(update, 'personal-info', stepData, baseProgress);

      expect(update.personalInfo).toEqual({ fullName: 'Nested Name' });
    });

    it('should not set personalInfo when no relevant data is provided', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'personal-info', {}, baseProgress);
      expect(update.personalInfo).toBeUndefined();
    });
  });

  describe('username step', () => {
    it('should extract username string from stepData', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'username', { username: 'johndoe' }, baseProgress);
      expect(update.username).toBe('johndoe');
    });

    it('should not set username when value is not a string', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'username', { username: 123 }, baseProgress);
      expect(update.username).toBeUndefined();
    });

    it('should not set username when key is missing', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'username', {}, baseProgress);
      expect(update.username).toBeUndefined();
    });
  });

  describe('professional-profile step', () => {
    it('should merge professionalProfile when provided as nested object', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        professionalProfile: {
          jobTitle: 'Engineer',
          summary: 'Experienced dev',
          linkedin: 'linkedin.com/in/johndoe',
        },
      };

      mapper.mergeStepData(update, 'professional-profile', stepData, baseProgress);

      expect(update.professionalProfile).toEqual({
        jobTitle: 'Engineer',
        summary: 'Experienced dev',
        linkedin: 'linkedin.com/in/johndoe',
      });
    });

    it('should merge professionalProfile from root-level keys', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        jobTitle: 'Designer',
        github: 'github.com/jane',
        website: 'jane.dev',
      };

      mapper.mergeStepData(update, 'professional-profile', stepData, baseProgress);

      expect(update.professionalProfile).toEqual({
        jobTitle: 'Designer',
        github: 'github.com/jane',
        website: 'jane.dev',
      });
    });

    it('should ignore unrelated root keys', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = { jobTitle: 'Dev', unrelatedField: 'should be ignored' };

      mapper.mergeStepData(update, 'professional-profile', stepData, baseProgress);

      expect(update.professionalProfile).toEqual({ jobTitle: 'Dev' });
    });
  });

  describe('template step', () => {
    it('should merge templateSelection when provided as nested object', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        templateSelection: { templateId: 'modern', colorScheme: 'dark' },
      };

      mapper.mergeStepData(update, 'template', stepData, baseProgress);

      expect(update.templateSelection).toEqual({ templateId: 'modern', colorScheme: 'dark' });
    });

    it('should merge templateSelection from root-level keys', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = { colorScheme: 'light', template: 'classic', palette: 'warm' };

      mapper.mergeStepData(update, 'template', stepData, baseProgress);

      expect(update.templateSelection).toEqual({
        colorScheme: 'light',
        template: 'classic',
        palette: 'warm',
      });
    });
  });

  describe('section steps', () => {
    it('should add a new section entry for a section step', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = {
        items: [{ company: 'Acme', role: 'Dev' }],
      };

      mapper.mergeStepData(update, 'section:work_experience_v1', stepData, baseProgress);

      expect(update.sections).toEqual([
        {
          sectionTypeKey: 'work_experience_v1',
          items: [{ company: 'Acme', role: 'Dev' }],
          noData: false,
        },
      ]);
    });

    it('should replace existing section data for the same section type', () => {
      const progressWithSection: OnboardingProgressData = {
        ...baseProgress,
        sections: [
          {
            sectionTypeKey: 'work_experience_v1',
            items: [{ company: 'OldCo' }],
            noData: false,
          },
          {
            sectionTypeKey: 'education_v1',
            items: [{ school: 'MIT' }],
            noData: false,
          },
        ],
      };

      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = { items: [{ company: 'NewCo', role: 'CTO' }] };

      mapper.mergeStepData(update, 'section:work_experience_v1', stepData, progressWithSection);

      const sections = update.sections as Array<{
        sectionTypeKey: string;
        items: unknown[];
        noData: boolean;
      }>;
      expect(sections).toHaveLength(2);

      const workSection = sections.find((s) => s.sectionTypeKey === 'work_experience_v1');
      expect(workSection?.items).toEqual([{ company: 'NewCo', role: 'CTO' }]);

      const eduSection = sections.find((s) => s.sectionTypeKey === 'education_v1');
      expect(eduSection?.items).toEqual([{ school: 'MIT' }]);
    });

    it('should handle noData flag', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      const stepData = { noData: true };

      mapper.mergeStepData(update, 'section:education_v1', stepData, baseProgress);

      expect(update.sections).toEqual([
        {
          sectionTypeKey: 'education_v1',
          items: [],
          noData: true,
        },
      ]);
    });

    it('should default items to empty array when not provided', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'section:skill_set_v1', {}, baseProgress);

      expect(update.sections).toEqual([
        {
          sectionTypeKey: 'skill_set_v1',
          items: [],
          noData: false,
        },
      ]);
    });

    it('should handle progress with null sections', () => {
      const progressNullSections: OnboardingProgressData = {
        ...baseProgress,
        sections: undefined,
      };

      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(
        update,
        'section:language_v1',
        { items: [{ language: 'English' }] },
        progressNullSections,
      );

      expect(update.sections).toEqual([
        {
          sectionTypeKey: 'language_v1',
          items: [{ language: 'English' }],
          noData: false,
        },
      ]);
    });
  });

  describe('unknown steps', () => {
    it('should not modify update for unknown static steps', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'welcome', { someData: true }, baseProgress);
      expect(Object.keys(update)).toHaveLength(0);
    });

    it('should not modify update for review step', () => {
      const update: OnboardingProgressData = { currentStep: 'welcome', completedSteps: [] };
      mapper.mergeStepData(update, 'review', { someData: true }, baseProgress);
      expect(Object.keys(update)).toHaveLength(0);
    });
  });
});
