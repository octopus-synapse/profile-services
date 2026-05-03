/**
 * Resumes Bounded Context Exceptions
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ResumeSnapshotNotSerializableException extends DomainException {
  readonly code: string = 'RESUME_SNAPSHOT_NOT_SERIALIZABLE';
  readonly statusHint = 500;
  constructor() {
    super('Snapshot contains a non-JSON-serializable value');
  }
}
