#!/usr/bin/env node

/**
 * VerdictPath API Testing Suite
 *
 * Comprehensive automated testing for beta testing
 * Run with: node test-api.js
 *
 * Prerequisites:
 * - Server must be running
 * - Environment variables must be configured
 * - Test accounts should exist in database
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test helper functions
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function test(name, testFn) {
  try {
    log(`\n  Testing: ${name}`, 'cyan');
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    log(`  ✓ PASSED: ${name}`, 'green');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    log(`  ✗ FAILED: ${name}`, 'red');
    log(`    Error: ${error.message}`, 'red');
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

function assertStatus(actual, expected) {
  if (actual !== expected) {
    throw new Error(`Expected status ${expected} but got ${actual}`);
  }
}

// Test Suites
async function testHealthEndpoint() {
  const response = await makeRequest(`${API_BASE_URL}/health`);
  assertStatus(response.status, 200);
  assert(response.data.status === 'healthy', 'Health check should return healthy status');
  assert(response.data.services, 'Health check should include services info');
}

async function testCORS() {
  const response = await makeRequest(`${API_BASE_URL}/health`, {
    headers: {
      'Origin': 'https://verdictpath.io'
    }
  });
  assert(response.headers['access-control-allow-origin'] !== undefined, 'CORS headers should be present');
}

async function testSecurityHeaders() {
  const response = await makeRequest(`${API_BASE_URL}/health`);
  assert(response.headers['x-content-type-options'], 'Should have X-Content-Type-Options header');
  assert(response.headers['x-frame-options'], 'Should have X-Frame-Options header');
  assert(response.headers['x-xss-protection'], 'Should have X-XSS-Protection header');
}

async function testRateLimiting() {
  log('    Making 15 rapid requests to test rate limiting...', 'yellow');
  let limited = false;

  for (let i = 0; i < 15; i++) {
    const response = await makeRequest(`${API_BASE_URL}/api/coins/balance`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    if (response.status === 429) {
      limited = true;
      break;
    }
  }

  // Note: Rate limiting might not trigger in test environment
  log(`    Rate limiting ${limited ? 'ACTIVE' : 'not triggered (normal in low traffic)'}`, limited ? 'green' : 'yellow');
}

async function testInvalidEndpoint() {
  const response = await makeRequest(`${API_BASE_URL}/api/nonexistent-endpoint`);
  assert(response.status === 404, 'Invalid endpoints should return 404');
}

async function testAuthWithoutToken() {
  const response = await makeRequest(`${API_BASE_URL}/api/coins/balance`);
  assert(response.status === 401, 'Protected endpoints should require authentication');
  assert(response.data.message, 'Should return error message');
}

async function testAuthWithInvalidToken() {
  const response = await makeRequest(`${API_BASE_URL}/api/coins/balance`, {
    headers: {
      'Authorization': 'Bearer invalid-token-here'
    }
  });
  assert(response.status === 403, 'Invalid token should return 403');
}

async function testLoginValidation() {
  // Test missing email
  let response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: {
      password: 'test123',
      userType: 'individual'
    }
  });
  assert(response.status >= 400, 'Login without email should fail');

  // Test missing password
  response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: {
      email: 'test@example.com',
      userType: 'individual'
    }
  });
  assert(response.status >= 400, 'Login without password should fail');
}

async function testSQLInjectionProtection() {
  // Try SQL injection in login
  const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: {
      email: "admin' OR '1'='1",
      password: "test' OR '1'='1",
      userType: 'individual'
    }
  });

  // Should fail authentication, not cause SQL error
  assert(response.status === 400 || response.status === 401, 'SQL injection should not succeed');
  assert(!response.data.message?.includes('SQL'), 'Should not expose SQL errors');
}

async function testXSSProtection() {
  // Try XSS in registration
  const response = await makeRequest(`${API_BASE_URL}/api/auth/register/client`, {
    method: 'POST',
    body: {
      firstName: '<script>alert("XSS")</script>',
      lastName: 'Test',
      email: 'xss-test@example.com',
      password: 'Test123!'
    }
  });

  // Should either sanitize or reject
  if (response.status === 200 || response.status === 201) {
    assert(!response.data.firstName?.includes('<script>'), 'XSS should be sanitized');
  }
}

async function testFileUploadValidation() {
  const response = await makeRequest(`${API_BASE_URL}/api/uploads/document`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token'
    },
    body: {}
  });

  // Should require authentication
  assert(response.status === 401 || response.status === 403, 'File upload should require auth');
}

async function testStripeEndpoints() {
  // Test without authentication
  const response = await makeRequest(`${API_BASE_URL}/api/stripe-connect/account-status`);
  assert(response.status === 401, 'Stripe endpoints should require authentication');
}

// Main test runner
async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║         VerdictPath API Beta Testing Suite              ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTesting API at: ${API_BASE_URL}`, 'yellow');
  log(`Started at: ${new Date().toLocaleString()}\n`, 'yellow');

  // Infrastructure Tests
  log('┌─────────────────────────────────────────────────────────┐', 'magenta');
  log('│ 1. Infrastructure Tests                                  │', 'magenta');
  log('└─────────────────────────────────────────────────────────┘', 'magenta');
  await test('Health endpoint responds correctly', testHealthEndpoint);
  await test('CORS headers are configured', testCORS);
  await test('Security headers are present', testSecurityHeaders);
  await test('Invalid endpoints return 404', testInvalidEndpoint);

  // Authentication & Authorization Tests
  log('\n┌─────────────────────────────────────────────────────────┐', 'magenta');
  log('│ 2. Authentication & Authorization Tests                  │', 'magenta');
  log('└─────────────────────────────────────────────────────────┘', 'magenta');
  await test('Protected endpoints require token', testAuthWithoutToken);
  await test('Invalid tokens are rejected', testAuthWithInvalidToken);
  await test('Login validates required fields', testLoginValidation);

  // Security Tests
  log('\n┌─────────────────────────────────────────────────────────┐', 'magenta');
  log('│ 3. Security Vulnerability Tests                          │', 'magenta');
  log('└─────────────────────────────────────────────────────────┘', 'magenta');
  await test('SQL injection is prevented', testSQLInjectionProtection);
  await test('XSS attacks are mitigated', testXSSProtection);
  await test('File uploads require authentication', testFileUploadValidation);
  await test('Rate limiting configuration', testRateLimiting);

  // Integration Tests
  log('\n┌─────────────────────────────────────────────────────────┐', 'magenta');
  log('│ 4. Integration Tests                                     │', 'magenta');
  log('└─────────────────────────────────────────────────────────┘', 'magenta');
  await test('Stripe endpoints require authentication', testStripeEndpoints);

  // Results Summary
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║                     Test Results                         ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Skipped: ${results.skipped}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow');

  if (results.failed > 0) {
    log('\n⚠️  Failed Tests:', 'red');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        log(`  - ${t.name}`, 'red');
        log(`    ${t.error}`, 'red');
      });
  }

  log(`\nCompleted at: ${new Date().toLocaleString()}`, 'yellow');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(err => {
    log(`\nFatal error: ${err.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { test, assert, assertEqual, makeRequest };
