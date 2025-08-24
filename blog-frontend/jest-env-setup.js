// Setup file that runs before the test environment is set up
// This ensures polyfills are available before any code runs

// Polyfill TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill ReadableStream
if (!global.ReadableStream) {
  global.ReadableStream = class ReadableStream {
    constructor() {}
    getReader() {
      return {
        read: () => Promise.resolve({ done: true }),
        releaseLock: () => {},
      };
    }
  };
}

// Polyfill TransformStream
if (!global.TransformStream) {
  global.TransformStream = class TransformStream {
    constructor() {}
  };
}

// Polyfill BroadcastChannel (for MSW WebSocket support)
if (!global.BroadcastChannel) {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name;
    }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}