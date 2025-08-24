#!/usr/bin/env node

/**
 * Environment Variable Verification Script for Backend
 * Validates that all required environment variables are present for production deployment
 */

const requiredEnvVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const recommendedEnvVars = [
  'PORT',
  'FRONTEND_URL',
  'ALLOWED_ORIGINS',
  'SESSION_SECRET',
  'RATE_LIMIT_MAX_REQUESTS'
];

const optionalEnvVars = [
  'REDIS_URL',
  'EMAIL_FROM',
  'EMAIL_HOST',
  'SENTRY_DSN',
  'HEALTH_CHECK_KEY'
];

console.log('🔍 Verifying backend environment variables...\n');

let missingRequired = [];
let missingRecommended = [];
let presentOptional = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ ${varName}: MISSING (required)`);
  } else {
    // Mask sensitive values
    const displayValue = ['PASSWORD', 'SECRET', 'KEY'].some(sensitive => 
      varName.includes(sensitive)
    ) ? '*'.repeat(Math.min(value.length, 20)) : value;
    
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

// Check recommended variables
recommendedEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRecommended.push(varName);
    console.log(`⚠️  ${varName}: MISSING (recommended)`);
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    presentOptional.push(varName);
    const displayValue = ['PASSWORD', 'SECRET', 'KEY', 'DSN'].some(sensitive => 
      varName.includes(sensitive)
    ) ? '*'.repeat(Math.min(value.length, 20)) : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredEnvVars.length - missingRequired.length}/${requiredEnvVars.length} present`);
console.log(`Recommended variables: ${recommendedEnvVars.length - missingRecommended.length}/${recommendedEnvVars.length} present`);
console.log(`Optional variables: ${presentOptional.length}/${optionalEnvVars.length} present`);

// Security checks
console.log('\n🔒 Security Checks:');
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const sessionSecret = process.env.SESSION_SECRET;

if (jwtSecret && jwtSecret.length < 32) {
  console.log('⚠️  JWT_SECRET should be at least 32 characters long');
}
if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
  console.log('⚠️  JWT_REFRESH_SECRET should be at least 32 characters long');
}
if (sessionSecret && sessionSecret.length < 32) {
  console.log('⚠️  SESSION_SECRET should be at least 32 characters long');
}

if (missingRequired.length > 0) {
  console.log('\n❌ DEPLOYMENT BLOCKED');
  console.log('Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\nPlease set these variables in:');
  console.log('  - Railway Dashboard > Variables');
  console.log('  - Render Dashboard > Environment Variables');
  console.log('  - Local .env file for development');
  process.exit(1);
} else {
  console.log('\n✅ DEPLOYMENT READY');
  console.log('All required environment variables are present.');
  
  if (missingRecommended.length > 0) {
    console.log('\n⚠️  Consider adding these recommended variables:');
    missingRecommended.forEach(varName => {
      console.log(`  - ${varName}`);
    });
  }
  
  process.exit(0);
}