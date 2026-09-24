import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  buildExternalJobPosting,
  InMemoryExternalJobListingsRepository,
  InMemorySavedExternalJobsRepository,
} from '../../../testing';
import { GetExternalJobUseCase } from './get-external-job.use-case';

async function setup() {
  const listings = new InMemoryExternalJobListingsRepository();
  const saved = new InMemorySavedExternalJobsRepository();
  await listings.upsertByExternalId(
    buildExternalJobPosting({ externalId: 'external-a' }),
    'hash',
    'developer',
    new Date(),
  );
  const listing = listings.rows[0];
  const snapshot = await saved.createFromListing('owner', listing);
  return {
    listings,
    saved,
    listing,
    snapshot,
    useCase: new GetExternalJobUseCase(listings, saved, stubLogger),
  };
}
describe('external job detail', () => {
  it('loads a live job without a previous list request and annotates the viewer save', async () => {
    const { useCase, listing, snapshot } = await setup();
    expect(await useCase.execute(listing.id, 'owner')).toMatchObject({
      id: listing.id,
      savedId: snapshot.id,
    });
    expect(await useCase.execute(listing.id, 'other')).toMatchObject({
      id: listing.id,
      savedId: null,
    });
  });
  it('resolves a saved link to the canonical live id for master matching', async () => {
    const { useCase, snapshot, listing } = await setup();
    expect(await useCase.execute(snapshot.id, 'owner')).toMatchObject({
      id: listing.id,
      savedId: snapshot.id,
    });
  });
  it('keeps owned snapshots readable after retention and hides other users snapshots', async () => {
    const { useCase, listings, snapshot } = await setup();
    listings.rows.length = 0;
    expect(await useCase.execute(snapshot.id, 'owner')).toMatchObject({
      id: snapshot.id,
      title: snapshot.title,
    });
    await expect(useCase.execute(snapshot.id, 'other')).rejects.toThrow();
    await expect(useCase.execute('missing', 'owner')).rejects.toThrow();
  });
});
