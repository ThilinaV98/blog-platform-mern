#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate comprehensive test report combining Jest and Playwright results
 */
async function generateTestReport() {
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    },
    coverage: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    suites: {
      unit: {},
      integration: {},
      e2e: {},
    },
  };

  // Read Jest coverage report
  try {
    const jestCoverage = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'), 'utf8')
    );
    
    reportData.coverage = {
      statements: jestCoverage.total.statements.pct,
      branches: jestCoverage.total.branches.pct,
      functions: jestCoverage.total.functions.pct,
      lines: jestCoverage.total.lines.pct,
    };
  } catch (error) {
    console.warn('Could not read Jest coverage report:', error.message);
  }

  // Read Jest test results
  try {
    const jestResults = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'coverage', 'test-results.json'), 'utf8')
    );
    
    reportData.suites.unit = {
      total: jestResults.numTotalTests,
      passed: jestResults.numPassedTests,
      failed: jestResults.numFailedTests,
      skipped: jestResults.numPendingTests,
      duration: jestResults.testResults.reduce((sum, r) => sum + r.perfStats.runtime, 0),
    };
    
    reportData.summary.total += jestResults.numTotalTests;
    reportData.summary.passed += jestResults.numPassedTests;
    reportData.summary.failed += jestResults.numFailedTests;
    reportData.summary.skipped += jestResults.numPendingTests;
  } catch (error) {
    console.warn('Could not read Jest test results:', error.message);
  }

  // Read Playwright test results
  try {
    const playwrightResults = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'test-results', 'results.json'), 'utf8')
    );
    
    const e2eStats = playwrightResults.suites.reduce(
      (acc, suite) => {
        acc.total += suite.specs.length;
        suite.specs.forEach(spec => {
          if (spec.tests.every(t => t.status === 'passed')) acc.passed++;
          else if (spec.tests.some(t => t.status === 'failed')) acc.failed++;
          else if (spec.tests.every(t => t.status === 'skipped')) acc.skipped++;
        });
        acc.duration += suite.specs.reduce((sum, s) => sum + s.duration, 0);
        return acc;
      },
      { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    );
    
    reportData.suites.e2e = e2eStats;
    reportData.summary.total += e2eStats.total;
    reportData.summary.passed += e2eStats.passed;
    reportData.summary.failed += e2eStats.failed;
    reportData.summary.skipped += e2eStats.skipped;
    reportData.summary.duration += e2eStats.duration;
  } catch (error) {
    console.warn('Could not read Playwright test results:', error.message);
  }

  // Generate HTML report
  const html = generateHTML(reportData);
  fs.writeFileSync(path.join(__dirname, '..', 'test-report.html'), html);

  // Generate Markdown summary
  const markdown = generateMarkdown(reportData);
  fs.writeFileSync(path.join(__dirname, '..', 'test-report.md'), markdown);

  // Generate JSON report
  fs.writeFileSync(
    path.join(__dirname, '..', 'test-report.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log('Test report generated successfully!');
  console.log(`Total tests: ${reportData.summary.total}`);
  console.log(`Passed: ${reportData.summary.passed}`);
  console.log(`Failed: ${reportData.summary.failed}`);
  console.log(`Coverage: ${reportData.coverage.lines.toFixed(2)}%`);
}

function generateHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${new Date(data.timestamp).toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 1rem; }
    .timestamp { color: #666; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h3 { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase; }
    .card .value { font-size: 2rem; font-weight: bold; }
    .card.passed .value { color: #10b981; }
    .card.failed .value { color: #ef4444; }
    .card.coverage .value { color: #3b82f6; }
    .progress { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .progress-bar { height: 100%; background: #10b981; transition: width 0.3s; }
    .progress-bar.warn { background: #f59e0b; }
    .progress-bar.error { background: #ef4444; }
    .section { background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; font-weight: 500; }
    .badge.passed { background: #d1fae5; color: #065f46; }
    .badge.failed { background: #fee2e2; color: #991b1b; }
    .badge.skipped { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Test Report</h1>
      <div class="timestamp">Generated on ${new Date(data.timestamp).toLocaleString()}</div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Total Tests</h3>
        <div class="value">${data.summary.total}</div>
      </div>
      <div class="card passed">
        <h3>Passed</h3>
        <div class="value">${data.summary.passed}</div>
        <div class="progress">
          <div class="progress-bar" style="width: ${(data.summary.passed / data.summary.total * 100).toFixed(1)}%"></div>
        </div>
      </div>
      <div class="card failed">
        <h3>Failed</h3>
        <div class="value">${data.summary.failed}</div>
      </div>
      <div class="card coverage">
        <h3>Coverage</h3>
        <div class="value">${data.coverage.lines.toFixed(1)}%</div>
        <div class="progress">
          <div class="progress-bar ${data.coverage.lines < 70 ? 'error' : data.coverage.lines < 80 ? 'warn' : ''}" 
               style="width: ${data.coverage.lines}%"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Coverage Details</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Statements</td>
            <td>${data.coverage.statements.toFixed(2)}%</td>
            <td><span class="badge ${data.coverage.statements >= 80 ? 'passed' : 'failed'}">${data.coverage.statements >= 80 ? 'Good' : 'Needs Improvement'}</span></td>
          </tr>
          <tr>
            <td>Branches</td>
            <td>${data.coverage.branches.toFixed(2)}%</td>
            <td><span class="badge ${data.coverage.branches >= 70 ? 'passed' : 'failed'}">${data.coverage.branches >= 70 ? 'Good' : 'Needs Improvement'}</span></td>
          </tr>
          <tr>
            <td>Functions</td>
            <td>${data.coverage.functions.toFixed(2)}%</td>
            <td><span class="badge ${data.coverage.functions >= 70 ? 'passed' : 'failed'}">${data.coverage.functions >= 70 ? 'Good' : 'Needs Improvement'}</span></td>
          </tr>
          <tr>
            <td>Lines</td>
            <td>${data.coverage.lines.toFixed(2)}%</td>
            <td><span class="badge ${data.coverage.lines >= 80 ? 'passed' : 'failed'}">${data.coverage.lines >= 80 ? 'Good' : 'Needs Improvement'}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Test Suites</h2>
      <table>
        <thead>
          <tr>
            <th>Suite</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Unit Tests</td>
            <td>${data.suites.unit.total || 0}</td>
            <td><span class="badge passed">${data.suites.unit.passed || 0}</span></td>
            <td><span class="badge failed">${data.suites.unit.failed || 0}</span></td>
            <td><span class="badge skipped">${data.suites.unit.skipped || 0}</span></td>
            <td>${((data.suites.unit.duration || 0) / 1000).toFixed(2)}s</td>
          </tr>
          <tr>
            <td>E2E Tests</td>
            <td>${data.suites.e2e.total || 0}</td>
            <td><span class="badge passed">${data.suites.e2e.passed || 0}</span></td>
            <td><span class="badge failed">${data.suites.e2e.failed || 0}</span></td>
            <td><span class="badge skipped">${data.suites.e2e.skipped || 0}</span></td>
            <td>${((data.suites.e2e.duration || 0) / 1000).toFixed(2)}s</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
  `;
}

function generateMarkdown(data) {
  const passRate = ((data.summary.passed / data.summary.total) * 100).toFixed(1);
  const status = data.summary.failed === 0 ? '✅ All tests passed!' : `❌ ${data.summary.failed} tests failed`;
  
  return `# Test Report

Generated: ${new Date(data.timestamp).toLocaleString()}

## Summary
${status}

- **Total Tests**: ${data.summary.total}
- **Passed**: ${data.summary.passed} (${passRate}%)
- **Failed**: ${data.summary.failed}
- **Skipped**: ${data.summary.skipped}
- **Duration**: ${(data.summary.duration / 1000).toFixed(2)}s

## Coverage
- **Statements**: ${data.coverage.statements.toFixed(2)}%
- **Branches**: ${data.coverage.branches.toFixed(2)}%
- **Functions**: ${data.coverage.functions.toFixed(2)}%
- **Lines**: ${data.coverage.lines.toFixed(2)}%

## Test Suites
### Unit Tests
- Total: ${data.suites.unit.total || 0}
- Passed: ${data.suites.unit.passed || 0}
- Failed: ${data.suites.unit.failed || 0}

### E2E Tests
- Total: ${data.suites.e2e.total || 0}
- Passed: ${data.suites.e2e.passed || 0}
- Failed: ${data.suites.e2e.failed || 0}
`;
}

// Run the report generation
generateTestReport().catch(console.error);