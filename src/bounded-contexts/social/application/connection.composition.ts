import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ConnectionRepository } from '../infrastructure/adapters/persistence/connection.repository';
import { CONNECTION_USE_CASES, type ConnectionUseCases } from './ports/connection.port';
import { AcceptConnectionUseCase } from './use-cases/accept-connection/accept-connection.use-case';
import { CheckConnectedUseCase } from './use-cases/check-connected/check-connected.use-case';
import { GetConnectionStatsUseCase } from './use-cases/get-connection-stats/get-connection-stats.use-case';
import { GetConnectionSuggestionsUseCase } from './use-cases/get-connection-suggestions/get-connection-suggestions.use-case';
import { GetConnectionsUseCase } from './use-cases/get-connections/get-connections.use-case';
import { GetPendingRequestsUseCase } from './use-cases/get-pending-requests/get-pending-requests.use-case';
import { RejectConnectionUseCase } from './use-cases/reject-connection/reject-connection.use-case';
import { RemoveConnectionUseCase } from './use-cases/remove-connection/remove-connection.use-case';
import { SendConnectionRequestUseCase } from './use-cases/send-connection-request/send-connection-request.use-case';

export { CONNECTION_USE_CASES };

export function buildConnectionUseCases(
  prisma: PrismaService,
  eventPublisher: EventPublisherPort,
): ConnectionUseCases {
  const repository = new ConnectionRepository(prisma);

  return {
    sendConnectionRequestUseCase: new SendConnectionRequestUseCase(repository, eventPublisher),
    acceptConnectionUseCase: new AcceptConnectionUseCase(repository, eventPublisher),
    rejectConnectionUseCase: new RejectConnectionUseCase(repository),
    removeConnectionUseCase: new RemoveConnectionUseCase(repository),
    getPendingRequestsUseCase: new GetPendingRequestsUseCase(repository),
    getConnectionsUseCase: new GetConnectionsUseCase(repository),
    getConnectionStatsUseCase: new GetConnectionStatsUseCase(repository),
    checkConnectedUseCase: new CheckConnectedUseCase(repository),
    getConnectionSuggestionsUseCase: new GetConnectionSuggestionsUseCase(repository),
  };
}
