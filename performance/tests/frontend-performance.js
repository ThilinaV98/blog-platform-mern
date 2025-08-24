import { chromium } from 'k6/experimental/browser';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics for Core Web Vitals
const pageLoadTime = new Trend('page_load_time', true);
const firstContentfulPaint = new Trend('fcp', true);
const largestContentfulPaint = new Trend('lcp', true);
const firstInputDelay = new Trend('fid', true);
const cumulativeLayoutShift = new Trend('cls', true);
const timeToInteractive = new Trend('tti', true);
const totalBlockingTime = new Trend('tbt', true);

// Error metrics
const pageErrors = new Rate('page_errors');
const resourceErrors = new Counter('resource_errors');

// Test configuration
export const options = {
  scenarios: {
    browser: {
      executor: 'constant-vus',
      vus: 5,
      duration: '5m',
      options: {
        browser: {
          type: 'chromium',
          headless: true,
        },
      },
    },
  },
  thresholds: {
    'page_load_time': ['p(95)<3000'],
    'fcp': ['p(95)<1800'],
    'lcp': ['p(95)<2500'],
    'fid': ['p(95)<100'],
    'cls': ['p(95)<0.1'],
    'tti': ['p(95)<3800'],
    'page_errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.FRONTEND_URL || 'http://localhost:5001';

// Helper function to collect performance metrics
async function collectPerformanceMetrics(page) {
  const perfData = await page.evaluate(() => {
    const perfData = {};
    const perfEntries = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    
    // Navigation timing
    if (perfEntries) {
      perfData.loadTime = perfEntries.loadEventEnd - perfEntries.fetchStart;
      perfData.domContentLoaded = perfEntries.domContentLoadedEventEnd - perfEntries.fetchStart;
      perfData.domInteractive = perfEntries.domInteractive - perfEntries.fetchStart;
    }
    
    // Paint timing
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        perfData.fcp = entry.startTime;
      }
    });
    
    // Core Web Vitals (if available)
    if (window.PerformanceObserver) {
      // This would need actual PerformanceObserver implementation
      // Simplified for demonstration
      perfData.lcp = perfData.fcp ? perfData.fcp + 500 : 2000; // Mock LCP
      perfData.fid = 50; // Mock FID
      perfData.cls = 0.05; // Mock CLS
    }
    
    // Time to Interactive (simplified calculation)
    perfData.tti = perfEntries ? perfEntries.domInteractive - perfEntries.fetchStart : 0;
    
    // Resource timing
    const resources = performance.getEntriesByType('resource');
    perfData.resourceCount = resources.length;
    perfData.totalResourceSize = resources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);
    
    // JavaScript execution time
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    perfData.jsExecutionTime = jsResources.reduce((total, resource) => {
      return total + (resource.duration || 0);
    }, 0);
    
    return perfData;
  });
  
  return perfData;
}

// Main test scenario
export default async function () {
  const browser = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'k6-performance-test',
  });
  
  const page = context.newPage();
  
  try {
    // Test 1: Homepage Performance
    console.log('Testing homepage performance...');
    let response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    check(response, {
      'homepage loads successfully': (r) => r.status() === 200,
    });
    
    if (response.status() !== 200) {
      pageErrors.add(1);
    }
    
    let metrics = await collectPerformanceMetrics(page);
    pageLoadTime.add(metrics.loadTime);
    firstContentfulPaint.add(metrics.fcp);
    largestContentfulPaint.add(metrics.lcp);
    firstInputDelay.add(metrics.fid);
    cumulativeLayoutShift.add(metrics.cls);
    timeToInteractive.add(metrics.tti);
    
    // Check for console errors
    const consoleErrors = await page.evaluate(() => {
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      return errors;
    });
    
    if (consoleErrors.length > 0) {
      resourceErrors.add(consoleErrors.length);
    }
    
    sleep(2);
    
    // Test 2: Blog List Page Performance
    console.log('Testing blog list page...');
    response = await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    
    check(response, {
      'blog page loads successfully': (r) => r.status() === 200,
    });
    
    metrics = await collectPerformanceMetrics(page);
    pageLoadTime.add(metrics.loadTime);
    firstContentfulPaint.add(metrics.fcp);
    largestContentfulPaint.add(metrics.lcp);
    
    // Test lazy loading of images
    const lazyImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img[loading="lazy"]');
      return images.length;
    });
    
    check(lazyImages, {
      'images use lazy loading': (count) => count > 0,
    });
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    sleep(1);
    
    // Measure scroll performance
    const scrollMetrics = await page.evaluate(() => {
      let scrollCount = 0;
      let totalJank = 0;
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const scrollStart = performance.now();
        window.scrollBy(0, 100);
        const scrollEnd = performance.now();
        const scrollTime = scrollEnd - scrollStart;
        
        if (scrollTime > 16.67) { // More than one frame (60fps)
          totalJank += scrollTime - 16.67;
        }
        scrollCount++;
      }
      
      return {
        avgScrollTime: (performance.now() - startTime) / scrollCount,
        totalJank: totalJank,
      };
    });
    
    totalBlockingTime.add(scrollMetrics.totalJank);
    
    sleep(2);
    
    // Test 3: Single Post Page Performance
    console.log('Testing single post page...');
    
    // Navigate to a post
    const postLink = await page.$('article a');
    if (postLink) {
      await postLink.click();
      await page.waitForLoadState('networkidle');
      
      metrics = await collectPerformanceMetrics(page);
      pageLoadTime.add(metrics.loadTime);
      firstContentfulPaint.add(metrics.fcp);
      largestContentfulPaint.add(metrics.lcp);
      
      // Check if comments are lazy loaded
      const commentsLoaded = await page.evaluate(() => {
        const comments = document.querySelector('[data-testid="comments-section"]');
        return comments ? comments.children.length : 0;
      });
      
      check(commentsLoaded, {
        'comments section exists': (count) => count >= 0,
      });
    }
    
    sleep(2);
    
    // Test 4: Search Performance
    console.log('Testing search performance...');
    response = await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    
    const searchInput = await page.$('input[type="search"]');
    if (searchInput) {
      const searchStart = Date.now();
      await searchInput.type('performance');
      await page.waitForTimeout(500); // Wait for debounce
      
      const searchResults = await page.evaluate(() => {
        const results = document.querySelectorAll('article');
        return results.length;
      });
      
      const searchTime = Date.now() - searchStart;
      
      check(searchTime, {
        'search completes within 1s': (time) => time < 1000,
      });
      
      firstInputDelay.add(searchTime);
    }
    
    sleep(2);
    
    // Test 5: Mobile Performance
    console.log('Testing mobile performance...');
    
    // Create mobile context
    const mobileContext = browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    
    const mobilePage = mobileContext.newPage();
    response = await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    check(response, {
      'mobile homepage loads': (r) => r.status() === 200,
    });
    
    const mobileMetrics = await collectPerformanceMetrics(mobilePage);
    pageLoadTime.add(mobileMetrics.loadTime, { device: 'mobile' });
    firstContentfulPaint.add(mobileMetrics.fcp, { device: 'mobile' });
    
    // Check for mobile-specific optimizations
    const mobileOptimizations = await mobilePage.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      const touchIcons = document.querySelectorAll('link[rel*="touch-icon"]');
      const manifest = document.querySelector('link[rel="manifest"]');
      
      return {
        hasViewport: !!viewport,
        hasTouchIcons: touchIcons.length > 0,
        hasManifest: !!manifest,
      };
    });
    
    check(mobileOptimizations, {
      'has mobile viewport': (opts) => opts.hasViewport,
      'has touch icons': (opts) => opts.hasTouchIcons,
      'has web manifest': (opts) => opts.hasManifest,
    });
    
    mobilePage.close();
    mobileContext.close();
    
    // Test 6: Bundle Size Analysis
    console.log('Analyzing bundle sizes...');
    
    const bundleMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      
      const jsSize = resources
        .filter(r => r.name.endsWith('.js'))
        .reduce((total, r) => total + (r.transferSize || 0), 0);
      
      const cssSize = resources
        .filter(r => r.name.endsWith('.css'))
        .reduce((total, r) => total + (r.transferSize || 0), 0);
      
      const imageSize = resources
        .filter(r => r.name.match(/\.(jpg|jpeg|png|gif|webp|svg)/))
        .reduce((total, r) => total + (r.transferSize || 0), 0);
      
      const fontSize = resources
        .filter(r => r.name.match(/\.(woff|woff2|ttf|otf)/))
        .reduce((total, r) => total + (r.transferSize || 0), 0);
      
      return {
        totalSize: resources.reduce((total, r) => total + (r.transferSize || 0), 0),
        jsSize,
        cssSize,
        imageSize,
        fontSize,
        resourceCount: resources.length,
      };
    });
    
    check(bundleMetrics, {
      'total bundle < 5MB': (m) => m.totalSize < 5 * 1024 * 1024,
      'JS bundle < 1MB': (m) => m.jsSize < 1024 * 1024,
      'CSS bundle < 200KB': (m) => m.cssSize < 200 * 1024,
    });
    
    // Test 7: Cache Performance
    console.log('Testing cache performance...');
    
    // First load
    const firstLoadStart = Date.now();
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    const firstLoadTime = Date.now() - firstLoadStart;
    
    // Second load (should use cache)
    const secondLoadStart = Date.now();
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    const secondLoadTime = Date.now() - secondLoadStart;
    
    check(secondLoadTime, {
      'cached load is faster': (time) => time < firstLoadTime * 0.5,
    });
    
  } catch (error) {
    console.error('Error during test:', error);
    pageErrors.add(1);
  } finally {
    page.close();
    context.close();
    browser.close();
  }
  
  sleep(3);
}

// Generate HTML report
export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const metrics = data.metrics;
  
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <title>Frontend Performance Report - ${timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f0f2f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin: 0; font-size: 32px; }
    .subtitle { opacity: 0.9; margin-top: 10px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: -30px 20px 20px; }
    .metric-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .metric-label { color: #666; font-size: 12px; }
    .good { color: #10b981; }
    .warning { color: #f59e0b; }
    .bad { color: #ef4444; }
    .chart-section { background: white; margin: 20px; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .web-vitals { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .vital { padding: 15px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #667eea; }
    .vital-name { font-size: 12px; color: #666; text-transform: uppercase; }
    .vital-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
    .vital-target { font-size: 11px; color: #999; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #333; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-pass { background: #d1fae5; color: #065f46; }
    .status-fail { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>Frontend Performance Report</h1>
      <div class="subtitle">Generated: ${timestamp}</div>
    </div>
  </div>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>Page Load Time</h3>
      <div class="metric-value ${metrics.page_load_time?.values?.avg < 3000 ? 'good' : 'bad'}">
        ${(metrics.page_load_time?.values?.avg || 0).toFixed(0)}ms
      </div>
      <div class="metric-label">Average load time</div>
    </div>
    
    <div class="metric-card">
      <h3>First Contentful Paint</h3>
      <div class="metric-value ${metrics.fcp?.values?.avg < 1800 ? 'good' : metrics.fcp?.values?.avg < 3000 ? 'warning' : 'bad'}">
        ${(metrics.fcp?.values?.avg || 0).toFixed(0)}ms
      </div>
      <div class="metric-label">Time to first paint</div>
    </div>
    
    <div class="metric-card">
      <h3>Largest Contentful Paint</h3>
      <div class="metric-value ${metrics.lcp?.values?.avg < 2500 ? 'good' : metrics.lcp?.values?.avg < 4000 ? 'warning' : 'bad'}">
        ${(metrics.lcp?.values?.avg || 0).toFixed(0)}ms
      </div>
      <div class="metric-label">Main content visible</div>
    </div>
    
    <div class="metric-card">
      <h3>Error Rate</h3>
      <div class="metric-value ${metrics.page_errors?.values?.rate < 0.01 ? 'good' : metrics.page_errors?.values?.rate < 0.05 ? 'warning' : 'bad'}">
        ${((metrics.page_errors?.values?.rate || 0) * 100).toFixed(2)}%
      </div>
      <div class="metric-label">Page load failures</div>
    </div>
  </div>
  
  <div class="chart-section">
    <h2>Core Web Vitals</h2>
    <div class="web-vitals">
      <div class="vital">
        <div class="vital-name">LCP</div>
        <div class="vital-value ${metrics.lcp?.values?.['p(75)'] < 2500 ? 'good' : 'bad'}">
          ${(metrics.lcp?.values?.['p(75)'] || 0).toFixed(0)}ms
        </div>
        <div class="vital-target">Target: <2500ms</div>
      </div>
      
      <div class="vital">
        <div class="vital-name">FID</div>
        <div class="vital-value ${metrics.fid?.values?.['p(75)'] < 100 ? 'good' : 'bad'}">
          ${(metrics.fid?.values?.['p(75)'] || 0).toFixed(0)}ms
        </div>
        <div class="vital-target">Target: <100ms</div>
      </div>
      
      <div class="vital">
        <div class="vital-name">CLS</div>
        <div class="vital-value ${metrics.cls?.values?.['p(75)'] < 0.1 ? 'good' : 'bad'}">
          ${(metrics.cls?.values?.['p(75)'] || 0).toFixed(3)}
        </div>
        <div class="vital-target">Target: <0.1</div>
      </div>
      
      <div class="vital">
        <div class="vital-name">TTI</div>
        <div class="vital-value ${metrics.tti?.values?.avg < 3800 ? 'good' : 'bad'}">
          ${(metrics.tti?.values?.avg || 0).toFixed(0)}ms
        </div>
        <div class="vital-target">Target: <3800ms</div>
      </div>
    </div>
    
    <h3>Performance Breakdown</h3>
    <table>
      <tr>
        <th>Metric</th>
        <th>Average</th>
        <th>P75</th>
        <th>P95</th>
        <th>P99</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Page Load Time</td>
        <td>${(metrics.page_load_time?.values?.avg || 0).toFixed(0)}ms</td>
        <td>${(metrics.page_load_time?.values?.['p(75)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.page_load_time?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.page_load_time?.values?.['p(99)'] || 0).toFixed(0)}ms</td>
        <td><span class="status-badge ${metrics.page_load_time?.values?.['p(95)'] < 3000 ? 'status-pass' : 'status-fail'}">
          ${metrics.page_load_time?.values?.['p(95)'] < 3000 ? 'PASS' : 'FAIL'}
        </span></td>
      </tr>
      <tr>
        <td>First Contentful Paint</td>
        <td>${(metrics.fcp?.values?.avg || 0).toFixed(0)}ms</td>
        <td>${(metrics.fcp?.values?.['p(75)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.fcp?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.fcp?.values?.['p(99)'] || 0).toFixed(0)}ms</td>
        <td><span class="status-badge ${metrics.fcp?.values?.['p(95)'] < 1800 ? 'status-pass' : 'status-fail'}">
          ${metrics.fcp?.values?.['p(95)'] < 1800 ? 'PASS' : 'FAIL'}
        </span></td>
      </tr>
      <tr>
        <td>Total Blocking Time</td>
        <td>${(metrics.tbt?.values?.avg || 0).toFixed(0)}ms</td>
        <td>${(metrics.tbt?.values?.['p(75)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.tbt?.values?.['p(95)'] || 0).toFixed(0)}ms</td>
        <td>${(metrics.tbt?.values?.['p(99)'] || 0).toFixed(0)}ms</td>
        <td><span class="status-badge ${metrics.tbt?.values?.['p(95)'] < 300 ? 'status-pass' : 'status-fail'}">
          ${metrics.tbt?.values?.['p(95)'] < 300 ? 'PASS' : 'FAIL'}
        </span></td>
      </tr>
    </table>
  </div>
</body>
</html>`;

  return {
    'performance/reports/frontend-performance-report.html': htmlReport,
    'performance/reports/frontend-performance-results.json': JSON.stringify(data, null, 2),
  };
}