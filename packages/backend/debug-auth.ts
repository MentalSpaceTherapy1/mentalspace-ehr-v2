/**
 * Debug script to test AdvancedMD authentication and see raw responses
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function formatDateTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

function decrypt(encryptedData: string): string {
  const ENCRYPTION_KEY = Buffer.from(process.env.ADVANCEDMD_ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function debugAuth() {
  console.log('🔍 AdvancedMD Authentication Debug\n');

  // Get config from database
  console.log('1️⃣ Loading configuration from database...');
  const config = await prisma.advancedMDConfig.findFirst({
    where: { officeKey: '162882' },
  });

  if (!config) {
    console.error('❌ No config found for office key 162882');
    return;
  }

  console.log('✅ Config loaded:');
  console.log('   Office Key:', config.officeKey);
  console.log('   Office Name:', config.officeName);
  console.log('   Partner Username:', config.partnerUsername);
  console.log('   App Username:', config.appUsername);
  console.log('   Environment:', config.environment);
  console.log('   Partner Login URL:', config.partnerLoginURL);

  // Decrypt credentials
  console.log('\n2️⃣ Decrypting credentials...');
  const partnerPassword = decrypt(config.partnerPassword);
  const appPassword = decrypt(config.appPassword);
  console.log('✅ Partner password:', partnerPassword);
  console.log('✅ App password:', appPassword);

  // Prepare partner login request
  console.log('\n3️⃣ Preparing partner login request...');
  const msgtime = formatDateTime(new Date());
  console.log('   Message time:', msgtime);

  const request = {
    ppmdmsg: {
      '@action': 'login',
      '@class': 'login',
      '@msgtime': msgtime,
      '@username': config.partnerUsername,
      '@psw': partnerPassword,
      '@officecode': parseInt(config.officeKey),
      '@appname': 'API',
    },
  };

  console.log('   Request payload:', JSON.stringify(request, null, 2));

  // Make partner login request
  console.log('\n4️⃣ Making partner login request...');
  console.log('   URL:', config.partnerLoginURL);

  try {
    const response = await axios.post(config.partnerLoginURL, request, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MentalSpace-EHR/2.0',
      },
    });

    console.log('\n✅ Response received!');
    console.log('   Status:', response.status);
    console.log('   Headers:', JSON.stringify(response.headers, null, 2));
    console.log('   Data:', JSON.stringify(response.data, null, 2));

    // Check for ppmdmsg in response
    if (response.data && response.data.ppmdmsg) {
      const ppmdmsg = response.data.ppmdmsg;
      console.log('\n📦 ppmdmsg found:');
      console.log('   @status:', ppmdmsg['@status']);
      console.log('   @errormessage:', ppmdmsg['@errormessage']);
      console.log('   redirectUrl:', ppmdmsg.redirectUrl);
      console.log('   redirectUrlPM:', ppmdmsg.redirectUrlPM);
      console.log('   redirectUrlEHR:', ppmdmsg.redirectUrlEHR);

      if (ppmdmsg['@status'] === 'error') {
        console.log('\n❌ Partner login failed:', ppmdmsg['@errormessage']);
      } else if (ppmdmsg.redirectUrl) {
        console.log('\n✅ Partner login successful!');
        console.log('   Redirect URL (XMLRPC):', ppmdmsg.redirectUrl);

        // Try redirect login
        console.log('\n5️⃣ Testing redirect login...');
        const redirectRequest = {
          ppmdmsg: {
            '@action': 'login',
            '@class': 'api',
            '@msgtime': formatDateTime(new Date()),
            '@appname': 'API',
            username: config.appUsername,
            password: appPassword,
          },
        };

        console.log('   Redirect URL:', ppmdmsg.redirectUrl);
        console.log('   Request payload:', JSON.stringify(redirectRequest, null, 2));

        try {
          const redirectResponse = await axios.post(ppmdmsg.redirectUrl, redirectRequest, {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'MentalSpace-EHR/2.0',
            },
          });

          console.log('\n✅ Redirect login response received!');
          console.log('   Status:', redirectResponse.status);
          console.log('   Data:', JSON.stringify(redirectResponse.data, null, 2));

          // Check for token in cookies
          const cookies = redirectResponse.headers['set-cookie'];
          if (cookies) {
            console.log('\n🍪 Cookies:', cookies);
            const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
            if (tokenCookie) {
              const token = tokenCookie.split(';')[0].split('=')[1];
              console.log('\n🎉 Authentication successful!');
              console.log('   Session token:', token.substring(0, 50) + '...');
            }
          }
        } catch (redirectError: any) {
          console.error('\n❌ Redirect login failed:');
          console.error('   Error:', redirectError.message);
          if (redirectError.response) {
            console.error('   Status:', redirectError.response.status);
            console.error('   Data:', JSON.stringify(redirectError.response.data, null, 2));
          }
        }
      }
    } else {
      console.log('\n⚠️  No ppmdmsg in response');
      console.log('   Full response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error('\n❌ Partner login request failed:');
    console.error('   Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  await prisma.$disconnect();
}

debugAuth().catch((error) => {
  console.error('\n💥 Debug script failed:', error);
  process.exit(1);
});
