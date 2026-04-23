import { Injectable } from '@nestjs/common';
import {
  RequirementsMatcherPort,
  type RequirementsMatchInput,
  type RequirementsMatchResult,
} from '../../domain/ports/requirements-matcher.port';

/**
 * Placeholder Requirements Matcher — returns a conservative 70 with an
 * empty matched/missing set. Task #19 replaces this with a hybrid
 * code-plus-AI implementation that normalises resume strings into the
 * structured slots the recruiter filled and emits per-slot evidence.
 *
 * Kill-switch: `scoring.match.semantic.enabled` covers semantic; when
 * we ship the real requirements adapter we'll add a dedicated flag.
 */
@Injectable()
export class RequirementsMatcherStubAdapter extends RequirementsMatcherPort {
  async match(_input: RequirementsMatchInput): Promise<RequirementsMatchResult> {
    return { score: 70, detail: { matchedSlots: [], missingSlots: [] } };
  }
}
