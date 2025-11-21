/**
 * Force re-authentication to test with updated credentials
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { AdvancedMDAuthService } from './src/integrations/advancedmd/auth.service';

async function testForceReauth() {
  console.log('🔐 Force Re-Authentication Test\n');

  try {
    const authService = new AdvancedMDAuthService();

    console.log('1. Initializing...');
    await authService.initialize();
    console.log('✅ Initialized\n');

    console.log('2. Forcing re-authentication (invalidating old session)...');
    await authService.forceReAuthenticate();
    console.log('✅ Re-authentication complete\n');

    console.log('3. Getting new token...');
    const token = await authService.getToken();
    console.log('✅ New token:', token.substring(0, 50) + '...\n');

    console.log('4. Getting session info...');
    const sessionInfo = authService.getSessionInfo();
    console.log('✅ Session Info:');
    console.log('   Authenticated:', sessionInfo.isAuthenticated);
    console.log('   Token expires at:', sessionInfo.tokenExpiresAt);
    console.log('   Token expires in:', sessionInfo.tokenExpiresIn, 'minutes\n');

    console.log('5. Getting redirect URLs...');
    const xmlrpcURL = await authService.getRedirectURL('XMLRPC');
    const restpmURL = await authService.getRedirectURL('REST_PM');
    console.log('✅ Redirect URLs:');
    console.log('   XMLRPC:', xmlrpcURL);
    console.log('   RESTPM:', restpmURL);

    console.log('\n🎉 Force re-authentication successful!');
  } catch (error: any) {
    console.error('\n❌ Force re-authentication failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testForceReauth();
