import type {
  ViewCareerGraphInput,
  ViewCareerGraphOutput,
} from '../use-cases/view-career-graph/view-career-graph.dto';

export abstract class ViewCareerGraphPort {
  abstract execute(input: ViewCareerGraphInput): Promise<ViewCareerGraphOutput>;
}
