#!/usr/bin/env node
/**
 * Test Metrics Analysis Script
 *
 * Analyzes Jest test execution metrics to identify:
 * - Total test execution time
 * - Slowest tests
 * - Test count per suite
 * - Performance trends
 *
 * Part of Kent Beck + Uncle Bob Testing Infrastructure
 * COVENANT RULE #4: Fast Feedback Is Non-Negotiable
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestMetrics {
  testResults: Array<{
    name: string;
    perfStats?: { runtime: number };
    assertionResults: Array<{
      title: string;
      duration?: number;
      status: string;
    }>;
    status: string;
  }>;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
}

interface TestSuiteInfo {
  path: string;
  runtime: number;
  tests: number;
  status: string;
}

interface SlowTestInfo {
  suite: string;
  test: string;
  duration: number;
  status: string;
}

interface AnalysisSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalTimeMs: number;
  totalTimeSec: string;
  averageTimePerTest: string;
  status: string;
}

interface AnalysisResult {
  timestamp: string;
  summary: AnalysisSummary;
  slowTests: SlowTestInfo[];
  suites: TestSuiteInfo[];
  recommendations: string[];
}

const METRICS_FILE_PATH = join(__dirname, '..', 'test-metrics.json');
const BASELINE_FILE_PATH = join(
  __dirname,
  '..',
  'docs',
  'test-metrics-baseline.md',
);
const SLOW_TEST_THRESHOLD_MS = 100; // Uncle Bob: unit tests should be fast
const TOTAL_TIME_TARGET_MS = 3000; // 3 seconds max for unit tests

function loadTestMetrics(): TestMetrics {
  if (!existsSync(METRICS_FILE_PATH)) {
    console.error('❌ Error: test-metrics.json not found');
    console.error('   Run: npm run test:metrics');
    process.exit(1);
  }

  const rawData = readFileSync(METRICS_FILE_PATH, 'utf-8');
  return JSON.parse(rawData) as TestMetrics;
}

function calculateTotalExecutionTime(
  testResults: TestMetrics['testResults'],
): number {
  return testResults.reduce(
    (sum, result) => sum + (result.perfStats?.runtime || 0),
    0,
  );
}

function extractSlowTests(
  testResults: TestMetrics['testResults'],
  basePath: string,
): SlowTestInfo[] {
  const slowTests: SlowTestInfo[] = [];

  testResults.forEach((result) => {
    const suitePath = result.name.replace(basePath, '');

    result.assertionResults.forEach((test) => {
      const testTime = test.duration || 0;
      if (testTime > SLOW_TEST_THRESHOLD_MS) {
        slowTests.push({
          suite: suitePath,
          test: test.title,
          duration: testTime,
          status: test.status,
        });
      }
    });
  });

  return slowTests.sort((a, b) => b.duration - a.duration);
}

function extractTestSuiteInfo(
  testResults: TestMetrics['testResults'],
  basePath: string,
): TestSuiteInfo[] {
  return testResults
    .map((result) => ({
      path: result.name.replace(basePath, ''),
      runtime: Math.round(result.perfStats?.runtime || 0),
      tests: result.assertionResults.length,
      status: result.status,
    }))
    .sort((a, b) => b.runtime - a.runtime);
}

function generateRecommendations(
  totalTime: number,
  slowTests: SlowTestInfo[],
  failedTests: number,
): string[] {
  const recommendations: string[] = [];

  if (totalTime > TOTAL_TIME_TARGET_MS) {
    recommendations.push(
      `⚠️ Total test time (${(totalTime / 1000).toFixed(2)}s) exceeds target (3s)`,
    );
    recommendations.push(
      '   → Consider parallelization or mocking external dependencies',
    );
  }

  if (slowTests.length > 0) {
    recommendations.push(
      `⚠️ Found ${slowTests.length} slow tests (>${SLOW_TEST_THRESHOLD_MS}ms)`,
    );
    recommendations.push(
      '   → Review database setup, network mocks, or computation logic',
    );
  }

  if (failedTests > 0) {
    recommendations.push(
      `❌ ${failedTests} tests failed - fix before proceeding`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All metrics within target thresholds');
    recommendations.push(
      '✅ Kent Beck approved: Fast feedback enabled',
    );
  }

  return recommendations;
}

function analyzeTestMetrics(): AnalysisResult {
  console.log('\n🔍 ANALYZING TEST METRICS...\n');

  const metrics = loadTestMetrics();
  const basePath = process.cwd();
  const totalTime = calculateTotalExecutionTime(metrics.testResults);
  const slowTests = extractSlowTests(metrics.testResults, basePath);
  const suites = extractTestSuiteInfo(metrics.testResults, basePath);
  const recommendations = generateRecommendations(
    totalTime,
    slowTests,
    metrics.numFailedTests,
  );

  const summary: AnalysisSummary = {
    totalTests: metrics.numTotalTests,
    passedTests: metrics.numPassedTests,
    failedTests: metrics.numFailedTests,
    totalTimeMs: Math.round(totalTime),
    totalTimeSec: (totalTime / 1000).toFixed(2),
    averageTimePerTest:
      metrics.numTotalTests > 0
        ? (totalTime / metrics.numTotalTests).toFixed(2)
        : '0',
    status: totalTime <= TOTAL_TIME_TARGET_MS ? '✅ FAST' : '⚠️ SLOW',
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    slowTests,
    suites,
    recommendations,
  };
}

function printAnalysisResults(analysis: AnalysisResult): void {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TEST METRICS ANALYSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📊 SUMMARY');
  console.log(`   Total Tests:    ${analysis.summary.totalTests}`);
  console.log(`   Passed:         ${analysis.summary.passedTests} ✅`);
  console.log(
    `   Failed:         ${analysis.summary.failedTests} ${analysis.summary.failedTests > 0 ? '❌' : '✅'}`,
  );
  console.log(
    `   Total Time:     ${analysis.summary.totalTimeSec}s ${analysis.summary.status}`,
  );
  console.log(`   Avg per Test:   ${analysis.summary.averageTimePerTest}ms\n`);

  if (analysis.suites.length > 0) {
    console.log('🐌 SLOWEST TEST SUITES (Top 10)');
    analysis.suites.slice(0, 10).forEach((suite, i) => {
      const bar = '█'.repeat(Math.min(Math.floor(suite.runtime / 50), 40));
      console.log(`   ${(i + 1).toString().padStart(2)}. ${suite.path}`);
      console.log(`       ${suite.runtime}ms ${bar} (${suite.tests} tests)`);
    });
    console.log();
  }

  if (analysis.slowTests.length > 0) {
    console.log(
      `⏱️  SLOW INDIVIDUAL TESTS (>${SLOW_TEST_THRESHOLD_MS}ms, Top 10)`,
    );
    analysis.slowTests.slice(0, 10).forEach((test, i) => {
      console.log(
        `   ${(i + 1).toString().padStart(2)}. ${test.duration}ms - ${test.test}`,
      );
      console.log(`       ${test.suite}`);
    });
    console.log();
  }

  if (analysis.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS');
    analysis.recommendations.forEach((rec) => {
      console.log(`   ${rec}`);
    });
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

function saveBaselineReport(analysis: AnalysisResult): void {
  const docsDirectory = join(__dirname, '..', 'docs');
  if (!existsSync(docsDirectory)) {
    return;
  }

  const markdown = `# Test Metrics Baseline

**Last Updated:** ${analysis.timestamp}

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Tests | ${analysis.summary.totalTests} | - | - |
| Passed Tests | ${analysis.summary.passedTests} | ${analysis.summary.totalTests} | ${analysis.summary.failedTests === 0 ? '✅' : '❌'} |
| Failed Tests | ${analysis.summary.failedTests} | 0 | ${analysis.summary.failedTests === 0 ? '✅' : '❌'} |
| Total Time | ${analysis.summary.totalTimeSec}s | 3.0s | ${analysis.summary.status} |
| Avg Time/Test | ${analysis.summary.averageTimePerTest}ms | <50ms | ${parseFloat(analysis.summary.averageTimePerTest) < 50 ? '✅' : '⚠️'} |

## Slowest Test Suites

| Rank | Suite | Runtime | Tests |
|------|-------|---------|-------|
${analysis.suites
  .slice(0, 10)
  .map(
    (suite, i) =>
      `| ${i + 1} | ${suite.path} | ${suite.runtime}ms | ${suite.tests} |`,
  )
  .join('\n')}

## Slow Individual Tests (>${SLOW_TEST_THRESHOLD_MS}ms)

| Rank | Duration | Test | Suite |
|------|----------|------|-------|
${analysis.slowTests
  .slice(0, 10)
  .map(
    (test, i) =>
      `| ${i + 1} | ${test.duration}ms | ${test.test} | ${test.suite} |`,
  )
  .join('\n')}

${analysis.slowTests.length === 0 ? '✅ No slow tests detected\n' : ''}

## Recommendations

${analysis.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Kent Beck Compliance

- **Fast Feedback:** ${analysis.summary.totalTimeMs <= TOTAL_TIME_TARGET_MS ? '✅ PASS' : '❌ FAIL'} (${analysis.summary.totalTimeSec}s / 3.0s target)
- **Slow Tests:** ${analysis.slowTests.length === 0 ? '✅ NONE' : `⚠️ ${analysis.slowTests.length} found`}
- **Test Reliability:** ${analysis.summary.failedTests === 0 ? '✅ 100%' : `❌ ${((analysis.summary.passedTests / analysis.summary.totalTests) * 100).toFixed(1)}%`}

---

**Generated by:** analyze-test-metrics.ts  
**Part of:** Kent Beck + Uncle Bob Testing Infrastructure Master Plan  
**Covenant Rule:** #4 - Fast Feedback Is Non-Negotiable
`;

  writeFileSync(BASELINE_FILE_PATH, markdown);
  console.log(`📝 Baseline saved to: ${BASELINE_FILE_PATH}\n`);
}

function main(): void {
  try {
    const analysis = analyzeTestMetrics();
    printAnalysisResults(analysis);
    saveBaselineReport(analysis);

    // Exit with error if tests failed or too slow
    if (
      analysis.summary.failedTests > 0 ||
      analysis.summary.totalTimeMs > TOTAL_TIME_TARGET_MS * 2
    ) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '❌ Error analyzing metrics:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
