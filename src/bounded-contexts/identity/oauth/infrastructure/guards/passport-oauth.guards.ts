/**
 * Passport-backed guards for the route synthesizer's guard registry.
 * Each subclass extends `AuthGuard('<strategy>')` so Nest's Passport
 * integration wires the redirect-then-callback flow we already had on
 * the legacy controller. Existence here keeps the OAuth routes
 * descriptor-only — the BC's module references these classes from its
 * `synthesizeRouteControllers` registry.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {}

@Injectable()
export class LinkedinOAuthGuard extends AuthGuard('linkedin') {}
