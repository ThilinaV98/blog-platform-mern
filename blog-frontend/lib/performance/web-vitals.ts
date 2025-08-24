import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

export type WebVitalsMetric = Metric;

const vitalsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;

function sendToAnalytics(metric: Metric) {
  // Send metrics to your analytics endpoint
  if (vitalsUrl) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
    if (navigator.sendBeacon) {
      navigator.sendBeacon(vitalsUrl, body);
    } else {
      fetch(vitalsUrl, {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    }
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });
  }
}

export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
}

export function measureWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// Performance monitoring utilities
export function measurePageLoad() {
  if (typeof window !== 'undefined' && window.performance) {
    const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (perfData) {
      const pageLoadTime = perfData.loadEventEnd - perfData.fetchStart;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpTime = perfData.connectEnd - perfData.connectStart;
      const requestTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      const metrics = {
        pageLoadTime,
        dnsTime,
        tcpTime,
        requestTime,
        renderTime,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.table(metrics);
      }
      
      return metrics;
    }
  }
  return null;
}

// Resource timing
export function measureResourceTiming() {
  if (typeof window !== 'undefined' && window.performance) {
    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const resourceMetrics = resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize,
      type: resource.initiatorType,
    }));
    
    // Group by type
    const grouped = resourceMetrics.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, typeof resourceMetrics>);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Resource Timing:', grouped);
    }
    
    return grouped;
  }
  return null;
}

// Custom performance marks
export function mark(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(name);
  }
}

export function measure(name: string, startMark: string, endMark?: string) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      if (endMark) {
        window.performance.measure(name, startMark, endMark);
      } else {
        window.performance.measure(name, startMark);
      }
      
      const measures = window.performance.getEntriesByName(name, 'measure');
      const lastMeasure = measures[measures.length - 1];
      
      if (process.env.NODE_ENV === 'development' && lastMeasure) {
        console.log(`[Performance] ${name}: ${lastMeasure.duration.toFixed(2)}ms`);
      }
      
      return lastMeasure?.duration;
    } catch (error) {
      console.error('Performance measurement error:', error);
    }
  }
  return null;
}