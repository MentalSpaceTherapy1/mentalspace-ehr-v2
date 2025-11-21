/**
 * Test Patient Lookup in AdvancedMD
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { AdvancedMDPatientSyncService } from './src/integrations/advancedmd/patient-sync.service';

async function testPatientLookup() {
  console.log('🔍 Testing AdvancedMD Patient Lookup\n');

  try {
    const patientSync = new AdvancedMDPatientSyncService();

    console.log('1. Initializing patient sync service...');
    await patientSync.initialize();
    console.log('✅ Initialized\n');

    // Test 1: Lookup by name and DOB
    console.log('2. Testing lookup by name and DOB...');
    console.log('   Searching for: John Doe, DOB: 01/15/1990');

    const result1 = await patientSync.lookupPatient('Doe', 'John', '01/15/1990');

    if (result1.found) {
      console.log('✅ Patient found!');
      if (result1.advancedMDPatientId) {
        console.log('   Patient ID:', result1.advancedMDPatientId);
        console.log('   Demographics:', JSON.stringify(result1.demographic, null, 2));
      } else if (result1.multipleMatches) {
        console.log('   Multiple matches found:', result1.multipleMatches.length);
        result1.multipleMatches.forEach((match, index) => {
          console.log(`   Match ${index + 1}:`, match);
        });
      }
    } else {
      console.log('ℹ️  Patient not found (expected if patient doesn\'t exist)');
    }

    // Test 2: Lookup by ID (if found in test 1)
    if (result1.found && result1.advancedMDPatientId) {
      console.log('\n3. Testing lookup by patient ID...');
      console.log('   Patient ID:', result1.advancedMDPatientId);

      const result2 = await patientSync.lookupPatientById(result1.advancedMDPatientId);

      if (result2.found) {
        console.log('✅ Patient found by ID');
        console.log('   Demographics:', JSON.stringify(result2.demographic, null, 2));
      } else {
        console.log('❌ Patient not found by ID (unexpected)');
      }
    }

    console.log('\n🎉 Patient lookup test completed!');
  } catch (error: any) {
    console.error('\n❌ Patient lookup test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testPatientLookup();
