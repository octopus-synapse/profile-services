/**
 * Cross-BC test mocks.
 *
 * Drop a builder here when the same mock shape is reconstructed in
 * 2+ spec files across different bounded contexts. BC-specific mocks
 * stay local — see Q59 in the duplication audit.
 */
export * from './event-publisher.mock';
