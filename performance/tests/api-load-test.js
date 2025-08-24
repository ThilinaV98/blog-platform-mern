import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { loadTest } from '../k6.config.js';

// Custom metrics
const apiLatency = new Trend('api_latency', true);
const apiErrors = new Rate('api_errors');
const apiRequests = new Counter('api_requests');
const activeSessions = new Gauge('active_sessions');

// Test configuration
export const options = {
  ...loadTest,
  thresholds: {
    ...loadTest.thresholds,
    'api_latency': ['p(95)<500', 'p(99)<1000'],
    'api_errors': ['rate<0.05'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const testUsers = JSON.parse(open('../data/test-users.json'));

// Helper functions
function randomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function randomPost() {
  const titles = [
    'Performance Testing Best Practices',
    'Understanding Load Testing',
    'K6 Tutorial for Beginners',
    'API Testing Strategies',
    'Scaling Your Application',
  ];
  const content = 'Lorem ipsum dolor sit amet, '.repeat(Math.floor(Math.random() * 100) + 10);
  
  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    content: content,
    excerpt: content.substring(0, 150),
    tags: ['performance', 'testing', 'k6'],
    coverImage: 'https://via.placeholder.com/800x400',
    status: 'published',
  };
}

// Authentication helper
function authenticate(user) {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('access_token') !== undefined,
  });

  if (loginRes.status === 200) {
    const token = loginRes.json('access_token');
    activeSessions.add(1);
    return token;
  }
  
  apiErrors.add(1);
  return null;
}

// Main test scenario
export default function () {
  const user = randomUser();
  let token = null;

  // Authentication flow
  group('Authentication', () => {
    const start = Date.now();
    token = authenticate(user);
    apiLatency.add(Date.now() - start, { endpoint: 'login' });
    apiRequests.add(1);
    
    if (!token) {
      console.error('Authentication failed for user:', user.email);
      return;
    }
  });

  // Authorized requests with token
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // User profile operations
  group('User Profile', () => {
    // Get user profile
    const profileStart = Date.now();
    const profileRes = http.get(
      `${BASE_URL}/users/profile`,
      {
        headers: authHeaders,
        tags: { endpoint: 'profile' },
      }
    );
    apiLatency.add(Date.now() - profileStart, { endpoint: 'profile' });
    apiRequests.add(1);

    check(profileRes, {
      'profile retrieved': (r) => r.status === 200,
      'has user data': (r) => r.json('email') === user.email,
    });

    if (profileRes.status !== 200) {
      apiErrors.add(1);
    }

    sleep(1);

    // Update profile
    const updateStart = Date.now();
    const updateRes = http.patch(
      `${BASE_URL}/users/profile`,
      JSON.stringify({
        bio: `Updated bio at ${new Date().toISOString()}`,
        website: 'https://example.com',
      }),
      {
        headers: authHeaders,
        tags: { endpoint: 'profile-update' },
      }
    );
    apiLatency.add(Date.now() - updateStart, { endpoint: 'profile-update' });
    apiRequests.add(1);

    check(updateRes, {
      'profile updated': (r) => r.status === 200,
    });

    if (updateRes.status !== 200) {
      apiErrors.add(1);
    }
  });

  sleep(2);

  // Blog post operations
  group('Blog Posts', () => {
    // Get all posts
    const postsStart = Date.now();
    const postsRes = http.get(
      `${BASE_URL}/posts?page=1&limit=10`,
      {
        headers: authHeaders,
        tags: { endpoint: 'posts' },
      }
    );
    apiLatency.add(Date.now() - postsStart, { endpoint: 'posts' });
    apiRequests.add(1);

    check(postsRes, {
      'posts retrieved': (r) => r.status === 200,
      'has posts array': (r) => Array.isArray(r.json('posts')),
    });

    if (postsRes.status !== 200) {
      apiErrors.add(1);
    }

    sleep(1);

    // Create a new post
    const newPost = randomPost();
    const createStart = Date.now();
    const createRes = http.post(
      `${BASE_URL}/posts`,
      JSON.stringify(newPost),
      {
        headers: authHeaders,
        tags: { endpoint: 'create-post' },
      }
    );
    apiLatency.add(Date.now() - createStart, { endpoint: 'create-post' });
    apiRequests.add(1);

    check(createRes, {
      'post created': (r) => r.status === 201,
      'has post id': (r) => r.json('_id') !== undefined,
    });

    if (createRes.status === 201) {
      const postId = createRes.json('_id');
      
      sleep(1);

      // Get single post
      const getPostStart = Date.now();
      const getPostRes = http.get(
        `${BASE_URL}/posts/${postId}`,
        {
          headers: authHeaders,
          tags: { endpoint: 'get-post' },
        }
      );
      apiLatency.add(Date.now() - getPostStart, { endpoint: 'get-post' });
      apiRequests.add(1);

      check(getPostRes, {
        'post retrieved': (r) => r.status === 200,
        'correct post': (r) => r.json('_id') === postId,
      });

      if (getPostRes.status !== 200) {
        apiErrors.add(1);
      }

      sleep(1);

      // Update post
      const updatePostStart = Date.now();
      const updatePostRes = http.patch(
        `${BASE_URL}/posts/${postId}`,
        JSON.stringify({
          title: newPost.title + ' (Updated)',
          content: newPost.content + '\n\nUpdated content.',
        }),
        {
          headers: authHeaders,
          tags: { endpoint: 'update-post' },
        }
      );
      apiLatency.add(Date.now() - updatePostStart, { endpoint: 'update-post' });
      apiRequests.add(1);

      check(updatePostRes, {
        'post updated': (r) => r.status === 200,
      });

      if (updatePostRes.status !== 200) {
        apiErrors.add(1);
      }

      sleep(1);

      // Add comment to post
      const commentStart = Date.now();
      const commentRes = http.post(
        `${BASE_URL}/posts/${postId}/comments`,
        JSON.stringify({
          content: 'Great post! Very informative.',
        }),
        {
          headers: authHeaders,
          tags: { endpoint: 'add-comment' },
        }
      );
      apiLatency.add(Date.now() - commentStart, { endpoint: 'add-comment' });
      apiRequests.add(1);

      check(commentRes, {
        'comment added': (r) => r.status === 201,
      });

      if (commentRes.status !== 201) {
        apiErrors.add(1);
      }

      sleep(1);

      // Delete post (cleanup)
      const deleteStart = Date.now();
      const deleteRes = http.del(
        `${BASE_URL}/posts/${postId}`,
        null,
        {
          headers: authHeaders,
          tags: { endpoint: 'delete-post' },
        }
      );
      apiLatency.add(Date.now() - deleteStart, { endpoint: 'delete-post' });
      apiRequests.add(1);

      check(deleteRes, {
        'post deleted': (r) => r.status === 200,
      });

      if (deleteRes.status !== 200) {
        apiErrors.add(1);
      }
    } else {
      apiErrors.add(1);
    }
  });

  sleep(2);

  // Search operations
  group('Search', () => {
    const searchQueries = ['performance', 'testing', 'k6', 'api', 'blog'];
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    
    const searchStart = Date.now();
    const searchRes = http.get(
      `${BASE_URL}/posts/search?q=${query}&page=1&limit=10`,
      {
        headers: authHeaders,
        tags: { endpoint: 'search' },
      }
    );
    apiLatency.add(Date.now() - searchStart, { endpoint: 'search' });
    apiRequests.add(1);

    check(searchRes, {
      'search successful': (r) => r.status === 200,
      'has results': (r) => r.json('posts') !== undefined,
    });

    if (searchRes.status !== 200) {
      apiErrors.add(1);
    }
  });

  sleep(1);

  // Logout
  group('Logout', () => {
    const logoutStart = Date.now();
    const logoutRes = http.post(
      `${BASE_URL}/auth/logout`,
      null,
      {
        headers: authHeaders,
        tags: { endpoint: 'logout' },
      }
    );
    apiLatency.add(Date.now() - logoutStart, { endpoint: 'logout' });
    apiRequests.add(1);

    check(logoutRes, {
      'logout successful': (r) => r.status === 200,
    });

    if (logoutRes.status === 200) {
      activeSessions.add(-1);
    } else {
      apiErrors.add(1);
    }
  });

  sleep(Math.random() * 3 + 2); // Random think time between iterations
}

// Teardown function
export function teardown(data) {
  console.log('Test completed!');
  console.log(`Total API requests: ${apiRequests.value}`);
  console.log(`API error rate: ${apiErrors.rate}%`);
}

// Handle test lifecycle
export function handleSummary(data) {
  return {
    'performance/reports/api-load-test-summary.html': htmlReport(data),
    'performance/reports/api-load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Helper function to generate HTML report
function htmlReport(data) {
  const timestamp = new Date().toISOString();
  const metrics = data.metrics;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>API Load Test Report - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .metric { background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
    .metric h3 { margin: 0 0 10px 0; color: #333; }
    .metric .value { font-size: 24px; font-weight: bold; color: #4CAF50; }
    .metric .label { color: #666; font-size: 14px; }
    .failed { border-left-color: #f44336; }
    .failed .value { color: #f44336; }
    .warning { border-left-color: #ff9800; }
    .warning .value { color: #ff9800; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #4CAF50; color: white; }
    tr:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>API Load Test Report</h1>
    <p>Generated: ${timestamp}</p>
    
    <h2>Key Metrics</h2>
    <div class="metrics">
      <div class="metric">
        <h3>Total Requests</h3>
        <div class="value">${metrics.http_reqs?.values?.count || 0}</div>
        <div class="label">HTTP requests made</div>
      </div>
      
      <div class="metric ${metrics.http_req_failed?.values?.rate > 0.01 ? 'failed' : ''}">
        <h3>Error Rate</h3>
        <div class="value">${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</div>
        <div class="label">Failed requests</div>
      </div>
      
      <div class="metric">
        <h3>Avg Response Time</h3>
        <div class="value">${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms</div>
        <div class="label">Average duration</div>
      </div>
      
      <div class="metric">
        <h3>P95 Response Time</h3>
        <div class="value">${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms</div>
        <div class="label">95th percentile</div>
      </div>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Min</th>
        <th>Max</th>
        <th>P90</th>
        <th>P95</th>
        <th>P99</th>
      </tr>
      ${Object.entries(metrics).map(([key, metric]) => {
        if (metric.type === 'trend' && metric.values) {
          return `
          <tr>
            <td>${key}</td>
            <td>${metric.values.avg?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values.min?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values.max?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values['p(90)']?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values['p(95)']?.toFixed(2) || 'N/A'}</td>
            <td>${metric.values['p(99)']?.toFixed(2) || 'N/A'}</td>
          </tr>`;
        }
        return '';
      }).join('')}
    </table>
  </div>
</body>
</html>`;
}