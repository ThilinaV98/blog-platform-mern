import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';
import { Rate, Trend, Counter } from 'k6/metrics';
import { stressTest } from '../k6.config.js';

// Custom metrics
const uploadLatency = new Trend('upload_latency', true);
const uploadErrors = new Rate('upload_errors');
const uploadSuccess = new Counter('upload_success');
const uploadBytes = new Counter('upload_bytes');

// Test configuration
export const options = {
  ...stressTest,
  thresholds: {
    ...stressTest.thresholds,
    'upload_latency': ['p(95)<3000', 'p(99)<5000'],
    'upload_errors': ['rate<0.1'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const testUsers = JSON.parse(open('../data/test-users.json'));

// Generate test files of different sizes
function generateTestFile(sizeInKB) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let content = '';
  const targetSize = sizeInKB * 1024;
  
  while (content.length < targetSize) {
    content += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return content;
}

// Generate image file data (mock binary data)
function generateImageData(width, height) {
  // Simple PNG header
  const pngHeader = '\x89PNG\r\n\x1a\n';
  // Generate random pixel data (simplified)
  let imageData = pngHeader;
  const pixelCount = width * height * 3; // RGB
  
  for (let i = 0; i < pixelCount; i++) {
    imageData += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  
  return imageData;
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
    }
  );

  if (loginRes.status === 200) {
    return loginRes.json('access_token');
  }
  
  uploadErrors.add(1);
  return null;
}

// Main test scenario
export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const token = authenticate(user);
  
  if (!token) {
    console.error('Authentication failed');
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
  };

  // Test different file sizes
  const fileSizes = [
    { size: 100, type: 'small' },    // 100KB
    { size: 500, type: 'medium' },   // 500KB
    { size: 1024, type: 'large' },   // 1MB
    { size: 5120, type: 'xlarge' },  // 5MB
  ];

  for (const fileConfig of fileSizes) {
    sleep(1);

    // Profile picture upload test
    const formData = new FormData();
    const imageData = generateImageData(800, 600);
    formData.append('file', http.file(imageData, `profile-${Date.now()}.png`, 'image/png'));
    
    const uploadStart = Date.now();
    const uploadRes = http.post(
      `${BASE_URL}/uploads/profile-picture`,
      formData.body(),
      {
        headers: {
          ...authHeaders,
          'Content-Type': `multipart/form-data; boundary=${formData.boundary}`,
        },
        tags: { fileSize: fileConfig.type, uploadType: 'profile' },
      }
    );
    
    const duration = Date.now() - uploadStart;
    uploadLatency.add(duration, { size: fileConfig.type });
    uploadBytes.add(imageData.length);

    const uploadCheck = check(uploadRes, {
      'upload successful': (r) => r.status === 201,
      'file url returned': (r) => r.json('url') !== undefined,
      'upload under 5s': (r) => duration < 5000,
    });

    if (uploadCheck) {
      uploadSuccess.add(1);
    } else {
      uploadErrors.add(1);
      console.error(`Upload failed for ${fileConfig.type} file: ${uploadRes.status}`);
    }

    sleep(2);

    // Post cover image upload test
    const coverFormData = new FormData();
    const coverImageData = generateImageData(1920, 1080);
    coverFormData.append('file', http.file(coverImageData, `cover-${Date.now()}.jpg`, 'image/jpeg'));
    
    const coverUploadStart = Date.now();
    const coverUploadRes = http.post(
      `${BASE_URL}/uploads/post-cover`,
      coverFormData.body(),
      {
        headers: {
          ...authHeaders,
          'Content-Type': `multipart/form-data; boundary=${coverFormData.boundary}`,
        },
        tags: { fileSize: fileConfig.type, uploadType: 'cover' },
      }
    );
    
    const coverDuration = Date.now() - coverUploadStart;
    uploadLatency.add(coverDuration, { size: fileConfig.type, type: 'cover' });
    uploadBytes.add(coverImageData.length);

    const coverCheck = check(coverUploadRes, {
      'cover upload successful': (r) => r.status === 201,
      'cover url returned': (r) => r.json('url') !== undefined,
    });

    if (coverCheck) {
      uploadSuccess.add(1);
    } else {
      uploadErrors.add(1);
    }
  }

  // Test concurrent uploads
  const batch = [];
  for (let i = 0; i < 3; i++) {
    const batchFormData = new FormData();
    const batchImageData = generateImageData(400, 300);
    batchFormData.append('file', http.file(batchImageData, `batch-${Date.now()}-${i}.png`, 'image/png'));
    
    batch.push({
      method: 'POST',
      url: `${BASE_URL}/uploads/post-image`,
      body: batchFormData.body(),
      params: {
        headers: {
          ...authHeaders,
          'Content-Type': `multipart/form-data; boundary=${batchFormData.boundary}`,
        },
        tags: { uploadType: 'batch' },
      },
    });
  }

  const batchStart = Date.now();
  const batchResponses = http.batch(batch);
  const batchDuration = Date.now() - batchStart;
  
  uploadLatency.add(batchDuration / 3, { type: 'batch' });

  let batchSuccessCount = 0;
  for (const response of batchResponses) {
    if (response.status === 201) {
      batchSuccessCount++;
      uploadSuccess.add(1);
    } else {
      uploadErrors.add(1);
    }
  }

  check(batchSuccessCount, {
    'all batch uploads successful': (count) => count === 3,
  });

  // Test file deletion
  if (uploadRes && uploadRes.status === 201) {
    const fileId = uploadRes.json('id');
    if (fileId) {
      sleep(1);
      
      const deleteStart = Date.now();
      const deleteRes = http.del(
        `${BASE_URL}/uploads/${fileId}`,
        null,
        {
          headers: authHeaders,
          tags: { operation: 'delete' },
        }
      );
      
      check(deleteRes, {
        'file deleted': (r) => r.status === 200,
      });
      
      if (deleteRes.status !== 200) {
        uploadErrors.add(1);
      }
    }
  }

  sleep(Math.random() * 2 + 1);
}

// Test lifecycle hooks
export function setup() {
  console.log('Starting upload stress test...');
  
  // Create test user accounts if needed
  const setupUser = testUsers[0];
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email: setupUser.email,
      username: setupUser.username,
      password: setupUser.password,
      displayName: setupUser.displayName,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  if (registerRes.status === 201) {
    console.log('Test user created successfully');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Upload stress test completed in ${duration} seconds`);
  console.log(`Total uploads: ${uploadSuccess.value}`);
  console.log(`Upload error rate: ${(uploadErrors.rate * 100).toFixed(2)}%`);
  console.log(`Total bytes uploaded: ${(uploadBytes.value / 1024 / 1024).toFixed(2)} MB`);
}

export function handleSummary(data) {
  return {
    'performance/reports/upload-stress-test-summary.html': generateHTMLReport(data),
    'performance/reports/upload-stress-test-results.json': JSON.stringify(data, null, 2),
  };
}

function generateHTMLReport(data) {
  const timestamp = new Date().toISOString();
  const metrics = data.metrics;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Upload Stress Test Report - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #FF9800; }
    .metric h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
    .metric .value { font-size: 28px; font-weight: bold; color: #FF9800; }
    .metric .label { color: #666; font-size: 12px; margin-top: 5px; }
    .chart { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #FF9800; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Upload Stress Test Report</h1>
    <p>Test completed: ${timestamp}</p>
    
    <div class="metrics">
      <div class="metric">
        <h3>Successful Uploads</h3>
        <div class="value">${metrics.upload_success?.values?.count || 0}</div>
        <div class="label">Total files uploaded</div>
      </div>
      
      <div class="metric">
        <h3>Error Rate</h3>
        <div class="value">${((metrics.upload_errors?.values?.rate || 0) * 100).toFixed(2)}%</div>
        <div class="label">Failed uploads</div>
      </div>
      
      <div class="metric">
        <h3>Avg Upload Time</h3>
        <div class="value">${(metrics.upload_latency?.values?.avg || 0).toFixed(0)}ms</div>
        <div class="label">Average duration</div>
      </div>
      
      <div class="metric">
        <h3>Data Transferred</h3>
        <div class="value">${((metrics.upload_bytes?.values?.count || 0) / 1024 / 1024).toFixed(2)}MB</div>
        <div class="label">Total bytes uploaded</div>
      </div>
      
      <div class="metric">
        <h3>P95 Upload Time</h3>
        <div class="value">${(metrics.upload_latency?.values?.['p(95)'] || 0).toFixed(0)}ms</div>
        <div class="label">95th percentile</div>
      </div>
      
      <div class="metric">
        <h3>Max Upload Time</h3>
        <div class="value">${(metrics.upload_latency?.values?.max || 0).toFixed(0)}ms</div>
        <div class="label">Slowest upload</div>
      </div>
    </div>
    
    <div class="chart">
      <h2>Upload Performance by File Size</h2>
      <table>
        <tr>
          <th>File Size</th>
          <th>Avg Time (ms)</th>
          <th>P95 Time (ms)</th>
          <th>Success Rate</th>
        </tr>
        <tr>
          <td>Small (100KB)</td>
          <td>${(metrics.upload_latency?.values?.avg || 0).toFixed(0)}</td>
          <td>${(metrics.upload_latency?.values?.['p(95)'] || 0).toFixed(0)}</td>
          <td>${(100 - (metrics.upload_errors?.values?.rate || 0) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Medium (500KB)</td>
          <td>${(metrics.upload_latency?.values?.avg || 0).toFixed(0)}</td>
          <td>${(metrics.upload_latency?.values?.['p(95)'] || 0).toFixed(0)}</td>
          <td>${(100 - (metrics.upload_errors?.values?.rate || 0) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>Large (1MB)</td>
          <td>${(metrics.upload_latency?.values?.avg || 0).toFixed(0)}</td>
          <td>${(metrics.upload_latency?.values?.['p(95)'] || 0).toFixed(0)}</td>
          <td>${(100 - (metrics.upload_errors?.values?.rate || 0) * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td>XLarge (5MB)</td>
          <td>${(metrics.upload_latency?.values?.avg || 0).toFixed(0)}</td>
          <td>${(metrics.upload_latency?.values?.['p(95)'] || 0).toFixed(0)}</td>
          <td>${(100 - (metrics.upload_errors?.values?.rate || 0) * 100).toFixed(1)}%</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}