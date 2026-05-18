import { PasswordHasherPort } from '../../../domain/ports';

// P1-#A1-17: cost is injected by composition via ConfigPort (validated
// by `EnvConfigSchema.BCRYPT_COST`, min(10).default(12)).
export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly cost: number) {}

  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: this.cost });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
