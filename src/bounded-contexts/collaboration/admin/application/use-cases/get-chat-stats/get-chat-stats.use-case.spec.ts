import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAdminChatRepository } from '../../../testing';
import { GetChatStatsUseCase } from './get-chat-stats.use-case';

describe('GetChatStatsUseCase', () => {
  let repo: InMemoryAdminChatRepository;
  let useCase: GetChatStatsUseCase;
  const fixedNow = new Date('2026-04-26T12:00:00.000Z').getTime();

  beforeEach(() => {
    repo = new InMemoryAdminChatRepository();
    useCase = new GetChatStatsUseCase(repo);
    Date.now = () => fixedNow;
  });

  afterEach(() => {
    Date.now = Date.prototype.getTime.bind(new Date());
  });

  it('returns the seeded stats and asks the repo for the 30-day window', async () => {
    repo.seedStats({
      totalConversations: 7,
      totalMessages: 50,
      activeConversations: 3,
      activeChatUsers: 4,
    });

    const result = await useCase.execute();

    expect(result).toEqual({
      totalConversations: 7,
      totalMessages: 50,
      activeConversations: 3,
      activeChatUsers: 4,
    });
    expect(repo.lastActiveSince).toEqual(new Date(fixedNow - 30 * 24 * 60 * 60 * 1000));
  });
});
