import type {
  ViewCareerGraphInput,
  ViewCareerGraphOutput,
} from '../use-cases/view-career-graph/view-career-graph.dto';

export interface ViewCareerGraphPort {
  execute(input: ViewCareerGraphInput): Promise<ViewCareerGraphOutput>;
}

export const VIEW_CAREER_GRAPH_PORT = Symbol('ViewCareerGraphPort');
