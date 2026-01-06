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

const fs = require('fs');
const path = require('path');

const METRICS_FILE = path.join(__dirname, '..', 'test-metrics.json');
const BASELINE_FILE = path.join(
  __dirname,
  '..',
  'docs',
  'test-metrics-baseline.md',
);
const SLOW_TEST_THRESHOLD_MS = 100; // Uncle Bob: unit tests should be fast
const TOTAL_TIME_TARGET_MS = 3000; // 3 seconds max for unit tests

function analyzeMetrics() {
  console.log('\n🔍 ANALYZING TEST METRICS...\n');

  if (!fs.existsSync(METRICS_FILE)) {
    console.error('❌ Error: test-metrics.json not found');
    console.error('   Run: npm run test:metrics');
    process.exit(1);
  }

  const rawData = fs.readFileSync(METRICS_FILE, 'utf-8');
  const metrics = JSON.parse(rawData);

  const analysis = {
    timestamp: new Date().toISOString(),
    summary: {},
    slowTests: [],
    suites: [],
    recommendations: [],
  };

  // Overall summary
  const totalTime = metrics.testResults.reduce(
    (sum, result) => sum + (result.perfStats?.runtime || 0),
    0,
  );
  const totalTests = metrics.numTotalTests;
  const passedTests = metrics.numPassedTests;
  const failedTests = metrics.numFailedTests;

  analysis.summary = {
    totalTests,
    passedTests,
    failedTests,
    totalTimeMs: Math.round(totalTime),
    totalTimeSec: (totalTime / 1000).toFixed(2),
    averageTimePerTest:
      totalTests > 0 ? (totalTime / totalTests).toFixed(2) : 0,
    status: totalTime <= TOTAL_TIME_TARGET_MS ? '✅ FAST' : '⚠️ SLOW',
  };

  // Analyze each test suite
  metrics.testResults.forEach((result) => {
    const runtime = result.perfStats?.runtime || 0;
    const suitePath = result.name.replace(process.cwd(), '');

    const suiteInfo = {
      path: suitePath,
      runtime: Math.round(runtime),
      tests: result.assertionResults.length,
      status: result.status,
    };

    analysis.suites.push(suiteInfo);

    // Find slow individual tests
    result.assertionResults.forEach((test) => {
      const testTime = test.duration || 0;
      if (testTime > SLOW_TEST_THRESHOLD_MS) {
        analysis.slowTests.push({
          suite: suitePath,
          test: test.title,
          duration: testTime,
          status: test.status,
        });
      }
    });
  });

  // Sort by runtime descending
  analysis.suites.sort((a, b) => b.runtime - a.runtime);
  analysis.slowTests.sort((a, b) => b.duration - a.duration);

  // Generate recommendations
  if (totalTime > TOTAL_TIME_TARGET_MS) {
    analysis.recommendations.push(
      `⚠️ Total test time (${analysis.summary.totalTimeSec}s) exceeds target (3s)`,
    );
    analysis.recommendations.push(
      '   → Consider parallelization or mocking external dependencies',
    );
  }

  if (analysis.slowTests.length > 0) {
    analysis.recommendations.push(
      `⚠️ Found ${analysis.slowTests.length} slow tests (>${SLOW_TEST_THRESHOLD_MS}ms)`,
    );
    analysis.recommendations.push(
      '   → Review database setup, network mocks, or computation logic',
    );
  }

  if (failedTests > 0) {
    analysis.recommendations.push(
      `❌ ${failedTests} tests failed - fix before proceeding`,
    );
  }

  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push('✅ All metrics within target thresholds');
    analysis.recommendations.push(
      '✅ Kent Beck approved: Fast feedback enabled',
    );
  }

  // Print results
  printAnalysis(analysis);

  // Save baseline if docs directory exists
  const docsDir = path.join(__dirname, '..', 'docs');
  if (fs.existsSync(docsDir)) {
    saveBaseline(analysis);
  }

  // Exit with error if tests failed or too slow
  if (failedTests > 0 || totalTime > TOTAL_TIME_TARGET_MS * 2) {
    process.exit(1);
  }
}

function printAnalysis(analysis) {
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

function saveBaseline(analysis) {
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

**Generated by:** analyze-test-metrics.js  
**Part of:** Kent Beck + Uncle Bob Testing Infrastructure Master Plan  
**Covenant Rule:** #4 - Fast Feedback Is Non-Negotiable
`;

  fs.writeFileSync(BASELINE_FILE, markdown);
  console.log(`📝 Baseline saved to: ${BASELINE_FILE}\n`);
}

// Run analysis
try {
  analyzeMetrics();
} catch (error) {
  console.error('❌ Error analyzing metrics:', error.message);
  process.exit(1);
}
