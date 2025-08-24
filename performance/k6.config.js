// k6 Performance Test Configuration

export const config = {
  // Test stages for gradual load increase
  stages: {
    smoke: [
      { duration: '30s', target: 5 },   // Ramp up to 5 users
      { duration: '1m', target: 5 },    // Stay at 5 users
      { duration: '30s', target: 0 },   // Ramp down to 0
    ],
    load: [
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '2m', target: 0 },    // Ramp down to 0
    ],
    stress: [
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '2m', target: 200 },  // Ramp up to 200 users
      { duration: '5m', target: 200 },  // Stay at 200 users
      { duration: '2m', target: 300 },  // Ramp up to 300 users
      { duration: '5m', target: 300 },  // Stay at 300 users
      { duration: '10m', target: 0 },   // Ramp down to 0
    ],
    spike: [
      { duration: '10s', target: 100 }, // Spike to 100 users
      { duration: '1m', target: 100 },  // Stay at 100 users
      { duration: '10s', target: 1000 }, // Spike to 1000 users
      { duration: '3m', target: 1000 }, // Stay at 1000 users
      { duration: '10s', target: 100 }, // Drop to 100 users
      { duration: '3m', target: 100 },  // Stay at 100 users
      { duration: '10s', target: 0 },   // Ramp down to 0
    ],
    soak: [
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '3h', target: 100 },  // Stay at 100 users for 3 hours
      { duration: '2m', target: 0 },    // Ramp down to 0
    ],
  },

  // Performance thresholds
  thresholds: {
    // HTTP request duration thresholds
    http_req_duration: {
      p95: 500,  // 95% of requests must be below 500ms
      p99: 1000, // 99% of requests must be below 1000ms
      avg: 200,  // Average response time must be below 200ms
    },
    
    // HTTP request failure rate
    http_req_failed: {
      rate: 0.01, // Error rate must be below 1%
    },
    
    // Request rate
    http_reqs: {
      rate: 100, // At least 100 requests per second
    },
    
    // Virtual user thresholds
    vus: {
      min: 10,  // Minimum 10 concurrent users
      max: 300, // Maximum 300 concurrent users
    },
    
    // Custom metrics thresholds
    'api_latency{endpoint:login}': {
      p95: 300,
    },
    'api_latency{endpoint:posts}': {
      p95: 400,
    },
    'api_latency{endpoint:upload}': {
      p95: 2000,
    },
  },

  // Test environment configurations
  environments: {
    local: {
      baseUrl: 'http://localhost:4000',
      frontendUrl: 'http://localhost:5001',
    },
    staging: {
      baseUrl: 'https://staging-api.blog.com',
      frontendUrl: 'https://staging.blog.com',
    },
    production: {
      baseUrl: 'https://api.blog.com',
      frontendUrl: 'https://blog.com',
    },
  },

  // Test data configuration
  testData: {
    users: {
      count: 1000,        // Number of test users to create
      concurrency: 10,    // Concurrent user creation
    },
    posts: {
      perUser: 5,         // Posts per user
      minLength: 100,     // Minimum post content length
      maxLength: 5000,    // Maximum post content length
    },
    comments: {
      perPost: 10,        // Comments per post
      minLength: 10,      // Minimum comment length
      maxLength: 500,     // Maximum comment length
    },
    files: {
      sizes: ['1MB', '5MB', '10MB'], // Test file sizes
      types: ['image/jpeg', 'image/png', 'application/pdf'],
    },
  },

  // Monitoring and reporting
  reporting: {
    influxdb: {
      enabled: false,
      url: 'http://localhost:8086',
      database: 'k6',
    },
    datadog: {
      enabled: false,
      apiKey: process.env.DATADOG_API_KEY,
    },
    htmlReport: {
      enabled: true,
      filename: 'performance-report.html',
    },
    jsonReport: {
      enabled: true,
      filename: 'performance-results.json',
    },
  },
};

// Export individual test configurations
export const smokeTest = {
  stages: config.stages.smoke,
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export const loadTest = {
  stages: config.stages.load,
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>50'],
  },
};

export const stressTest = {
  stages: config.stages.stress,
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.1'],
  },
};

export const spikeTest = {
  stages: config.stages.spike,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.2'],
  },
};

export const soakTest = {
  stages: config.stages.soak,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};