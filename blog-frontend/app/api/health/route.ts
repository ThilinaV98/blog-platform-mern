import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring and deployment validation
 */
export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    api_url: process.env.NEXT_PUBLIC_API_URL || 'not configured',
    build_time: process.env.BUILD_TIME || new Date().toISOString(),
  };

  // Test API connectivity (optional)
  let apiStatus = 'unknown';
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout for health checks
        signal: AbortSignal.timeout(5000),
      });
      
      apiStatus = response.ok ? 'connected' : 'error';
    }
  } catch (error) {
    apiStatus = 'unreachable';
  }

  return NextResponse.json({
    ...healthData,
    api_status: apiStatus,
    checks: {
      environment_vars: !!(
        process.env.NEXT_PUBLIC_API_URL && 
        process.env.NEXT_PUBLIC_SITE_URL
      ),
      build_successful: true,
    }
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}