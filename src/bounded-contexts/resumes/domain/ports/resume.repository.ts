export interface ResumeRepository {
  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<ResumeAggregate | null>;
  findAllByUserId(userId: string): Promise<ResumeAggregate[]>;
  findAllByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<ResumeAggregate[]>;
  countByUserId(userId: string): Promise<number>;
  create(userId: string, data: CreateResumeData): Promise<ResumeAggregate>;
  update(
    id: string,
    userId: string,
    data: UpdateResumeData,
  ): Promise<ResumeAggregate | null>;
  delete(id: string, userId: string): Promise<boolean>;
  findByUserId(userId: string): Promise<ResumeAggregate | null>;
}

export interface ResumeAggregate {
  id: string;
  userId: string;
  title: string;
  slug: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResumeData {
  title: string;
  slug?: string;
}

export interface UpdateResumeData {
  title?: string;
  slug?: string;
  isPublic?: boolean;
}
