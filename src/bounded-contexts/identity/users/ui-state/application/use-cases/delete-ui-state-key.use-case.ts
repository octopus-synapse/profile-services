import { DeleteUiStateKeyUseCasePort } from '../ports/delete-ui-state-key.use-case.port';
import { UiStateRepositoryPort } from '../ports/ui-state-repository.port';

export class DeleteUiStateKeyUseCase extends DeleteUiStateKeyUseCasePort {
  constructor(private readonly repository: UiStateRepositoryPort) {
    super();
  }

  async execute(userId: string, key: string): Promise<void> {
    await this.repository.delete(userId, key);
  }
}
