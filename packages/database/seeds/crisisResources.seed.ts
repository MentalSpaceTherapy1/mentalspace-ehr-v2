/**
 * Crisis Resources Seed Data
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * Comprehensive database of national and state-specific crisis resources
 * for mental health emergencies during telehealth sessions.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive crisis resources data
const crisisResources = [
  // ============================================================================
  // SUICIDE PREVENTION - NATIONAL
  // ============================================================================
  {
    id: 'suicide-988-lifeline',
    name: '988 Suicide & Crisis Lifeline',
    phone: '988',
    alternatePhone: '1-800-273-8255',
    textNumber: '988',
    website: 'https://988lifeline.org',
    description: 'The 988 Suicide & Crisis Lifeline provides 24/7, free and confidential support for people in distress, prevention and crisis resources. Available in English and Spanish.',
    category: 'SUICIDE',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'crisis-text-line',
    name: 'Crisis Text Line',
    phone: '',
    alternatePhone: null,
    textNumber: '741741',
    website: 'https://www.crisistextline.org',
    description: 'Free, 24/7 support for those in crisis. Text HOME to 741741 from anywhere in the United States to text with a trained Crisis Counselor.',
    category: 'SUICIDE',
    availability: '24/7',
    serviceType: 'TEXT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'trevor-project',
    name: 'The Trevor Project (LGBTQ Youth)',
    phone: '1-866-488-7386',
    alternatePhone: null,
    textNumber: '678678',
    website: 'https://www.thetrevorproject.org',
    description: '24/7 suicide prevention and crisis intervention for LGBTQ young people under 25. Call, text START to 678678, or chat online.',
    category: 'LGBTQ',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'trans-lifeline',
    name: 'Trans Lifeline',
    phone: '1-877-565-8860',
    alternatePhone: null,
    textNumber: null,
    website: 'https://translifeline.org',
    description: 'Peer support phone service run by trans people for trans and questioning callers. Available in English and Spanish.',
    category: 'LGBTQ',
    availability: '24/7',
    serviceType: 'HOTLINE',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 4,
  },

  // ============================================================================
  // VETERANS & MILITARY
  // ============================================================================
  {
    id: 'veterans-crisis-line',
    name: 'Veterans Crisis Line',
    phone: '988',
    alternatePhone: '1-800-273-8255',
    textNumber: '838255',
    website: 'https://www.veteranscrisisline.net',
    description: 'Free, confidential support for Veterans in crisis, their families and friends. Press 1 after dialing 988, text to 838255, or chat online. Available 24/7.',
    category: 'VETERANS',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 5,
  },

  // ============================================================================
  // SUBSTANCE ABUSE
  // ============================================================================
  {
    id: 'samhsa-helpline',
    name: 'SAMHSA National Helpline',
    phone: '1-800-662-4357',
    alternatePhone: null,
    textNumber: null,
    website: 'https://www.samhsa.gov/find-help/national-helpline',
    description: 'Free, confidential, 24/7 treatment referral and information service for individuals and families facing mental health and/or substance use disorders.',
    category: 'SUBSTANCE_ABUSE',
    availability: '24/7',
    serviceType: 'HOTLINE',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 6,
  },

  // ============================================================================
  // DOMESTIC VIOLENCE
  // ============================================================================
  {
    id: 'national-domestic-violence',
    name: 'National Domestic Violence Hotline',
    phone: '1-800-799-7233',
    alternatePhone: null,
    textNumber: 'START to 88788',
    website: 'https://www.thehotline.org',
    description: 'Free, confidential support 24/7 for victims and survivors of domestic violence. Available in English, Spanish, and 200+ languages via interpretation services.',
    category: 'DOMESTIC_VIOLENCE',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish', '200+ via interpreter'],
    isActive: true,
    displayOrder: 7,
  },
  {
    id: 'stronghearts-native',
    name: 'StrongHearts Native Helpline',
    phone: '1-844-762-8483',
    alternatePhone: null,
    textNumber: null,
    website: 'https://www.strongheartshelpline.org',
    description: 'Safe, confidential domestic violence and dating violence helpline specifically for Native Americans and Alaska Natives.',
    category: 'DOMESTIC_VIOLENCE',
    availability: '24/7',
    serviceType: 'HOTLINE, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English'],
    isActive: true,
    displayOrder: 8,
  },

  // ============================================================================
  // SEXUAL ASSAULT
  // ============================================================================
  {
    id: 'rainn-sexual-assault',
    name: 'National Sexual Assault Hotline (RAINN)',
    phone: '1-800-656-4673',
    alternatePhone: null,
    textNumber: null,
    website: 'https://www.rainn.org',
    description: 'Free, confidential support 24/7 from trained staff. Connects you with local sexual assault service providers. Also available via online chat.',
    category: 'SEXUAL_ASSAULT',
    availability: '24/7',
    serviceType: 'HOTLINE, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 9,
  },

  // ============================================================================
  // DISASTER & TRAUMA
  // ============================================================================
  {
    id: 'disaster-distress',
    name: 'Disaster Distress Helpline',
    phone: '1-800-985-5990',
    alternatePhone: null,
    textNumber: 'TalkWithUs to 66746',
    website: 'https://www.samhsa.gov/find-help/disaster-distress-helpline',
    description: '24/7 crisis counseling and support for people experiencing emotional distress related to natural or human-caused disasters.',
    category: 'DISASTER',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish', '100+ via interpreter'],
    isActive: true,
    displayOrder: 10,
  },

  // ============================================================================
  // YOUTH & CHILDREN
  // ============================================================================
  {
    id: 'boys-town-hotline',
    name: 'Boys Town National Hotline',
    phone: '1-800-448-3838',
    alternatePhone: null,
    textNumber: 'VOICE to 20121',
    website: 'https://www.boystown.org/hotline',
    description: '24/7 crisis, resource and referral line for kids, teens and parents. Trained counselors address issues including suicide, depression, abuse, and more.',
    category: 'YOUTH',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT, CHAT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 11,
  },

  // ============================================================================
  // MENTAL HEALTH GENERAL
  // ============================================================================
  {
    id: 'nami-helpline',
    name: 'NAMI Helpline',
    phone: '1-800-950-6264',
    alternatePhone: null,
    textNumber: 'HELPLINE to 62640',
    website: 'https://www.nami.org/help',
    description: 'Free, nationwide peer-support service providing information, resource referrals and support to people living with mental health conditions. Monday-Friday, 10am-10pm ET.',
    category: 'MENTAL_HEALTH',
    availability: 'WEEKDAYS_10AM_10PM_ET',
    serviceType: 'HOTLINE, TEXT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 12,
  },
  {
    id: 'postpartum-support',
    name: 'Postpartum Support International',
    phone: '1-800-944-4773',
    alternatePhone: null,
    textNumber: '503-894-9453',
    website: 'https://www.postpartum.net',
    description: 'Support for women experiencing postpartum depression, anxiety, and related mood disorders. Available 24/7. English and Spanish.',
    category: 'MENTAL_HEALTH',
    availability: '24/7',
    serviceType: 'HOTLINE, TEXT',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 13,
  },

  // ============================================================================
  // GEORGIA STATE-SPECIFIC RESOURCES
  // ============================================================================
  {
    id: 'georgia-crisis-access',
    name: 'Georgia Crisis & Access Line (GCAL)',
    phone: '1-800-715-4225',
    alternatePhone: null,
    textNumber: null,
    website: 'https://www.mygcal.com',
    description: 'Free, confidential crisis support and access to mental health and substance use services across Georgia. Available 24/7 in multiple languages.',
    category: 'SUICIDE',
    availability: '24/7',
    serviceType: 'HOTLINE',
    geographicScope: 'STATE',
    stateSpecific: 'GA',
    citySpecific: null,
    language: ['English', 'Spanish', '200+ via interpreter'],
    isActive: true,
    displayOrder: 14,
  },
  {
    id: 'georgia-dbhdd',
    name: 'Georgia DBHDD Crisis Line',
    phone: '1-800-715-4225',
    alternatePhone: null,
    textNumber: null,
    website: 'https://dbhdd.georgia.gov',
    description: 'Georgia Department of Behavioral Health and Developmental Disabilities crisis services. Provides immediate support and connects to local services.',
    category: 'MENTAL_HEALTH',
    availability: '24/7',
    serviceType: 'HOTLINE',
    geographicScope: 'STATE',
    stateSpecific: 'GA',
    citySpecific: null,
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 15,
  },
  {
    id: 'georgia-partnership',
    name: 'Georgia Partnership for Caring (Teen Suicide Prevention)',
    phone: '404-531-0012',
    alternatePhone: null,
    textNumber: null,
    website: 'https://georgiapartnershipforcaring.org',
    description: 'Resources and support for teen suicide prevention in Georgia. Provides education, training, and crisis support.',
    category: 'YOUTH',
    availability: 'BUSINESS_HOURS',
    serviceType: 'HOTLINE',
    geographicScope: 'STATE',
    stateSpecific: 'GA',
    citySpecific: null,
    language: ['English'],
    isActive: true,
    displayOrder: 16,
  },
  {
    id: 'atlanta-mobile-crisis',
    name: 'Atlanta Mobile Crisis Team',
    phone: '404-730-1600',
    alternatePhone: null,
    textNumber: null,
    website: 'https://www.atlantaga.gov',
    description: 'Mobile crisis response team for mental health emergencies in Atlanta. Can dispatch to location for in-person assessment and support.',
    category: 'MENTAL_HEALTH',
    availability: '24/7',
    serviceType: 'IN_PERSON',
    geographicScope: 'LOCAL',
    stateSpecific: 'GA',
    citySpecific: 'Atlanta',
    language: ['English', 'Spanish'],
    isActive: true,
    displayOrder: 17,
  },
  {
    id: 'georgia-hope-line',
    name: 'Georgia Hope Line (DBHDD)',
    phone: '404-657-2168',
    alternatePhone: null,
    textNumber: null,
    website: 'https://dbhdd.georgia.gov',
    description: 'Information and referral line for behavioral health services in Georgia. Weekdays 8am-5pm.',
    category: 'MENTAL_HEALTH',
    availability: 'BUSINESS_HOURS',
    serviceType: 'HOTLINE',
    geographicScope: 'STATE',
    stateSpecific: 'GA',
    citySpecific: null,
    language: ['English'],
    isActive: true,
    displayOrder: 18,
  },

  // ============================================================================
  // SPECIALIZED POPULATIONS
  // ============================================================================
  {
    id: 'deaf-crisis-line',
    name: 'National Suicide Prevention Lifeline (Deaf/HoH)',
    phone: '1-800-799-4889',
    alternatePhone: null,
    textNumber: null,
    website: 'https://988lifeline.org',
    description: 'Video relay service for deaf and hard of hearing individuals. Available 24/7.',
    category: 'SUICIDE',
    availability: '24/7',
    serviceType: 'VIDEO_RELAY',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['ASL'],
    isActive: true,
    displayOrder: 19,
  },
  {
    id: 'elder-abuse',
    name: 'National Elder Abuse Hotline',
    phone: '1-800-677-1116',
    alternatePhone: null,
    textNumber: null,
    website: 'https://eldercare.acl.gov',
    description: 'Report suspected elder abuse and get information about elder care resources. Available 24/7.',
    category: 'ABUSE',
    availability: '24/7',
    serviceType: 'HOTLINE',
    geographicScope: 'NATIONAL',
    stateSpecific: null,
    citySpecific: null,
    language: ['English'],
    isActive: true,
    displayOrder: 20,
  },
];

/**
 * Seed the crisis resources database
 */
export async function seedCrisisResources() {
  console.log('Starting crisis resources seed...');

  try {
    // Delete existing resources (if re-seeding)
    const deleteCount = await prisma.crisisResource.deleteMany({});
    console.log(`Deleted ${deleteCount.count} existing crisis resources`);

    // Insert all crisis resources
    let successCount = 0;
    let errorCount = 0;

    for (const resource of crisisResources) {
      try {
        await prisma.crisisResource.create({
          data: resource,
        });
        successCount++;
        console.log(`✓ Added: ${resource.name}`);
      } catch (error: any) {
        errorCount++;
        console.error(`✗ Failed to add ${resource.name}:`, error.message);
      }
    }

    console.log('\n=== Crisis Resources Seed Complete ===');
    console.log(`Successfully added: ${successCount} resources`);
    console.log(`Failed: ${errorCount} resources`);
    console.log(`Total in database: ${await prisma.crisisResource.count()}`);

    // Display summary by category
    const categories = await prisma.crisisResource.groupBy({
      by: ['category'],
      _count: true,
    });

    console.log('\n=== Resources by Category ===');
    categories.forEach((cat) => {
      console.log(`${cat.category}: ${cat._count} resources`);
    });

    // Display geographic coverage
    const geographic = await prisma.crisisResource.groupBy({
      by: ['geographicScope'],
      _count: true,
    });

    console.log('\n=== Geographic Coverage ===');
    geographic.forEach((geo) => {
      console.log(`${geo.geographicScope}: ${geo._count} resources`);
    });

  } catch (error: any) {
    console.error('Error seeding crisis resources:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedCrisisResources()
    .then(() => {
      console.log('\nCrisis resources seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nCrisis resources seed failed:', error);
      process.exit(1);
    });
}
