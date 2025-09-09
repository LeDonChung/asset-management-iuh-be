/**
 * Crypto polyfill for Node.js environments where globalThis.crypto is not available
 * This is specifically needed for @nestjs/typeorm which uses crypto.randomUUID()
 */

import { randomUUID, webcrypto } from 'crypto';

// Check if crypto is already available globally
if (typeof globalThis.crypto === 'undefined') {
  // Use Node.js crypto module as polyfill
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: false,
  });
}

// Ensure randomUUID is available on the crypto object
if (typeof globalThis.crypto.randomUUID === 'undefined') {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUID,
    writable: false,
    configurable: false,
  });
}

export {};
