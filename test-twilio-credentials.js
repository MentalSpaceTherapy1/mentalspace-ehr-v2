const twilio = require('twilio');
require('dotenv').config({ path: '.env' });

async function testTwilioCredentials() {
  console.log('\n🔍 Testing Twilio Credentials...\n');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

  // Check if credentials exist
  console.log('✅ Credentials Found:');
  console.log(`   Account SID: ${accountSid ? accountSid.substring(0, 10) + '...' : '❌ MISSING'}`);
  console.log(`   Auth Token: ${authToken ? '***' + authToken.substring(authToken.length - 4) : '❌ MISSING'}`);
  console.log(`   API Key SID: ${apiKeySid ? apiKeySid.substring(0, 10) + '...' : '❌ MISSING'}`);
  console.log(`   API Key Secret: ${apiKeySecret ? '***' + apiKeySecret.substring(apiKeySecret.length - 4) : '❌ MISSING'}`);
  console.log('');

  if (!accountSid || !authToken || !apiKeySid || !apiKeySecret) {
    console.error('❌ Missing required credentials!');
    process.exit(1);
  }

  try {
    // Test 1: Verify account with Account SID and Auth Token
    console.log('📡 Test 1: Verifying Twilio account...');
    const client = twilio(accountSid, authToken);

    const account = await client.api.v2010.accounts(accountSid).fetch();
    console.log(`✅ Account verified: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}`);
    console.log('');

    // Test 2: Check Video service availability
    console.log('📡 Test 2: Checking Video service...');
    try {
      const rooms = await client.video.v1.rooms.list({ limit: 1 });
      console.log(`✅ Video service available (found ${rooms.length} rooms)`);
    } catch (videoError) {
      console.error(`⚠️ Video service check failed: ${videoError.message}`);
    }
    console.log('');

    // Test 3: Try to generate an access token
    console.log('📡 Test 3: Generating access token...');
    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
        identity: 'test-user',
        ttl: 3600
      });

      const videoGrant = new VideoGrant({
        room: 'test-room'
      });

      token.addGrant(videoGrant);
      const jwt = token.toJwt();

      console.log(`✅ Access token generated successfully`);
      console.log(`   Token (first 50 chars): ${jwt.substring(0, 50)}...`);
    } catch (tokenError) {
      console.error(`❌ Token generation failed: ${tokenError.message}`);
      console.error(`   This means the API Key might be invalid or expired!`);
    }
    console.log('');

    // Test 4: Try to create a test room
    console.log('📡 Test 4: Creating test video room...');
    try {
      const roomName = `test-room-${Date.now()}`;
      const room = await client.video.v1.rooms.create({
        uniqueName: roomName,
        type: 'group',
        maxParticipants: 2,
      });

      console.log(`✅ Room created successfully!`);
      console.log(`   Room SID: ${room.sid}`);
      console.log(`   Room Name: ${room.uniqueName}`);
      console.log(`   Status: ${room.status}`);

      // Clean up: Complete the room
      console.log('\n🧹 Cleaning up test room...');
      await client.video.v1.rooms(room.sid).update({ status: 'completed' });
      console.log(`✅ Test room cleaned up`);
    } catch (roomError) {
      console.error(`❌ Room creation failed: ${roomError.message}`);
      console.error(`   Error code: ${roomError.code || 'N/A'}`);

      if (roomError.code === 20404) {
        console.error(`   This usually means Video is not enabled on your account.`);
      } else if (roomError.code === 20403) {
        console.error(`   This usually means your account doesn't have permission.`);
      } else if (roomError.code === 21608) {
        console.error(`   This usually means your trial has ended or you need to upgrade.`);
      }
    }
    console.log('');

    console.log('✅ Credential test complete!');
    console.log('');
    console.log('📊 SUMMARY:');
    console.log('   If all tests passed: Credentials are VALID, you can use TWILIO_MOCK_MODE=false');
    console.log('   If token generation failed: API Key is invalid/expired - need new key');
    console.log('   If room creation failed: Check error code above for specific issue');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error testing credentials:');
    console.error(`   ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);

    if (error.code === 20003) {
      console.error('\n   ⚠️ AUTHENTICATION FAILED');
      console.error('   Your Account SID or Auth Token is invalid.');
      console.error('   Please check your Twilio Console for correct values.');
    } else if (error.code === 20404) {
      console.error('\n   ⚠️ RESOURCE NOT FOUND');
      console.error('   The account or resource does not exist.');
    }

    console.log('\n❌ Credentials test FAILED - you need new credentials');
    process.exit(1);
  }
}

testTwilioCredentials().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
