import { GetAllUiStateUseCasePort } from '../ports/get-all-ui-state.use-case.port';
import { UiStateRepositoryPort } from '../ports/ui-state-repository.port';

export class GetAllUiStateUseCase extends GetAllUiStateUseCasePort {
  constructor(private readonly repository: UiStateRepositoryPort) {
    super();
  }

  async execute(userId: string): Promise<Record<string, unknown>> {
    const entries = await this.repository.list(userId);
    const out: Record<string, unknown> = {};
    for (const e of entries) out[e.key] = e.value;
    return out;
  }
}
