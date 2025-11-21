/**
 * Delete old config (990207) and keep the new one (162882)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteOldConfig() {
  console.log('🗑️  Deleting old config (office 990207)\n');

  const deleted = await prisma.advancedMDConfig.delete({
    where: { officeKey: '990207' },
  });

  console.log('✅ Deleted old config:');
  console.log('  Office Key:', deleted.officeKey);
  console.log('  App Username:', deleted.appUsername);
  console.log('');

  console.log('📋 Remaining configs:');
  const remaining = await prisma.advancedMDConfig.findMany();
  remaining.forEach(config => {
    console.log(`  - Office ${config.officeKey} (${config.appUsername})`);
  });

  await prisma.$disconnect();
}

deleteOldConfig();
