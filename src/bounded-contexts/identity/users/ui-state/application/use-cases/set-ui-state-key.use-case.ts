import {
  type SetUiStateKeyResult,
  SetUiStateKeyUseCasePort,
} from '../ports/set-ui-state-key.use-case.port';
import { UiStateRepositoryPort } from '../ports/ui-state-repository.port';

export class SetUiStateKeyUseCase extends SetUiStateKeyUseCasePort {
  constructor(private readonly repository: UiStateRepositoryPort) {
    super();
  }

  async execute(userId: string, key: string, value: unknown): Promise<SetUiStateKeyResult> {
    const entry = await this.repository.upsert(userId, { key, value });
    return { key: entry.key, value: entry.value };
  }
}
