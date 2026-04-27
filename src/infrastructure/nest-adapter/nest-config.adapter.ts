import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigPort } from '@/shared-kernel/config/config.port';

@Injectable()
export class NestConfigAdapter extends ConfigPort {
  constructor(private readonly cfg: ConfigService) {
    super();
  }

  get<T = string>(key: string): T | undefined {
    return this.cfg.get<T>(key);
  }

  getOrDefault<T = string>(key: string, defaultValue: T): T {
    const v = this.cfg.get<T>(key);
    return v === undefined ? defaultValue : v;
  }
}
