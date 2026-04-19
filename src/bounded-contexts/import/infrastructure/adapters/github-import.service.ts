import { Injectable, Logger } from '@nestjs/common';
import { graphql } from '@octokit/graphql';
import { OAuthService } from '@/bounded-contexts/identity/oauth/services/oauth.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConflictException } from '@/shared-kernel/exceptions/domain.exceptions';

type GithubViewer = {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  avatarUrl: string;
  url: string;
  repositories: {
    nodes: Array<{
      id: string;
      name: string;
      nameWithOwner: string;
      description: string | null;
      url: string;
      stargazerCount: number;
      primaryLanguage: { name: string } | null;
      languages: { edges: Array<{ size: number; node: { name: string } }> };
      repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
      openGraphImageUrl?: string;
    }>;
  };
};

/** Minimum stars before we auto-create a BUILD post for a repo. */
const BUILD_POST_STAR_THRESHOLD = 5;
/** Max BUILD posts we create per import — keep the feed usable. */
const MAX_BUILD_POSTS = 3;
/** Top N languages we keep as `primaryStack`. */
const PRIMARY_STACK_SIZE = 10;

const VIEWER_QUERY = `
  query {
    viewer {
      login
      name
      bio
      location
      company
      avatarUrl
      url
      repositories(
        first: 30
        ownerAffiliations: OWNER
        orderBy: { field: STARGAZERS, direction: DESC }
        privacy: PUBLIC
      ) {
        nodes {
          id
          name
          nameWithOwner
          description
          url
          stargazerCount
          primaryLanguage { name }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges { size, node { name } }
          }
          repositoryTopics(first: 10) {
            nodes { topic { name } }
          }
          openGraphImageUrl
        }
      }
    }
  }
`;

export type GithubImportResult = {
  userId: string;
  primaryStack: string[];
  buildPostsCreated: number;
  profileUpdated: boolean;
};

@Injectable()
export class GithubImportService {
  private readonly logger = new Logger(GithubImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: OAuthService,
  ) {}

  async import(userId: string): Promise<GithubImportResult> {
    const token = await this.oauth.getAccessToken(userId, 'github');
    if (!token) {
      throw new ConflictException('GITHUB_NOT_CONNECTED');
    }

    const client = graphql.defaults({ headers: { authorization: `token ${token}` } });
    const { viewer } = (await client<{ viewer: GithubViewer }>(VIEWER_QUERY)) as {
      viewer: GithubViewer;
    };

    // 1. Aggregate languages across all repos, weighted by bytes of code.
    const byteWeights = new Map<string, number>();
    for (const repo of viewer.repositories.nodes) {
      for (const edge of repo.languages.edges) {
        byteWeights.set(edge.node.name, (byteWeights.get(edge.node.name) ?? 0) + edge.size);
      }
    }
    const primaryStack = Array.from(byteWeights.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, PRIMARY_STACK_SIZE)
      .map(([lang]) => lang);

    // 2. Fill missing profile bits (non-destructive: only sets fields that are
    //    currently null/empty on the User row).
    const profileUpdated = await this.applyProfileFields(userId, viewer);

    // 3. Merge primaryStack into the user's primary resume when one exists —
    //    we don't create a Resume implicitly; that's the onboarding flow's job.
    await this.applyPrimaryStack(userId, primaryStack);

    // 4. Create BUILD posts for top-starred repos above the threshold.
    const buildPostsCreated = await this.createBuildPosts(userId, viewer);

    this.logger.log(
      `GitHub import for ${userId}: ${primaryStack.length} langs, ${buildPostsCreated} builds`,
    );
    return { userId, primaryStack, buildPostsCreated, profileUpdated };
  }

  private async applyProfileFields(userId: string, viewer: GithubViewer): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bio: true, location: true, photoURL: true, github: true, name: true },
    });
    if (!user) return false;

    const patch: Record<string, string> = {};
    if (!user.bio && viewer.bio) patch.bio = viewer.bio;
    if (!user.location && viewer.location) patch.location = viewer.location;
    if (!user.photoURL && viewer.avatarUrl) patch.photoURL = viewer.avatarUrl;
    if (!user.github && viewer.url) patch.github = viewer.url;
    if (!user.name && viewer.name) patch.name = viewer.name;

    if (Object.keys(patch).length === 0) return false;
    await this.prisma.user.update({ where: { id: userId }, data: patch });
    return true;
  }

  private async applyPrimaryStack(userId: string, stack: string[]): Promise<void> {
    if (stack.length === 0) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });
    if (!user?.primaryResumeId) return;

    const resume = await this.prisma.resume.findUnique({
      where: { id: user.primaryResumeId },
      select: { primaryStack: true },
    });
    const current = new Set(resume?.primaryStack ?? []);
    // Additive merge — never nukes stacks the user curated by hand.
    for (const s of stack) current.add(s);
    await this.prisma.resume.update({
      where: { id: user.primaryResumeId },
      data: { primaryStack: Array.from(current) },
    });
  }

  private async createBuildPosts(userId: string, viewer: GithubViewer): Promise<number> {
    const candidates = viewer.repositories.nodes
      .filter((r) => r.stargazerCount >= BUILD_POST_STAR_THRESHOLD)
      .slice(0, MAX_BUILD_POSTS);

    let created = 0;
    for (const repo of candidates) {
      // Idempotent: skip if a BUILD post already linking to this repo exists.
      const existing = await this.prisma.post.findFirst({
        where: { authorId: userId, type: 'BUILD', linkUrl: repo.url },
        select: { id: true },
      });
      if (existing) continue;

      const stack = repo.languages.edges.slice(0, 5).map((e) => e.node.name);
      const topics = repo.repositoryTopics.nodes.map((n) => n.topic.name);

      await this.prisma.post.create({
        data: {
          authorId: userId,
          type: 'BUILD',
          content: repo.description ?? repo.name,
          hashtags: topics.slice(0, 6),
          hardSkills: stack,
          linkUrl: repo.url,
          imageUrl: repo.openGraphImageUrl ?? null,
          data: {
            repoName: repo.nameWithOwner,
            stars: repo.stargazerCount,
            stack,
            repoUrl: repo.url,
            primaryLanguage: repo.primaryLanguage?.name ?? null,
          },
        },
      });
      created++;
    }
    return created;
  }
}
