import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 *
 * Validates username/password credentials during login.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
