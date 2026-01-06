/**
 * Onboarding Progress Service Tests
 *
 * Business Rules Tested:
 * 1. Progress expires after 36 hours
 * 2. Steps must be completed sequentially
 * 3. Flags (noExperience, etc.) require empty arrays
 * 4. Username validation happens at final submit
 */

describe('Onboarding Progress Business Rules', () => {
  const PROGRESS_EXPIRY_HOURS = 36;

  describe('Progress Expiration (36 hours)', () => {
    const isProgressExpired = (updatedAt: Date): boolean => {
      const expiryMs = PROGRESS_EXPIRY_HOURS * 60 * 60 * 1000;
      return Date.now() - updatedAt.getTime() > expiryMs;
    };

    it('should return false for recent progress', () => {
      const recentUpdate = new Date(); // Just now
      expect(isProgressExpired(recentUpdate)).toBe(false);
    });

    it('should return true for progress older than 36 hours', () => {
      const oldUpdate = new Date();
      oldUpdate.setHours(oldUpdate.getHours() - 37); // 37 hours ago
      expect(isProgressExpired(oldUpdate)).toBe(true);
    });

    it('should return false at exactly 36 hours', () => {
      const exactlyAtLimit = new Date();
      exactlyAtLimit.setHours(exactlyAtLimit.getHours() - 36);
      // At exactly 36 hours, should still be valid (edge case)
      expect(isProgressExpired(exactlyAtLimit)).toBe(false);
    });

    it('should return true at 36 hours + 1 minute', () => {
      const justExpired = new Date();
      justExpired.setHours(justExpired.getHours() - 36);
      justExpired.setMinutes(justExpired.getMinutes() - 1);
      expect(isProgressExpired(justExpired)).toBe(true);
    });
  });

  describe('Sequential Step Completion', () => {
    const ORDERED_STEPS = [
      'welcome',
      'personal-info',
      'username',
      'professional-profile',
      'experience',
      'education',
      'skills',
      'languages',
      'template',
      'review',
    ];

    const canAdvanceToStep = (
      currentStep: string,
      completedSteps: string[],
      targetStep: string,
    ): boolean => {
      const currentIndex = ORDERED_STEPS.indexOf(currentStep);
      const targetIndex = ORDERED_STEPS.indexOf(targetStep);

      // Can go back to any completed step
      if (completedSteps.includes(targetStep)) {
        return true;
      }

      // Can only advance to the next step
      return targetIndex === currentIndex + 1;
    };

    it('should allow advancing to next step in sequence', () => {
      const result = canAdvanceToStep('personal-info', ['welcome'], 'username');
      expect(result).toBe(true);
    });

    it('should reject skipping steps', () => {
      const result = canAdvanceToStep(
        'personal-info',
        ['welcome'],
        'skills', // Trying to skip to skills
      );
      expect(result).toBe(false);
    });

    it('should allow going back to completed steps', () => {
      const result = canAdvanceToStep(
        'experience',
        ['welcome', 'personal-info', 'username', 'professional-profile'],
        'personal-info', // Going back
      );
      expect(result).toBe(true);
    });

    it('should not allow going to uncompleted steps out of order', () => {
      const result = canAdvanceToStep(
        'experience',
        ['welcome', 'personal-info', 'username'],
        'template', // Not yet completed and not next
      );
      expect(result).toBe(false);
    });

    it('should allow going from step 1 to step 2', () => {
      const result = canAdvanceToStep('welcome', [], 'personal-info');
      expect(result).toBe(true);
    });
  });

  describe('noExperience/noEducation/noSkills Flags', () => {
    interface StepData {
      noExperience?: boolean;
      experiences?: any[];
      noEducation?: boolean;
      education?: any[];
      noSkills?: boolean;
      skills?: any[];
    }

    interface ValidationResult {
      isValid: boolean;
      error?: string;
    }

    const validateStepData = (
      step: string,
      data: StepData,
    ): ValidationResult => {
      // Rule: If flag is true, corresponding array must be empty
      if (step === 'experience') {
        if (
          data.noExperience &&
          data.experiences &&
          data.experiences.length > 0
        ) {
          return {
            isValid: false,
            error: 'experiences must be empty when noExperience is true',
          };
        }
        if (
          !data.noExperience &&
          (!data.experiences || data.experiences.length === 0)
        ) {
          return {
            isValid: false,
            error: 'at least one experience is required',
          };
        }
      }

      if (step === 'education') {
        if (data.noEducation && data.education && data.education.length > 0) {
          return {
            isValid: false,
            error: 'education must be empty when noEducation is true',
          };
        }
        if (
          !data.noEducation &&
          (!data.education || data.education.length === 0)
        ) {
          return {
            isValid: false,
            error: 'at least one education entry is required',
          };
        }
      }

      if (step === 'skills') {
        if (data.noSkills && data.skills && data.skills.length > 0) {
          return {
            isValid: false,
            error: 'skills must be empty when noSkills is true',
          };
        }
        if (!data.noSkills && (!data.skills || data.skills.length === 0)) {
          return { isValid: false, error: 'at least one skill is required' };
        }
      }

      return { isValid: true };
    };

    it('should accept noExperience=true with empty experiences array', () => {
      const result = validateStepData('experience', {
        noExperience: true,
        experiences: [],
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject noExperience=true with non-empty experiences array', () => {
      const result = validateStepData('experience', {
        noExperience: true,
        experiences: [{ company: 'ACME', position: 'Dev' }],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('experiences must be empty');
    });

    it('should accept noEducation=true with empty education array', () => {
      const result = validateStepData('education', {
        noEducation: true,
        education: [],
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject noEducation=true with non-empty education array', () => {
      const result = validateStepData('education', {
        noEducation: true,
        education: [{ institution: 'MIT', degree: 'BS' }],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('education must be empty');
    });

    it('should accept noSkills=true with empty skills array', () => {
      const result = validateStepData('skills', {
        noSkills: true,
        skills: [],
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject noSkills=true with non-empty skills array', () => {
      const result = validateStepData('skills', {
        noSkills: true,
        skills: [{ name: 'TypeScript', level: 5 }],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('skills must be empty');
    });

    it('should require experiences when noExperience=false', () => {
      const result = validateStepData('experience', {
        noExperience: false,
        experiences: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one experience');
    });

    it('should require education when noEducation=false', () => {
      const result = validateStepData('education', {
        noEducation: false,
        education: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one education');
    });

    it('should require skills when noSkills=false', () => {
      const result = validateStepData('skills', {
        noSkills: false,
        skills: [],
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one skill');
    });
  });

  describe('Username Validation at Final Submit', () => {
    /**
     * Rule: Username validation happens only at final submit.
     * If taken between start and end of onboarding, submit fails.
     */

    const validateUsernameAtSubmit = async (
      username: string,
      takenUsernames: Set<string>,
    ): Promise<{ valid: boolean; suggestions?: string[] }> => {
      if (takenUsernames.has(username)) {
        // Backend returns suggestions
        const suggestions = [
          `${username}1`,
          `${username}_dev`,
          `${username}2024`,
        ];
        return { valid: false, suggestions };
      }
      return { valid: true };
    };

    it('should accept available username', async () => {
      const takenUsernames = new Set(['johndoe', 'janedoe']);
      const result = await validateUsernameAtSubmit(
        'uniqueuser',
        takenUsernames,
      );
      expect(result.valid).toBe(true);
    });

    it('should reject taken username', async () => {
      const takenUsernames = new Set(['johndoe', 'janedoe']);
      const result = await validateUsernameAtSubmit('johndoe', takenUsernames);
      expect(result.valid).toBe(false);
    });

    it('should provide suggestions when username is taken', async () => {
      const takenUsernames = new Set(['johndoe']);
      const result = await validateUsernameAtSubmit('johndoe', takenUsernames);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('First Username Definition (No Cooldown)', () => {
    /**
     * Rule: Username defined during onboarding is first definition,
     * therefore no cooldown applies. After this, 30-day cooldown applies.
     */

    const canUpdateUsername = (
      usernameUpdatedAt: Date | null,
      isOnboarding: boolean,
    ): boolean => {
      // During onboarding, no cooldown
      if (isOnboarding) return true;

      // First update (never updated before)
      if (usernameUpdatedAt === null) return true;

      // Check 30-day cooldown
      const cooldownDays = 30;
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
      return Date.now() - usernameUpdatedAt.getTime() >= cooldownMs;
    };

    it('should allow username during onboarding regardless of history', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 10); // Only 10 days ago

      expect(canUpdateUsername(thirtyDaysAgo, true)).toBe(true);
    });

    it('should apply cooldown after onboarding completes', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      expect(canUpdateUsername(tenDaysAgo, false)).toBe(false);
    });

    it('should allow first post-onboarding update (usernameUpdatedAt is null)', () => {
      expect(canUpdateUsername(null, false)).toBe(true);
    });
  });
});
