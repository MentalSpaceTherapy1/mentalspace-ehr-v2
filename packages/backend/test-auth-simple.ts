/**
 * Simple authentication test using the updated service
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { AdvancedMDAuthService } from './src/integrations/advancedmd/auth.service';

async function testAuth() {
  console.log('🔐 Testing AdvancedMD Authentication\n');

  try {
    const authService = new AdvancedMDAuthService();

    console.log('1. Initializing authentication service...');
    await authService.initialize();
    console.log('✅ Initialized\n');

    console.log('2. Attempting to get session token...');
    const token = await authService.getToken();
    console.log('✅ Token received:', token.substring(0, 50) + '...\n');

    console.log('3. Getting session info...');
    const sessionInfo = authService.getSessionInfo();
    console.log('✅ Session Info:');
    console.log('   Authenticated:', sessionInfo.isAuthenticated);
    console.log('   Token expires at:', sessionInfo.tokenExpiresAt);
    console.log('   Token expires in:', sessionInfo.tokenExpiresIn, 'minutes\n');

    console.log('4. Getting redirect URLs...');
    const xmlrpcURL = await authService.getRedirectURL('XMLRPC');
    const restpmURL = await authService.getRedirectURL('REST_PM');
    console.log('✅ Redirect URLs:');
    console.log('   XMLRPC:', xmlrpcURL);
    console.log('   RESTPM:', restpmURL);

    console.log('\n🎉 Authentication successful!');
  } catch (error: any) {
    console.error('\n❌ Authentication failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testAuth();
