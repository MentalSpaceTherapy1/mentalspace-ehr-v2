/**
 * Test redirect login directly
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

async function testRedirectLogin() {
  console.log('🔐 Testing AdvancedMD Redirect Login\n');

  // Get config
  const config = await prisma.advancedMDConfig.findFirst({ where: { officeKey: '162882' } });
  if (!config) {
    console.error('❌ No config found');
    return;
  }

  const partnerPassword = decrypt(config.partnerPassword);
  const appPassword = decrypt(config.appPassword);

  // The redirect URL (api-130 as indicated in the error)
  const redirectURL = 'https://api-130.advancedmd.com/practicemanager/xmlrpc/processrequest.aspx';

  console.log('Testing direct login to redirect URL:', redirectURL);
  console.log('Using partner credentials\n');

  // Try with JOSEPH username (web portal credentials)
  const request = {
    ppmdmsg: {
      '@action': 'login',
      '@class': 'login',
      '@msgtime': formatDateTime(new Date()),
      '@username': config.appUsername, // JOSEPH
      '@psw': appPassword, // Bing@@0912
      '@officecode': parseInt(config.officeKey),
      '@appname': 'API',
    },
  };

  console.log('Using credentials:');
  console.log('  Username:', config.appUsername);
  console.log('  Office Key:', config.officeKey);

  try {
    const response = await axios.post(redirectURL, request, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Response received!');
    console.log('Status:', response.status);
    console.log('Set-Cookie headers:', response.headers['set-cookie']);
    console.log('\nResponse data:', JSON.stringify(response.data, null, 2));

    // Check for token in cookies
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      if (tokenCookie) {
        const token = tokenCookie.split(';')[0].split('=')[1];
        console.log('\n🎉 Token found:', token.substring(0, 50) + '...');
      }
    }

    // Check PPMDResults
    if (response.data.PPMDResults) {
      const usercontext = response.data.PPMDResults.Results?.usercontext;
      if (usercontext && usercontext['#text']) {
        console.log('\n🎉 Token in usercontext:', usercontext['#text'].substring(0, 50) + '...');
      }
    }
  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  await prisma.$disconnect();
}

testRedirectLogin();
