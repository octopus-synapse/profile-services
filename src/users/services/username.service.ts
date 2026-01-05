/**
 * Username Service
 * Handles username operations with cooldown
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from '../users.repository';
import { UpdateUsernameDto } from '../dto/update-username.dto';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '../../common/constants/config';

const USERNAME_UPDATE_COOLDOWN_DAYS = 30;

@Injectable()
export class UsernameService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    const user = await this.usersRepository.getUser(userId);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const newUsername = updateUsernameDto.username.toLowerCase();

    if (user.username === newUsername) {
      return {
        success: true,
        message: 'Username unchanged',
        username: user.username,
      };
    }

    await this.checkCooldownPeriod(userId);
    await this.ensureUsernameAvailable(newUsername, userId);

    const updatedUser = await this.usersRepository.updateUsername(
      userId,
      newUsername,
    );

    this.logger.debug(`Username updated`, 'UsernameService', {
      userId,
      oldUsername: user.username,
      newUsername,
    });

    return {
      success: true,
      message: 'Username updated successfully',
      username: updatedUser.username,
    };
  }

  async checkUsernameAvailability(username: string, userId?: string) {
    const normalizedUsername = username.toLowerCase();
    const isTaken = await this.usersRepository.isUsernameTaken(
      normalizedUsername,
      userId,
    );

    return {
      username: normalizedUsername,
      available: !isTaken,
    };
  }

  private async checkCooldownPeriod(userId: string): Promise<void> {
    const lastUpdate = await this.usersRepository.getLastUsernameUpdate(userId);
    if (!lastUpdate) return;

    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastUpdate < USERNAME_UPDATE_COOLDOWN_DAYS) {
      const daysRemaining = USERNAME_UPDATE_COOLDOWN_DAYS - daysSinceLastUpdate;
      throw new BadRequestException(
        `You can only change your username once every ${USERNAME_UPDATE_COOLDOWN_DAYS} days. Please wait ${daysRemaining} more day(s).`,
      );
    }
  }

  private async ensureUsernameAvailable(
    username: string,
    userId: string,
  ): Promise<void> {
    const isTaken = await this.usersRepository.isUsernameTaken(
      username,
      userId,
    );
    if (isTaken) {
      throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE);
    }
  }
}
