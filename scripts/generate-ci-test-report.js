#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate consolidated test report from CI artifacts
 */
async function generateCITestReport() {
  const artifactsPath = process.env.ARTIFACTS_PATH || 'test-artifacts';
  
  const reportData = {
    timestamp: new Date().toISOString(),
    backend: {},
    frontend: {},
    e2e: {},
    combined: {
      coverage: 0,
      tests: { total: 0, passed: 0, failed: 0 },
    },
  };

  // Read backend coverage
  try {
    const backendCoverage = JSON.parse(
      fs.readFileSync(path.join(artifactsPath, 'backend-coverage', 'coverage-summary.json'), 'utf8')
    );
    reportData.backend = {
      coverage: backendCoverage.total.lines.pct,
      statements: backendCoverage.total.statements.pct,
      branches: backendCoverage.total.branches.pct,
      functions: backendCoverage.total.functions.pct,
    };
  } catch (error) {
    console.warn('Could not read backend coverage:', error.message);
  }

  // Read frontend coverage
  try {
    const frontendCoverage = JSON.parse(
      fs.readFileSync(path.join(artifactsPath, 'frontend-coverage', 'coverage-summary.json'), 'utf8')
    );
    reportData.frontend = {
      coverage: frontendCoverage.total.lines.pct,
      statements: frontendCoverage.total.statements.pct,
      branches: frontendCoverage.total.branches.pct,
      functions: frontendCoverage.total.functions.pct,
    };
  } catch (error) {
    console.warn('Could not read frontend coverage:', error.message);
  }

  // Read Playwright results
  try {
    const files = fs.readdirSync(path.join(artifactsPath, 'test-results'));
    const junitFile = files.find(f => f.endsWith('.xml'));
    if (junitFile) {
      const xmlContent = fs.readFileSync(path.join(artifactsPath, 'test-results', junitFile), 'utf8');
      // Parse XML to extract test counts (simplified)
      const totalMatch = xmlContent.match(/tests="(\d+)"/);
      const failuresMatch = xmlContent.match(/failures="(\d+)"/);
      const skippedMatch = xmlContent.match(/skipped="(\d+)"/);
      
      const total = totalMatch ? parseInt(totalMatch[1]) : 0;
      const failures = failuresMatch ? parseInt(failuresMatch[1]) : 0;
      const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
      
      reportData.e2e = {
        total,
        passed: total - failures - skipped,
        failed: failures,
        skipped,
      };
    }
  } catch (error) {
    console.warn('Could not read E2E results:', error.message);
  }

  // Calculate combined metrics
  reportData.combined.coverage = (
    (reportData.backend.coverage || 0) + 
    (reportData.frontend.coverage || 0)
  ) / 2;

  // Generate HTML report
  const html = generateHTMLReport(reportData);
  fs.writeFileSync('test-report.html', html);

  // Generate markdown summary for PR comment
  const markdown = generateMarkdownSummary(reportData);
  fs.writeFileSync('test-report-summary.md', markdown);

  console.log('CI test report generated successfully!');
}

function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CI Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem; border-radius: 12px; margin-bottom: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card h2 { color: #333; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .metric { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; }
    .metric-value { font-size: 1.25rem; font-weight: 600; }
    .coverage-high { color: #10b981; }
    .coverage-medium { color: #f59e0b; }
    .coverage-low { color: #ef4444; }
    .progress { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .progress-bar { height: 100%; transition: width 0.3s; }
    .progress-bar.high { background: #10b981; }
    .progress-bar.medium { background: #f59e0b; }
    .progress-bar.low { background: #ef4444; }
    .summary { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .summary h2 { color: #333; margin-bottom: 1rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .summary-item { text-align: center; padding: 1rem; background: #f9fafb; border-radius: 8px; }
    .summary-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem; }
    .summary-label { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 CI/CD Test Report</h1>
      <p>Generated on ${new Date(data.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
      <h2>📊 Overall Coverage</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value ${getCoverageClass(data.combined.coverage)}">${data.combined.coverage.toFixed(1)}%</div>
          <div class="summary-label">Combined</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ${getCoverageClass(data.backend.coverage)}">${(data.backend.coverage || 0).toFixed(1)}%</div>
          <div class="summary-label">Backend</div>
        </div>
        <div class="summary-item">
          <div class="summary-value ${getCoverageClass(data.frontend.coverage)}">${(data.frontend.coverage || 0).toFixed(1)}%</div>
          <div class="summary-label">Frontend</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>🔧 Backend Coverage</h2>
        ${generateCoverageMetrics(data.backend)}
      </div>

      <div class="card">
        <h2>🎨 Frontend Coverage</h2>
        ${generateCoverageMetrics(data.frontend)}
      </div>

      <div class="card">
        <h2>🧪 E2E Tests</h2>
        ${generateE2EMetrics(data.e2e)}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateCoverageMetrics(coverage) {
  if (!coverage || !coverage.coverage) {
    return '<p style="color: #6b7280;">No coverage data available</p>';
  }

  return `
    <div class="metric">
      <span class="metric-label">Lines</span>
      <span class="metric-value ${getCoverageClass(coverage.coverage)}">${coverage.coverage.toFixed(1)}%</span>
    </div>
    <div class="progress">
      <div class="progress-bar ${getCoverageClass(coverage.coverage)}" style="width: ${coverage.coverage}%"></div>
    </div>
    <div class="metric">
      <span class="metric-label">Statements</span>
      <span class="metric-value">${coverage.statements.toFixed(1)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">Branches</span>
      <span class="metric-value">${coverage.branches.toFixed(1)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">Functions</span>
      <span class="metric-value">${coverage.functions.toFixed(1)}%</span>
    </div>
  `;
}

function generateE2EMetrics(e2e) {
  if (!e2e || !e2e.total) {
    return '<p style="color: #6b7280;">No E2E test data available</p>';
  }

  const passRate = ((e2e.passed / e2e.total) * 100).toFixed(1);

  return `
    <div class="metric">
      <span class="metric-label">Total Tests</span>
      <span class="metric-value">${e2e.total}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Passed</span>
      <span class="metric-value coverage-high">${e2e.passed}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Failed</span>
      <span class="metric-value coverage-low">${e2e.failed}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Pass Rate</span>
      <span class="metric-value ${getCoverageClass(passRate)}">${passRate}%</span>
    </div>
    <div class="progress">
      <div class="progress-bar ${getCoverageClass(passRate)}" style="width: ${passRate}%"></div>
    </div>
  `;
}

function getCoverageClass(coverage) {
  if (coverage >= 80) return 'coverage-high high';
  if (coverage >= 70) return 'coverage-medium medium';
  return 'coverage-low low';
}

function generateMarkdownSummary(data) {
  const status = data.e2e.failed === 0 ? '✅' : '❌';
  
  return `## ${status} Test Results

### 📊 Coverage Summary
- **Combined**: ${data.combined.coverage.toFixed(1)}%
- **Backend**: ${(data.backend.coverage || 0).toFixed(1)}%
- **Frontend**: ${(data.frontend.coverage || 0).toFixed(1)}%

### 🧪 Test Results
- **E2E Tests**: ${data.e2e.passed || 0}/${data.e2e.total || 0} passed
- **Failures**: ${data.e2e.failed || 0}
- **Skipped**: ${data.e2e.skipped || 0}

### 📈 Coverage Details
#### Backend
- Statements: ${(data.backend.statements || 0).toFixed(1)}%
- Branches: ${(data.backend.branches || 0).toFixed(1)}%
- Functions: ${(data.backend.functions || 0).toFixed(1)}%
- Lines: ${(data.backend.coverage || 0).toFixed(1)}%

#### Frontend
- Statements: ${(data.frontend.statements || 0).toFixed(1)}%
- Branches: ${(data.frontend.branches || 0).toFixed(1)}%
- Functions: ${(data.frontend.functions || 0).toFixed(1)}%
- Lines: ${(data.frontend.coverage || 0).toFixed(1)}%

---
View the full report in the [Actions artifacts](../../actions/runs/$GITHUB_RUN_ID).
`;
}

// Run the report generation
generateCITestReport().catch(console.error);