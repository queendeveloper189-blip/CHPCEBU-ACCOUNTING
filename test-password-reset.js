/**
 * Test script for password reset flow
 * Run with: node test-password-reset.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testPasswordResetFlow() {
  console.log('=== Testing Password Reset Flow ===\n');

  // Test data
  const traineeId = '2024-001'; // Replace with existing trainee ID
  const newPassword = 'NewPass123';
  const wrongPassword = 'WrongPass123';

  try {
    // Step 1: Submit forgot password request
    console.log('Step 1: Submitting forgot password request...');
    const resetResponse = await axios.post(`${BASE_URL}/auth/forgot-password-request`, {
      userType: 'trainee',
      identifier: traineeId,
      newPassword: newPassword,
      email: 'trainee@example.com',
      message: 'Password reset request'
    });

    if (resetResponse.status === 201) {
      console.log('✅ Request submitted successfully');
      console.log('   Response:', resetResponse.data);
    }

    // Step 2: Try login with wrong password (before admin approval)
    console.log('\nStep 2: Try login with wrong password (request pending)...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: traineeId,
        password: wrongPassword,
        userType: 'trainee'
      });
      console.log('❌ ERROR: Login should have failed with wrong password');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login rejected correctly - Error:', error.response.data.error);
      }
    }

    // Step 3: Try login with system_id (before password is set)
    console.log('\nStep 3: Try login with system ID as password (before admin approval)...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: traineeId,
        password: traineeId,
        userType: 'trainee'
      });

      if (loginResponse.status === 200) {
        console.log('✅ Login with system ID successful (no password hash yet)');
        console.log('   User:', loginResponse.data.user);
      }
    } catch (error) {
      console.log('   System ID login attempt:', error.response?.data?.error);
    }

    console.log('\n=== Admin Action Required ===');
    console.log('📝 In admin dashboard:');
    console.log('   1. Go to "Password Requests"');
    console.log(`   2. Find request for trainee ID: ${traineeId}`);
    console.log('   3. Click "View"');
    console.log(`   4. See new password: ${newPassword}`);
    console.log('   5. Click "Accept & Change Password"');
    console.log('\n⏸️  Pause here and complete admin approval above...\n');

    console.log('After admin approval, test login:');
    console.log(`   - Wrong password (${wrongPassword}): Should FAIL ❌`);
    console.log(`   - Correct password (${newPassword}): Should SUCCEED ✅`);

  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testPasswordResetFlow();
