import type { PrismaPushDeviceRepository } from '../../../infrastructure/adapters/persistence/prisma-push-device.repository';

export class UnregisterPushDeviceUseCase {
  constructor(private readonly repository: PrismaPushDeviceRepository) {}

  async execute(userId: string, expoPushToken: string): Promise<void> {
    await this.repository.deleteByToken(userId, expoPushToken);
  }
}
