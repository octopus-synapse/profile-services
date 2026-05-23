import {
  type FindShadowCandidatesInput,
  ShadowProfileRepositoryPort,
  type ShadowProfileSnapshot,
  type UpsertShadowProfileInput,
} from '../application/ports/shadow-profile-repository.port';

export class InMemoryShadowProfileRepository extends ShadowProfileRepositoryPort {
  private readonly byKey = new Map<string, ShadowProfileSnapshot>();
  private nextId = 1;

  private keyOf(source: string, externalHandle: string): string {
    return `${source}:${externalHandle}`;
  }

  seed(snapshot: ShadowProfileSnapshot): void {
    this.byKey.set(this.keyOf(snapshot.source, snapshot.externalHandle), snapshot);
  }

  async upsert(input: UpsertShadowProfileInput): Promise<ShadowProfileSnapshot> {
    const key = this.keyOf(input.source, input.externalHandle);
    const existing = this.byKey.get(key);
    const snapshot: ShadowProfileSnapshot = {
      id: existing?.id ?? `shadow-${this.nextId++}`,
      source: input.source,
      externalHandle: input.externalHandle,
      contactEmail: input.contactEmail,
      payload: input.payload,
      claimedByUserId: existing?.claimedByUserId ?? null,
    };
    this.byKey.set(key, snapshot);
    return snapshot;
  }

  async findCandidates(input: FindShadowCandidatesInput): Promise<ShadowProfileSnapshot[]> {
    if (!input.email && !input.githubLogin) return [];
    return Array.from(this.byKey.values()).filter((s) => {
      if (s.claimedByUserId !== null) return false;
      if (input.email && s.contactEmail === input.email) return true;
      if (input.githubLogin && s.source === 'github' && s.externalHandle === input.githubLogin)
        return true;
      return false;
    });
  }

  async findById(id: string): Promise<ShadowProfileSnapshot | null> {
    for (const s of this.byKey.values()) {
      if (s.id === id) return s;
    }
    return null;
  }

  async markClaimed(id: string, userId: string): Promise<ShadowProfileSnapshot> {
    for (const [key, s] of this.byKey.entries()) {
      if (s.id === id) {
        const claimed: ShadowProfileSnapshot = { ...s, claimedByUserId: userId };
        this.byKey.set(key, claimed);
        return claimed;
      }
    }
    throw new Error(`InMemoryShadowProfileRepository: id ${id} not found`);
  }
}
