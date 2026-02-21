#!/usr/bin/env node

/**
 * Test script for email verification endpoints
 * Usage: node test-email-verification.js
 */

const http = require('http');

const TEST_EMAIL = 'test@antika-store.local';
let receivedOTP = null;

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Email Verification Endpoint Tests\n');
  console.log('📡 Testing: http://localhost:3000/api\n');

  try {
    // Test 1: Send verification email
    console.log('Test 1️⃣  Sending verification email...');
    const sendResult = await makeRequest('POST', '/api/send-verification-email', {
      email: TEST_EMAIL
    });

    console.log(`Status: ${sendResult.status}`);
    console.log(`Response: ${JSON.stringify(sendResult.data, null, 2)}\n`);

    if (sendResult.status === 200 && sendResult.data.success) {
      console.log('✅ Send email endpoint working\n');
    } else {
      console.log('❌ Send email endpoint failed\n');
      return;
    }

    // Simulate OTP reception (in real scenario, check email)
    console.log('⏳ In production, OTP would be sent to email');
    console.log('📧 For testing, we would check: ' + TEST_EMAIL + '\n');

    // Test 2: Verify with wrong code
    console.log('Test 2️⃣  Verifying with wrong code (should fail)...');
    const wrongCodeResult = await makeRequest('POST', '/api/verify-email-code', {
      email: TEST_EMAIL,
      code: '999999'
    });

    console.log(`Status: ${wrongCodeResult.status}`);
    console.log(`Response: ${JSON.stringify(wrongCodeResult.data, null, 2)}\n`);

    if (wrongCodeResult.status === 400) {
      console.log('✅ Verification correctly rejects wrong code\n');
    }

    // Test 3: Verify with incomplete code
    console.log('Test 3️⃣  Verifying with incomplete code (should fail)...');
    const incompleteResult = await makeRequest('POST', '/api/verify-email-code', {
      email: TEST_EMAIL,
      code: '123'
    });

    console.log(`Status: ${incompleteResult.status}`);
    console.log(`Response: ${JSON.stringify(incompleteResult.data, null, 2)}\n`);

    console.log('✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Check your email for the OTP code sent to: ' + TEST_EMAIL);
    console.log('2. Update this script with the real OTP to test verification');
    console.log('3. Or test through the registration form at http://localhost:3000/register.html');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n⚠️  Make sure:');
    console.log('1. Server is running: npm run dev');
    console.log('2. Port 3000 is accessible');
    console.log('3. .env file has Gmail credentials configured');
  }
}

runTests();
