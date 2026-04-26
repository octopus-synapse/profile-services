import type { BlockedUserRepository } from '../repositories/blocked-user.repository';
import { BlockUseCases } from './ports/block.port';
import { BlockUserUseCase } from './use-cases/block-user/block-user.use-case';
import { CheckBlockStatusUseCase } from './use-cases/check-block-status/check-block-status.use-case';
import { GetBlockedUsersUseCase } from './use-cases/get-blocked-users/get-blocked-users.use-case';
import { UnblockUserUseCase } from './use-cases/unblock-user/unblock-user.use-case';

export { BlockUseCases };

export function buildBlockUseCases(blockedUserRepo: BlockedUserRepository): BlockUseCases {
  return {
    blockUserUseCase: new BlockUserUseCase(blockedUserRepo),
    unblockUserUseCase: new UnblockUserUseCase(blockedUserRepo),
    getBlockedUsersUseCase: new GetBlockedUsersUseCase(blockedUserRepo),
    checkBlockStatusUseCase: new CheckBlockStatusUseCase(blockedUserRepo),
  };
}
