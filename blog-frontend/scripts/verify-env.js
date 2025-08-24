#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Validates that all required environment variables are present for production deployment
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SITE_URL'
];

const optionalEnvVars = [
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_GA_ID',
  'NEXT_PUBLIC_SENTRY_DSN'
];

console.log('🔍 Verifying environment variables...\n');

let missingRequired = [];
let presentOptional = [];
let missingOptional = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ ${varName}: MISSING (required)`);
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

// Check optional variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingOptional.push(varName);
    console.log(`⚠️  ${varName}: MISSING (optional)`);
  } else {
    presentOptional.push(varName);
    console.log(`✅ ${varName}: ${value}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredEnvVars.length - missingRequired.length}/${requiredEnvVars.length} present`);
console.log(`Optional variables: ${presentOptional.length}/${optionalEnvVars.length} present`);

if (missingRequired.length > 0) {
  console.log('\n❌ DEPLOYMENT BLOCKED');
  console.log('Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\nPlease set these variables in:');
  console.log('  - Vercel Dashboard > Settings > Environment Variables');
  console.log('  - Local .env.local file for development');
  process.exit(1);
} else {
  console.log('\n✅ DEPLOYMENT READY');
  console.log('All required environment variables are present.');
  
  if (missingOptional.length > 0) {
    console.log('\nOptional variables you might want to add:');
    missingOptional.forEach(varName => {
      console.log(`  - ${varName}`);
    });
  }
  
  process.exit(0);
}