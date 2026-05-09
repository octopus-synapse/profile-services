export type Persona = 'admin' | 'user' | 'no-perms' | 'anonymous';

interface SessionPoolConfig {
  readonly baseUrl: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly userEmail: string;
  readonly userPassword: string;
  readonly noPermsEmail: string;
  readonly noPermsPassword: string;
}

async function login(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 423) {
      console.warn(
        `Account locked for ${email} — run 'SEED_DREDD_FIXTURES=1 bun run prisma/seed.ts' to clear failed login attempts`,
      );
      return undefined;
    }
    if (!res.ok) {
      console.warn(`Login failed for ${email}: ${res.status}`);
      return undefined;
    }
    const setCookie = res.headers.get('set-cookie') ?? '';
    const match = /access_token=([^;]+)/.exec(setCookie);
    return match?.[1];
  } catch (err) {
    console.warn(`Login error for ${email}: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

export class SessionPool {
  private tokens: { admin?: string; user?: string; noPerms?: string } = {};
  private readonly config: SessionPoolConfig;

  private constructor(config: SessionPoolConfig) {
    this.config = config;
  }

  static fromEnv(): SessionPool {
    return new SessionPool({
      baseUrl: process.env.DRIFT_BASE_URL ?? 'http://localhost:3010',
      adminEmail:
        process.env.DRIFT_ADMIN_EMAIL ?? process.env.DREDD_ADMIN_EMAIL ?? 'admin@example.com',
      adminPassword:
        process.env.DRIFT_ADMIN_PASSWORD ?? process.env.DREDD_ADMIN_PASSWORD ?? 'Admin123!@#',
      userEmail:
        process.env.DRIFT_USER_EMAIL ??
        process.env.DREDD_USER_EMAIL ??
        'dredd-fixture@profile.local',
      userPassword:
        process.env.DRIFT_USER_PASSWORD ??
        process.env.DREDD_USER_PASSWORD ??
        'Dredd_Fixture_Password_123!',
      noPermsEmail: process.env.DREDD_NOPERMS_EMAIL ?? 'dredd-noperms@profile.local',
      // Fixture users share one password — see prisma/seeds/dredd-fixtures.seed.ts
      noPermsPassword: process.env.DREDD_NOPERMS_PASSWORD ?? 'Dredd_Fixture_Password_123!',
    });
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async boot(): Promise<void> {
    const [admin, user, noPerms] = await Promise.all([
      login(this.config.baseUrl, this.config.adminEmail, this.config.adminPassword),
      login(this.config.baseUrl, this.config.userEmail, this.config.userPassword),
      login(this.config.baseUrl, this.config.noPermsEmail, this.config.noPermsPassword),
    ]);
    if (!admin)
      console.warn('Admin login failed — admin-gated routes will report auth-mismatch drifts.');
    if (!user)
      console.warn('Regular user login failed — JWT routes will report auth-mismatch drifts.');
    this.tokens = { admin, user, noPerms };
  }

  tokenFor(persona: Persona): string | undefined {
    if (persona === 'anonymous') return undefined;
    if (persona === 'admin') return this.tokens.admin;
    if (persona === 'no-perms') return this.tokens.noPerms;
    return this.tokens.user;
  }
}
