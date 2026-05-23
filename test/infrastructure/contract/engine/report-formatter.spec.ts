import { describe, expect, test } from 'bun:test';
import { formatReport } from './report-formatter';
import type { RouteDriftReport } from './response-validator';

describe('formatReport', () => {
  test('reports zero drifts with an explicit success line', () => {
    const md = formatReport([
      { route: 'GET /v1/foo', status: 200, persona: 'anonymous', drifts: [] },
    ]);
    expect(md).toContain('Total drifts: 0');
    expect(md).toContain('All probed endpoints match their declared response schemas.');
  });

  test('groups drifts by BC and renders each kind', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/users/me',
        status: 200,
        persona: 'user',
        drifts: [
          { kind: 'extra-field', path: ['secret'] },
          { kind: 'missing-field', path: ['email'], expected: 'string' },
          { kind: 'should-be-nullable', path: ['name'] },
          { kind: 'should-be-optional', path: ['age'] },
          { kind: 'type-mismatch', path: ['age'], expected: 'number', actual: 'string' },
        ],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## users (5 drifts)');
    expect(md).toContain('### GET /v1/users/me → 200 (persona=user)');
    expect(md).toContain('extra field: `secret`');
    expect(md).toContain('missing field: `email`');
    expect(md).toContain('should be nullable: `name`');
    expect(md).toContain('should be optional: `age`');
    expect(md).toContain('type mismatch: `age` (schema=number, runtime=string)');
  });

  test('omits BC sections that have zero drifts', () => {
    const reports: RouteDriftReport[] = [
      { route: 'GET /v1/users/me', status: 200, persona: 'user', drifts: [] },
      {
        route: 'GET /v1/jobs',
        status: 200,
        persona: 'admin',
        drifts: [{ kind: 'extra-field', path: ['internal'] }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## jobs (1 drifts)');
    expect(md).not.toContain('## users');
  });

  test('surfaces probe errors next to the route', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/foo',
        status: 0,
        persona: 'anonymous',
        drifts: [],
        error: 'connection refused',
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## foo');
    expect(md).toContain('error: connection refused');
  });

  test('renders <root> when a drift path is empty', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/x',
        status: 200,
        persona: 'anonymous',
        drifts: [{ kind: 'type-mismatch', path: [], expected: 'object', actual: 'string' }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('type mismatch: `<root>`');
  });

  test('total drifts header counts across reports', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/a',
        status: 200,
        persona: 'anonymous',
        drifts: [{ kind: 'extra-field', path: ['x'] }],
      },
      {
        route: 'GET /v1/b',
        status: 200,
        persona: 'admin',
        drifts: [
          { kind: 'extra-field', path: ['y'] },
          { kind: 'missing-field', path: ['z'], expected: 'string' },
        ],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('Total drifts: 3');
    expect(md).toContain('Probed: 2 endpoints');
  });

  test('renders auth-mismatch drifts when the chosen persona was rejected', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/admin/users',
        status: 403,
        persona: 'user',
        drifts: [{ kind: 'auth-mismatch', path: [], persona: 'user', status: 403 }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('### GET /v1/admin/users → 403 (persona=user)');
    expect(md).toContain('auth mismatch: persona=`user` got HTTP 403');
  });
});
