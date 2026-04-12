export interface AtsScoreBreakdown {
  criterion: string;
  score: number;
  weight: number;
  recommendation?: string;
}

export class AtsScore {
  constructor(
    readonly overall: number,
    readonly breakdown: AtsScoreBreakdown[],
    readonly recommendations: string[],
  ) {
    if (overall < 0 || overall > 100) {
      throw new Error('ATS score must be 0-100');
    }
  }

  isFriendly(): boolean {
    return this.overall >= 80;
  }

  static fromBreakdown(breakdown: AtsScoreBreakdown[]): AtsScore {
    const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
    const overall =
      totalWeight > 0
        ? Math.round(breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) / totalWeight)
        : 0;
    const recommendations = breakdown
      .filter((b) => b.recommendation && b.score < 80)
      .map((b) => b.recommendation as string);
    return new AtsScore(overall, breakdown, recommendations);
  }
}
