/**
 * Per-UC port for `UpdateUsernameUseCase`.
 *
 * Routes depend on this abstract class instead of the concrete UC so the
 * bundle can swap implementations (e.g. an in-memory fake during tests
 * that don't want to spin up Prisma) without touching the route handler.
 */

export interface UpdatedUsername {
  readonly username: string;
}

export abstract class UpdateUsernameUseCasePort {
  abstract execute(userId: string, newUsername: string): Promise<UpdatedUsername>;
}
