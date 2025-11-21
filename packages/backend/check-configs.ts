/**
 * Check what configs are in the database
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfigs() {
  console.log('📋 Checking AdvancedMD Configs in Database\n');

  const configs = await prisma.advancedMDConfig.findMany();

  console.log(`Found ${configs.length} config(s):\n`);

  configs.forEach((config, index) => {
    console.log(`Config ${index + 1}:`);
    console.log('  Office Key:', config.officeKey);
    console.log('  Office Name:', config.officeName);
    console.log('  App Username:', config.appUsername);
    console.log('  Partner Username:', config.partnerUsername);
    console.log('  Environment:', config.environment);
    console.log('  Current Token:', config.currentToken ? config.currentToken.substring(0, 20) + '...' : 'null');
    console.log('  Token Expires:', config.tokenExpiresAt || 'null');
    console.log('');
  });

  await prisma.$disconnect();
}

checkConfigs();
