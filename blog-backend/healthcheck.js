#!/usr/bin/env node

/**
 * Docker Health Check Script
 * Used by Docker to determine if the container is healthy
 */

const http = require('http');

const options = {
  host: '0.0.0.0',
  port: process.env.PORT || 4000,
  path: '/health',
  timeout: 2000,
  method: 'GET',
  headers: {
    'User-Agent': 'Docker-Health-Check',
    'Accept': 'application/json',
  }
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error(`Health check failed with status code: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`Health check failed: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check timed out');
  request.destroy();
  process.exit(1);
});

request.setTimeout(options.timeout);
request.end();