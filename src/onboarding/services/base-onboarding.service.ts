import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OnboardingData } from '../schemas/onboarding.schema';

/**
 * Abstract base class implementing Template Method pattern for onboarding services.
 *
 * Defines the algorithm skeleton for saving onboarding data:
 * 1. Extract and check for early exit
 * 2. Delete existing records
 * 3. Validate and transform items
 * 4. Create new records
 *
 * Subclasses implement entity-specific behavior via abstract methods.
 *
 * @template TInput - The raw input type from OnboardingData
 * @template TCreate - The Prisma create input type for createMany
 */
export abstract class BaseOnboardingService<TInput, TCreate> {
  protected abstract readonly logger: Logger;

  /**
   * Template Method: Defines the algorithm skeleton.
   * Subclasses customize behavior through hook methods.
   */
  protected async saveWithTransaction(
    tx: Prisma.TransactionClient,
    resumeId: string,
    data: OnboardingData,
  ): Promise<void> {
    const items = this.extractItems(data);
    const noDataFlag = this.getNoDataFlag(data);

    if (this.shouldSkip(noDataFlag, items)) {
      this.logger.log(this.getSkipMessage(noDataFlag, items));
      return;
    }

    await this.deleteExisting(tx, resumeId);

    const validItems = this.transformItems(items, resumeId);

    if (validItems.length > 0) {
      await this.createMany(tx, validItems);
      this.logger.log(this.getSuccessMessage(validItems.length));
    }
  }

  /**
   * Extract items array from OnboardingData.
   */
  protected abstract extractItems(data: OnboardingData): TInput[];

  /**
   * Get the "noData" flag from OnboardingData.
   * Return null for entities without this flag (e.g., languages).
   */
  protected abstract getNoDataFlag(data: OnboardingData): boolean | null;

  /**
   * Check if processing should be skipped.
   * Default: checks for noData flag or empty array.
   */
  protected shouldSkip(noDataFlag: boolean | null, items: TInput[]): boolean {
    return noDataFlag === true || items.length === 0;
  }

  /**
   * Get skip reason message for logging.
   */
  protected abstract getSkipMessage(
    noDataFlag: boolean | null,
    items: TInput[],
  ): string;

  /**
   * Delete existing records for this resumeId.
   */
  protected abstract deleteExisting(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ): Promise<void>;

  /**
   * Transform and validate input items to Prisma create format.
   * Filters out invalid items (nulls).
   */
  protected abstract transformItems(
    items: TInput[],
    resumeId: string,
  ): TCreate[];

  /**
   * Create many records in database.
   */
  protected abstract createMany(
    tx: Prisma.TransactionClient,
    items: TCreate[],
  ): Promise<void>;

  /**
   * Get success message for logging.
   */
  protected abstract getSuccessMessage(count: number): string;
}
