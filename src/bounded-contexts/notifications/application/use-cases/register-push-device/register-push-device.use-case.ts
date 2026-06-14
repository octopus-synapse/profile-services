import type { DevicePlatform } from '@prisma/client';
import type { PrismaPushDeviceRepository } from '../../../infrastructure/adapters/persistence/prisma-push-device.repository';

export interface RegisterPushDeviceInput {
  userId: string;
  expoPushToken: string;
  platform: DevicePlatform;
}

export class RegisterPushDeviceUseCase {
  constructor(private readonly repository: PrismaPushDeviceRepository) {}

  async execute(input: RegisterPushDeviceInput): Promise<void> {
    await this.repository.upsert(input.userId, input.expoPushToken, input.platform);
  }
}
