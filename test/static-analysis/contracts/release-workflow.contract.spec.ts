import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadAll } from 'js-yaml';

type WorkflowStep = {
  name?: string;
  run?: string;
};

type WorkflowJob = {
  steps?: WorkflowStep[];
};

type WorkflowDocument = {
  jobs?: Record<string, WorkflowJob>;
};

// Project root - all paths are relative to this
const PROJECT_ROOT = resolve(__dirname, '../../..');
const RELEASE_WORKFLOW_PATH = join(PROJECT_ROOT, '.github/workflows/release.yml');

function readWorkflowDocuments(): WorkflowDocument[] {
  return loadAll(readFileSync(RELEASE_WORKFLOW_PATH, 'utf8')) as WorkflowDocument[];
}

function readReleaseNotesStep(): WorkflowStep {
  const documents = readWorkflowDocuments();

  expect(documents).toHaveLength(1);

  const workflow = documents[0];
  const step = workflow.jobs?.['build-and-push']?.steps?.find(
    (entry) => entry.name === 'Update release notes with Docker info',
  );

  expect(step).toBeDefined();
  expect(step?.run).toBeDefined();

  return step as WorkflowStep;
}

function renderShellScriptForSyntaxCheck(runScript: string): string {
  const renderedRunScript = runScript.replace(
    /\$\{\{\s*[^}]+\s*\}\}/g,
    'octopus-synapse/profile-services',
  );

  return [
    'TAG=v0.0.1',
    'GH_TOKEN=test-token',
    'IMAGE_NAME=ghcr.io/octopus-synapse/profile-services',
    '',
    renderedRunScript,
  ].join('\n');
}

function syntaxCheck(script: string) {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'release-workflow-'));
  const scriptPath = join(tempDirectory, 'update-release-notes.sh');

  writeFileSync(scriptPath, script);

  const result = spawnSync('bash', ['-n', scriptPath], {
    encoding: 'utf8',
  });

  rmSync(tempDirectory, { recursive: true, force: true });

  return result;
}

describe('Release workflow contract', () => {
  test('workflow remains a single YAML document', () => {
    expect(readWorkflowDocuments()).toHaveLength(1);
  });

  test('release notes update step stays shell-parseable', () => {
    const releaseNotesStep = readReleaseNotesStep();
    const script = renderShellScriptForSyntaxCheck(releaseNotesStep.run as string);
    const result = syntaxCheck(script);

    expect(releaseNotesStep.run).toContain('--notes-file');
    expect(result.status).toBe(0);

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'bash -n failed without output');
    }
  });
});
