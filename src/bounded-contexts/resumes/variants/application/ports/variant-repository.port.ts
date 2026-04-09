export interface VariantData {
  id: string;
  baseResumeId: string;
  userId: string;
  name: string;
  textOverrides: Record<string, string>;
  visibilityOverrides: Record<string, boolean>;
  orderOverrides: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVariantInput {
  baseResumeId: string;
  userId: string;
  name: string;
  textOverrides?: Record<string, string>;
  visibilityOverrides?: Record<string, boolean>;
  orderOverrides?: Record<string, number>;
}

export abstract class VariantRepositoryPort {
  abstract findById(id: string): Promise<VariantData | null>;
  abstract findByBaseResumeId(baseResumeId: string): Promise<VariantData[]>;
  abstract create(input: CreateVariantInput): Promise<VariantData>;
  abstract update(id: string, input: Partial<CreateVariantInput>): Promise<VariantData>;
  abstract delete(id: string): Promise<void>;
}

export const VARIANT_REPOSITORY = Symbol('VARIANT_REPOSITORY');
