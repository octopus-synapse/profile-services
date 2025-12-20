import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Using interfaces for clear data contracts with the GitHub API
interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  owner: {
    login: string;
  };
}

// DTO for creating DB records, using Prisma's generated types
type GitHubContributionInput = Prisma.OpenSourceContributionCreateManyInput;
type GitHubAchievementInput = Prisma.AchievementCreateManyInput;

@Injectable()
export class GitHubService {
  private readonly apiUrl = 'https://api.github.com';
  private readonly githubToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') || '';
  }

  private async fetchGitHub<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new HttpException(
          'GitHub resource not found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (response.status === 403) {
        throw new HttpException(
          'GitHub API rate limit exceeded',
          HttpStatus.FORBIDDEN,
        );
      }
      throw new HttpException(
        `Failed to fetch from GitHub: ${response.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch user's GitHub profile
   */
  async getUserProfile(username: string): Promise<GitHubUser> {
    return this.fetchGitHub<GitHubUser>(`/users/${username}`);
  }

  /**
   * Fetch user's repositories
   */
  async getUserRepos(
    username: string,
    options: {
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
      per_page?: number;
    } = {},
  ): Promise<GitHubRepo[]> {
    const sort = options.sort || 'updated';
    const perPage = options.per_page || 100;
    return this.fetchGitHub<GitHubRepo[]>(
      `/users/${username}/repos?sort=${sort}&per_page=${perPage}`,
    );
  }

  /**
   * Calculate total stars across all repos
   */
  async getTotalStars(username: string): Promise<number> {
    const repos = await this.getUserRepos(username);
    return repos.reduce((total, repo) => total + repo.stargazers_count, 0);
  }

  /**
   * Get commit count for a specific repository
   */
  async getRepoCommitCount(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      // For now, we'll fetch up to 100 commits as an estimate
      const allCommits = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/commits?author=${username}&per_page=100`,
      );
      return Array.isArray(allCommits) ? allCommits.length : 0;
    } catch {
      // If we can't access commits (private repo, etc), return 0
      return 0;
    }
  }

  /**
   * Get pull request count for a repository
   */
  async getRepoPullRequests(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      const prs = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/pulls?creator=${username}&state=all&per_page=100`,
      );
      return Array.isArray(prs) ? prs.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get issues created by user in a repository
   */
  async getRepoIssues(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      const issues = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/issues?creator=${username}&state=all&per_page=100`,
      );
      return Array.isArray(issues) ? issues.length : 0;
    } catch {
      return 0;
    }
  }

  // ... (rest of the file is unchanged for now)
  /**
   * Sync user's GitHub data to database.
   * This method orchestrates the fetching, processing, and storing of GitHub data.
   */
  async syncUserGitHub(
    userId: string,
    githubUsername: string,
    resumeId: string,
  ) {
    await this._verifyResumeOwnership(userId, resumeId);

    try {
      // Fetch GitHub profile
      const profile = await this.getUserProfile(githubUsername);
      const repos = await this.getUserRepos(githubUsername, {
        sort: 'updated',
        per_page: 100,
      });
      const totalStars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0,
      );

      await this._updateResumeWithGitHubStats(
        resumeId,
        githubUsername,
        totalStars,
      );

      const contributions = await this._fetchAndProcessContributions(
        resumeId,
        githubUsername,
        repos.slice(0, 20),
      );

      const achievements = this._generateAchievements(
        resumeId,
        githubUsername,
        profile,
        totalStars,
      );

      await this._reconcileDbEntries(
        resumeId,
        githubUsername,
        contributions,
        achievements,
      );

      return {
        success: true,
        profile: {
          username: profile.login,
          name: profile.name,
          bio: profile.bio,
          publicRepos: profile.public_repos,
        },
        stats: {
          totalStars,
          publicRepos: profile.public_repos,
          contributionsAdded: contributions.length,
          achievementsAdded: achievements.length,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to sync GitHub data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async _updateResumeWithGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ) {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        github: `https://github.com/${githubUsername}`,
        totalStars,
      },
    });
  }

  private async _fetchAndProcessContributions(
    resumeId: string,
    githubUsername: string,
    repos: GitHubRepo[],
  ): Promise<GitHubContributionInput[]> {
    const contributions: GitHubContributionInput[] = [];
    for (const repo of repos) {
      if (repo.stargazers_count > 0 || repo.owner.login === githubUsername) {
        const commits = await this.getRepoCommitCount(
          repo.owner.login,
          repo.name,
          githubUsername,
        );
        const pullRequests = await this.getRepoPullRequests(
          repo.owner.login,
          repo.name,
          githubUsername,
        );

        let role: 'maintainer' | 'core_contributor' | 'contributor';
        if (repo.owner.login === githubUsername) role = 'maintainer';
        else if (commits > 10 || pullRequests > 5) role = 'core_contributor';
        else role = 'contributor';

        contributions.push({
          resumeId,
          projectName: repo.name,
          projectUrl: repo.html_url,
          role,
          description: repo.description || undefined,
          technologies: repo.topics || (repo.language ? [repo.language] : []),
          commits: commits || undefined,
          prsCreated: pullRequests || undefined,
          stars: repo.stargazers_count > 0 ? repo.stargazers_count : undefined,
          startDate: new Date(repo.created_at),
          isCurrent:
            new Date(repo.pushed_at) >
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Active in last 90 days
        });
      }
    }
    return contributions;
  }

  private _generateAchievements(
    resumeId: string,
    githubUsername: string,
    profile: GitHubUser,
    totalStars: number,
  ): GitHubAchievementInput[] {
    const achievements: GitHubAchievementInput[] = [];
    if (totalStars >= 100) {
      achievements.push({
        resumeId,
        type: 'github_stars',
        title: `${totalStars}+ GitHub Stars`,
        description: `Accumulated ${totalStars} stars across all repositories`,
        verificationUrl: `https://github.com/${githubUsername}`,
        achievedAt: new Date(),
        value: totalStars,
      });
    }
    if (profile.public_repos >= 20) {
      achievements.push({
        resumeId,
        type: 'custom',
        title: `${profile.public_repos} Public Repositories`,
        description:
          'Active open source contributor with multiple public projects',
        verificationUrl: `https://github.com/${githubUsername}?tab=repositories`,
        achievedAt: new Date(),
        value: profile.public_repos,
      });
    }
    return achievements;
  }

  private async _reconcileDbEntries(
    resumeId: string,
    githubUsername: string,
    contributions: GitHubContributionInput[],
    achievements: GitHubAchievementInput[],
  ) {
    // Use a transaction to ensure atomicity
    return this.prisma.$transaction([
      // Delete existing GitHub-synced contributions
      this.prisma.openSourceContribution.deleteMany({
        where: {
          resumeId,
          projectUrl: { contains: 'github.com' },
        },
      }),
      // Create new contributions if any
      ...(contributions.length > 0
        ? [
            this.prisma.openSourceContribution.createMany({
              data: contributions,
            }),
          ]
        : []),
      // Delete existing GitHub achievements
      this.prisma.achievement.deleteMany({
        where: {
          resumeId,
          OR: [
            { type: 'github_stars' },
            { verificationUrl: { contains: `github.com/${githubUsername}` } },
          ],
        },
      }),
      // Create new achievements if any
      ...(achievements.length > 0
        ? [this.prisma.achievement.createMany({ data: achievements })]
        : []),
    ]);
  }

  /**
   * Get GitHub activity summary without syncing to database
   */
  async getGitHubSummary(username: string) {
    try {
      const profile = await this.getUserProfile(username);
      const repos = await this.getUserRepos(username, { per_page: 100 });
      const totalStars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0,
      );

      const topRepos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10)
        .map((repo) => ({
          name: repo.name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          url: repo.html_url,
        }));

      return {
        username: profile.login,
        name: profile.name,
        bio: profile.bio,
        publicRepos: profile.public_repos,
        totalStars,
        topRepos,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch GitHub summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Initiates a sync based on the GitHub URL already present in a resume.
   */
  async autoSyncGitHubFromResume(userId: string, resumeId: string) {
    const resume = await this._verifyResumeOwnership(userId, resumeId);

    if (!resume.github) {
      throw new HttpException(
        'No GitHub username found in resume',
        HttpStatus.BAD_REQUEST,
      );
    }

    const githubUsername = resume.github
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace('github.com/', '')
      .split('/')[0];

    return this.syncUserGitHub(userId, githubUsername, resumeId);
  }

  /**
   * Retrieves the sync status and stats for a given resume.
   */
  async getSyncStatus(userId: string, resumeId: string) {
    const resume = await this._verifyResumeOwnership(userId, resumeId, {
      openSource: { where: { projectUrl: { contains: 'github.com' } } },
      achievements: { where: { type: 'github_stars' } },
    });

    const openSourceList =
      'openSource' in resume ? (resume.openSource as unknown[]) : [];
    const achievementsList =
      'achievements' in resume ? (resume.achievements as unknown[]) : [];
    const updatedAt = resume.updatedAt;
    const github = (resume as { github?: string | null }).github;

    const githubUsername = github
      ? github
          .replace('https://github.com/', '')
          .replace('http://github.com/', '')
          .replace('github.com/', '')
          .split('/')[0]
      : null;

    return {
      hasSynced: openSourceList.length > 0 || achievementsList.length > 0,
      lastSyncedAt: updatedAt,
      githubUsername,
      stats: {
        totalStars: (resume as { totalStars?: number }).totalStars ?? 0,
        openSourceProjects: openSourceList.length,
        achievements: achievementsList.length,
      },
    };
  }

  /**
   * Verifies that a resume exists and belongs to the specified user.
   * Throws HttpException if checks fail.
   * @returns The resume object if ownership is verified.
   */
  private async _verifyResumeOwnership(
    userId: string,
    resumeId: string,
    include?: Prisma.ResumeInclude,
  ) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include,
    });

    if (!resume) {
      throw new HttpException('Resume not found', HttpStatus.NOT_FOUND);
    }

    if (resume.userId !== userId) {
      throw new HttpException(
        'You do not have permission to access this resume',
        HttpStatus.FORBIDDEN,
      );
    }
    return resume;
  }
}
