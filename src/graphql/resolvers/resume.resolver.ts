import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ResumeModel } from '../models/resume.model';
import { ExperienceModel } from '../models/experience.model';
import { EducationModel } from '../models/education.model';
import { SkillModel } from '../models/skill.model';
import {
  CreateExperienceInput,
  UpdateExperienceInput,
} from '../inputs/experience.input';
import { CreateEducationInput } from '../inputs/education.input';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { ExperienceService } from '../../resumes/services/experience.service';
import { EducationService } from '../../resumes/services/education.service';
import type { User } from '@prisma/client';
import { DataLoaderService } from '../dataloaders/dataloader.service';

/**
 * GraphQL Resolver for Resume queries and mutations
 *
 * Issue #76: Design GraphQL schema with Code-First approach
 * Issue #77: Implement DataLoader for N+1 optimization
 */
@Resolver(() => ResumeModel)
@UseGuards(GqlAuthGuard)
export class ResumeResolver {
  private readonly logger = new Logger(ResumeResolver.name);

  constructor(
    private readonly resumesRepository: ResumesRepository,
    private readonly experienceService: ExperienceService,
    private readonly educationService: EducationService,
  ) {}

  /**
   * Query: Get resume by ID
   */
  @Query(() => ResumeModel, {
    name: 'resume',
    description: 'Get a single resume by ID',
  })
  async getResume(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<ResumeModel> {
    this.logger.log(`[GraphQL] Fetching resume ${id} for user ${user.id}`);
    const resume = await this.resumesRepository.findOne(id, user.id);
    return resume as ResumeModel;
  }

  /**
   * Query: List all resumes for current user
   */
  @Query(() => [ResumeModel], {
    name: 'myResumes',
    description: 'Get all resumes for current user',
  })
  async getMyResumes(@CurrentUser() user: User): Promise<ResumeModel[]> {
    this.logger.log(`[GraphQL] Fetching resumes for user ${user.id}`);
    const resumes = await this.resumesRepository.findAll(user.id);
    return resumes as ResumeModel[];
  }

  /**
   * Field Resolver: Load experiences using DataLoader
   * This prevents N+1 queries when fetching multiple resumes
   */
  @ResolveField(() => [ExperienceModel])
  async experiences(
    @Parent() resume: ResumeModel,
    @Context() context: { loaders: DataLoaderService },
  ): Promise<ExperienceModel[]> {
    const loader = context.loaders.createExperiencesLoader();
    const experiences = await loader.load(resume.id);
    return experiences as ExperienceModel[];
  }

  /**
   * Field Resolver: Load educations using DataLoader
   */
  @ResolveField(() => [EducationModel])
  async educations(
    @Parent() resume: ResumeModel,
    @Context() context: { loaders: DataLoaderService },
  ): Promise<EducationModel[]> {
    const loader = context.loaders.createEducationsLoader();
    const educations = await loader.load(resume.id);
    return educations as EducationModel[];
  }

  /**
   * Field Resolver: Load skills using DataLoader
   */
  @ResolveField(() => [SkillModel])
  async skills(
    @Parent() resume: ResumeModel,
    @Context() context: { loaders: DataLoaderService },
  ): Promise<SkillModel[]> {
    const loader = context.loaders.createSkillsLoader();
    const skills = await loader.load(resume.id);
    return skills as SkillModel[];
  }

  /**
   * Mutation: Add experience to resume
   */
  @Mutation(() => ExperienceModel, {
    description: 'Add work experience to resume',
  })
  async addExperience(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('input') input: CreateExperienceInput,
    @CurrentUser() user: User,
  ): Promise<ExperienceModel> {
    this.logger.log(
      `[GraphQL] Adding experience to resume ${resumeId} for user ${user.id}`,
    );
    const response = await this.experienceService.addToResume(
      resumeId,
      user.id,
      input,
    );
    return response.data as ExperienceModel;
  }

  /**
   * Mutation: Update experience
   */
  @Mutation(() => ExperienceModel, { description: 'Update work experience' })
  async updateExperience(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('experienceId', { type: () => ID }) experienceId: string,
    @Args('input') input: UpdateExperienceInput,
    @CurrentUser() user: User,
  ): Promise<ExperienceModel> {
    this.logger.log(
      `[GraphQL] Updating experience ${experienceId} for user ${user.id}`,
    );
    const response = await this.experienceService.updateById(
      resumeId,
      experienceId,
      user.id,
      input,
    );
    return response.data as ExperienceModel;
  }

  /**
   * Mutation: Delete experience
   */
  @Mutation(() => Boolean, { description: 'Delete work experience' })
  async deleteExperience(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('experienceId', { type: () => ID }) experienceId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    this.logger.log(
      `[GraphQL] Deleting experience ${experienceId} for user ${user.id}`,
    );
    await this.experienceService.deleteById(resumeId, experienceId, user.id);
    return true;
  }

  /**
   * Mutation: Add education to resume
   */
  @Mutation(() => EducationModel, {
    description: 'Add education entry to resume',
  })
  async addEducation(
    @Args('resumeId', { type: () => ID }) resumeId: string,
    @Args('input') input: CreateEducationInput,
    @CurrentUser() user: User,
  ): Promise<EducationModel> {
    this.logger.log(
      `[GraphQL] Adding education to resume ${resumeId} for user ${user.id}`,
    );
    // TODO: Migrate EducationService to use profile-contracts types
    // Currently using cast due to legacy class-validator DTO mismatch
    const response = await this.educationService.addToResume(
      resumeId,
      user.id,
      input as Parameters<typeof this.educationService.addToResume>[2],
    );
    return response.data as EducationModel;
  }
}
