/**
 * Achievement payload stored under the `ACHIEVEMENT` section of the
 * user's resume. The `type` discriminator (`github_stars` / `custom`)
 * lets the rendering layer pick the right icon.
 */
export interface GitHubAchievementContent {
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly verificationUrl: string;
  readonly achievedAt: string;
  readonly value: number;
}
