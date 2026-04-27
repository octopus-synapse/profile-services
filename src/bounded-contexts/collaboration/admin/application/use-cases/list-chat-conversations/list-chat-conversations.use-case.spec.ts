import { beforeEach, describe, expect, it } from 'bun:test';
import type { AdminChatConversationView } from '../../../domain/ports/admin-chat.repository.port';
import { InMemoryAdminChatRepository } from '../../../testing';
import { ListChatConversationsUseCase } from './list-chat-conversations.use-case';

const conv = (id: string): AdminChatConversationView => ({
  id,
  createdAt: new Date('2026-04-25T10:00:00.000Z'),
  updatedAt: new Date('2026-04-25T10:00:00.000Z'),
  participant1Id: 'u1',
  participant2Id: 'u2',
  participant1: { id: 'u1', name: 'Alice', email: 'a@x.com' },
  participant2: { id: 'u2', name: null, email: 'b@x.com' },
  lastMessageContent: null,
  lastMessageAt: null,
  lastMessageSenderId: null,
});

describe('ListChatConversationsUseCase', () => {
  let repo: InMemoryAdminChatRepository;
  let useCase: ListChatConversationsUseCase;

  beforeEach(() => {
    repo = new InMemoryAdminChatRepository();
    useCase = new ListChatConversationsUseCase(repo);
  });

  it('returns paginated conversations from the repo', async () => {
    repo.seedConversations([conv('c-1'), conv('c-2'), conv('c-3')]);

    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(2);
  });

  it('falls back to defaults when no pagination is provided', async () => {
    repo.seedConversations([conv('c-1')]);

    const result = await useCase.execute({});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});
