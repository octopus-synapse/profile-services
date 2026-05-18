import { PasswordHasherPort } from '../../domain/ports';

// P1-#A1-17: cost is injected by composition via ConfigPort
// (`EnvConfigSchema.BCRYPT_COST` enforces `min(10).default(12)`),
// so this adapter no longer reads `process.env` directly. Tests
// override the schema via fixtures, not via env at module load.
export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly cost: number) {}

  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: this.cost });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
