import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { DeleteFitProfileUseCase } from '../../application/use-cases/delete-fit-profile.use-case';
import { GetFitProfileStatusUseCase } from '../../application/use-cases/get-fit-profile-status.use-case';
import { GetOrCreateQuestionSetUseCase } from '../../application/use-cases/get-or-create-question-set.use-case';
import { SubmitFitAnswersUseCase } from '../../application/use-cases/submit-fit-answers.use-case';
import { FitProfileMeResponseDto } from '../../dto/fit-profile-me-response.dto';
import { FitQuestionsResponseDto } from '../../dto/fit-questions-response.dto';
import {
  SubmitFitAnswersDto,
  SubmittedFitProfileResponseDto,
} from '../../dto/submit-fit-answers.dto';
import {
  presentFitProfileMe,
  presentSubmittedFitProfile,
} from '../presenters/fit-profile.presenter';
import { presentFitQuestions } from '../presenters/fit-question.presenter';

/**
 * User-facing Fit Profile endpoints. The Fit Score itself is
 * intentionally opaque to the user per `docs/scoring/README.md` — this
 * controller never exposes a score; it only reports the lifecycle
 * state (so the frontend can route to the questionnaire or a lockout
 * card) and returns the raw vector for debugging/advanced clients.
 */
@SdkExport({ tag: 'fit-profile', description: 'Fit Profile (personality vector)' })
@ApiTags('fit-profile')
@ApiBearerAuth('JWT-auth')
@Controller('v1/fit-profile')
@UseGuards(JwtAuthGuard)
export class FitProfileController {
  constructor(
    private readonly getStatus: GetFitProfileStatusUseCase,
    private readonly getOrCreateQuestionSet: GetOrCreateQuestionSetUseCase,
    private readonly submit: SubmitFitAnswersUseCase,
    private readonly deleteProfile: DeleteFitProfileUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the caller’s Fit Profile lifecycle state' })
  @ApiDataResponse(FitProfileMeResponseDto, { description: 'Lifecycle state + vector' })
  async me(@CurrentUser() user: UserPayload): Promise<DataResponse<FitProfileMeResponseDto>> {
    const view = await this.getStatus.execute(user.userId);
    return { success: true, data: presentFitProfileMe(view) };
  }

  @Get('questions')
  @ApiOperation({ summary: 'Get or create the caller’s 25-question set' })
  @ApiDataResponse(FitQuestionsResponseDto, { description: 'Sampled 25 Fit Questions' })
  async questions(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<FitQuestionsResponseDto>> {
    const view = await this.getOrCreateQuestionSet.execute(user.userId);
    return { success: true, data: presentFitQuestions(view) };
  }

  @Post('answers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Commit the 25 Fit Answers → compute & persist vector' })
  @ApiDataResponse(SubmittedFitProfileResponseDto, { description: 'Freshly computed profile' })
  async submitAnswers(
    @CurrentUser() user: UserPayload,
    @Body() body: SubmitFitAnswersDto,
  ): Promise<DataResponse<SubmittedFitProfileResponseDto>> {
    const saved = await this.submit.execute({
      userId: user.userId,
      questionSetId: body.questionSetId,
      answers: body.answers,
    });
    return { success: true, data: presentSubmittedFitProfile(saved) };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'LGPD — wipe the caller’s Fit Answers and anonymize the vector',
  })
  async deleteMe(@CurrentUser() user: UserPayload): Promise<void> {
    await this.deleteProfile.execute(user.userId);
  }
}
