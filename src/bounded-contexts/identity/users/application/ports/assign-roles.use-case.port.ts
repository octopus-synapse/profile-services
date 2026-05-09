export abstract class AssignRolesUseCasePort {
  abstract execute(userId: string, roles: string[], assignedBy: string): Promise<void>;
}
