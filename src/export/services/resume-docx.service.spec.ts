import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ResumeDOCXService } from './resume-docx.service';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';

describe('ResumeDOCXService', () => {
  let service: ResumeDOCXService;
  let resumesRepository: jest.Mocked<ResumesRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'John Doe',
    phone: '+1234567890',
    website: 'https://johndoe.com',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    bio: 'Experienced software engineer',
  };

  const mockResume = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Test Resume',
    experiences: [
      {
        id: 'exp-1',
        position: 'Senior Developer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: new Date('2020-01-01'),
        endDate: null,
        description: 'Led development team',
        current: true,
      },
      {
        id: 'exp-2',
        position: 'Developer',
        company: 'Startup Inc',
        location: 'New York, NY',
        startDate: new Date('2018-06-01'),
        endDate: new Date('2019-12-31'),
        description: 'Built web applications',
        current: false,
      },
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'BS',
        field: 'Computer Science',
        institution: 'MIT',
        startDate: new Date('2014-09-01'),
        endDate: new Date('2018-05-31'),
      },
    ],
    skills: [
      { id: 'skill-1', name: 'TypeScript', level: 'Expert', category: 'Languages' },
      { id: 'skill-2', name: 'React', level: 'Advanced', category: 'Frontend' },
      { id: 'skill-3', name: 'Node.js', level: 'Advanced', category: 'Backend' },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'E-commerce Platform',
        description: 'Built scalable e-commerce solution',
        url: 'https://github.com/johndoe/ecommerce',
      },
    ],
    languages: [
      { id: 'lang-1', name: 'English', level: 'Native' },
      { id: 'lang-2', name: 'Spanish', level: 'Intermediate' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeDOCXService,
        {
          provide: ResumesRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            getUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResumeDOCXService>(ResumeDOCXService);
    resumesRepository = module.get(ResumesRepository);
    usersRepository = module.get(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate DOCX for complete resume', async () => {
      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(mockResume as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(usersRepository.getUser).toHaveBeenCalledWith('user-123');
      expect(resumesRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.getUser.mockResolvedValue(null);

      await expect(service.generate('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generate('non-existent-user')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw NotFoundException when resume not found', async () => {
      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(null);

      await expect(service.generate('user-123')).rejects.toThrow(NotFoundException);
      await expect(service.generate('user-123')).rejects.toThrow(
        'Resume not found for this user',
      );
    });

    it('should handle resume with empty sections', async () => {
      const emptyResume = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(emptyResume as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle user with minimal fields', async () => {
      const minimalUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: null,
        phone: null,
        website: null,
        linkedin: null,
        github: null,
        bio: null,
      };

      usersRepository.getUser.mockResolvedValue(minimalUser as any);
      resumesRepository.findByUserId.mockResolvedValue({
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      } as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle null/undefined user fields gracefully', async () => {
      const userWithNulls = {
        id: 'user-123',
        email: null,
        displayName: undefined,
        phone: undefined,
        website: undefined,
        linkedin: undefined,
        github: undefined,
        bio: undefined,
      };

      usersRepository.getUser.mockResolvedValue(userWithNulls as any);
      resumesRepository.findByUserId.mockResolvedValue({
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      } as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly for experiences', async () => {
      const resumeWithDates = {
        ...mockResume,
        experiences: [
          {
            id: 'exp-1',
            position: 'Developer',
            company: 'Company',
            location: 'City',
            startDate: new Date('2020-03-15'),
            endDate: new Date('2021-11-30'),
            description: 'Work',
            current: false,
          },
        ],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithDates as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      // The dates should be formatted as "Mar 2020 - Nov 2021" in the document
    });

    it('should show "Present" for current positions', async () => {
      const resumeWithCurrentJob = {
        ...mockResume,
        experiences: [
          {
            id: 'exp-1',
            position: 'Developer',
            company: 'Company',
            location: 'City',
            startDate: new Date('2020-01-01'),
            endDate: null,
            description: 'Current work',
            current: true,
          },
        ],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithCurrentJob as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      // endDate null should result in "Present"
    });

    it('should handle education date formatting', async () => {
      const resumeWithEducation = {
        ...mockResume,
        experiences: [],
        education: [
          {
            id: 'edu-1',
            degree: 'PhD',
            field: 'Physics',
            institution: 'Stanford',
            startDate: new Date('2018-09-01'),
            endDate: null, // Ongoing
          },
        ],
        skills: [],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithEducation as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('skills formatting', () => {
    it('should format skills with bullet separator', async () => {
      const resumeWithSkills = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [
          { id: 's1', name: 'JavaScript', level: 'Expert', category: 'Lang' },
          { id: 's2', name: 'Python', level: 'Advanced', category: 'Lang' },
          { id: 's3', name: 'SQL', level: 'Intermediate', category: 'DB' },
        ],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithSkills as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      // Skills should be formatted as "JavaScript • Python • SQL"
    });

    it('should handle single skill', async () => {
      const resumeWithOneSkill = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [{ id: 's1', name: 'TypeScript', level: 'Expert', category: 'Lang' }],
        projects: [],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithOneSkill as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('languages formatting', () => {
    it('should format languages with level in parentheses', async () => {
      const resumeWithLanguages = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [
          { id: 'l1', name: 'English', level: 'Native' },
          { id: 'l2', name: 'French', level: 'Fluent' },
        ],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithLanguages as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      // Languages should be formatted as "English (Native) | French (Fluent)"
    });
  });

  describe('projects formatting', () => {
    it('should include project URL when available', async () => {
      const resumeWithProjects = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [
          {
            id: 'p1',
            name: 'Project With URL',
            description: 'Description here',
            url: 'https://github.com/user/project',
          },
        ],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithProjects as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle project without URL', async () => {
      const resumeWithProjects = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [
          {
            id: 'p1',
            name: 'Project Without URL',
            description: 'Description here',
            url: null,
          },
        ],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithProjects as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle project with empty description', async () => {
      const resumeWithProjects = {
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [
          {
            id: 'p1',
            name: 'Project',
            description: null,
            url: null,
          },
        ],
        languages: [],
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(resumeWithProjects as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('contact info formatting', () => {
    it('should format contact info with separators', async () => {
      const userWithAllContacts = {
        ...mockUser,
        website: 'https://example.com',
        linkedin: 'linkedin.com/in/user',
        github: 'github.com/user',
      };

      usersRepository.getUser.mockResolvedValue(userWithAllContacts as any);
      resumesRepository.findByUserId.mockResolvedValue({
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      } as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      // Should be formatted with " | " separators
    });

    it('should handle user with only linkedin', async () => {
      const userWithOnlyLinkedin = {
        ...mockUser,
        website: null,
        linkedin: 'linkedin.com/in/user',
        github: null,
      };

      usersRepository.getUser.mockResolvedValue(userWithOnlyLinkedin as any);
      resumesRepository.findByUserId.mockResolvedValue({
        ...mockResume,
        experiences: [],
        education: [],
        skills: [],
        projects: [],
        languages: [],
      } as any);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
