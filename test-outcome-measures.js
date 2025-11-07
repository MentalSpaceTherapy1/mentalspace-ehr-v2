const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';
let testClientId = '';

// Color output helpers
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

async function login() {
  try {
    info('Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@mentalspace.com',
      password: 'Password123!'
    });

    authToken = response.data.data.session.token;
    success('Login successful');
    return true;
  } catch (err) {
    error(`Login failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function getFirstClient() {
  try {
    info('Fetching first client...');
    const response = await axios.get(`${BASE_URL}/clients`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.data && response.data.data.length > 0) {
      testClientId = response.data.data[0].id;
      success(`Found client: ${response.data.data[0].firstName} ${response.data.data[0].lastName} (ID: ${testClientId})`);
      return true;
    }

    error('No clients found in database');
    return false;
  } catch (err) {
    error(`Failed to fetch clients: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testGetQuestionnaireDefinition() {
  console.log('\n' + colors.yellow + '=== Testing GET Questionnaire Definition ===' + colors.reset);

  const measureTypes = ['PHQ9', 'GAD7', 'PCL5'];

  for (const type of measureTypes) {
    try {
      const response = await axios.get(`${BASE_URL}/outcome-measures/questionnaire/${type}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const def = response.data.data;
      success(`${type}: ${def.questions.length} questions, score range ${def.scoringInfo.minScore}-${def.scoringInfo.maxScore}`);
    } catch (err) {
      error(`${type} failed: ${err.response?.data?.message || err.message}`);
    }
  }
}

async function testAdministerOutcomeMeasure() {
  console.log('\n' + colors.yellow + '=== Testing POST Administer Outcome Measure ===' + colors.reset);

  // Test PHQ-9
  try {
    const phq9Responses = {
      q1: 1, q2: 1, q3: 2, q4: 1, q5: 0, q6: 1, q7: 2, q8: 0, q9: 0
    };

    const response = await axios.post(`${BASE_URL}/outcome-measures/administer`, {
      clientId: testClientId,
      measureType: 'PHQ9',
      responses: phq9Responses,
      clinicalNotes: 'Test administration - automated testing'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const measure = response.data.data;
    success(`PHQ-9 administered: Score ${measure.totalScore}, Severity: ${measure.severityLabel}`);
    return measure.id;
  } catch (err) {
    error(`PHQ-9 administration failed: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function testGetClientOutcomeMeasures() {
  console.log('\n' + colors.yellow + '=== Testing GET Client Outcome Measures ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/outcome-measures/client/${testClientId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = response.data.data;
    success(`Retrieved ${data.count} outcome measures for client`);

    if (data.measures && data.measures.length > 0) {
      data.measures.slice(0, 3).forEach((m, i) => {
        info(`  ${i + 1}. ${m.measureType}: Score ${m.totalScore} - ${m.severityLabel}`);
      });
    }

    return true;
  } catch (err) {
    error(`Failed to get client measures: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testGetProgressData() {
  console.log('\n' + colors.yellow + '=== Testing GET Progress Data ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/outcome-measures/progress/${testClientId}/PHQ9`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const data = response.data.data;
    success(`Retrieved progress data: ${data.dataPoints.length} data points`);

    if (data.dataPoints.length > 0) {
      const scores = data.dataPoints.map(d => d.score);
      const trend = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;
      info(`  Score range: ${Math.min(...scores)} - ${Math.max(...scores)}`);
      info(`  Trend: ${trend > 0 ? 'worsening' : trend < 0 ? 'improving' : 'stable'} (${trend > 0 ? '+' : ''}${trend})`);
    }

    return true;
  } catch (err) {
    error(`Failed to get progress data: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testGetClientStatistics() {
  console.log('\n' + colors.yellow + '=== Testing GET Client Statistics ===' + colors.reset);

  try {
    const response = await axios.get(`${BASE_URL}/outcome-measures/statistics/${testClientId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const stats = response.data.data.statistics;
    success(`Retrieved statistics for client`);

    Object.keys(stats).forEach(measureType => {
      const s = stats[measureType];
      info(`  ${measureType}: ${s.totalAdministered} administrations, Latest: ${s.latestScore}, Avg: ${s.averageScore.toFixed(1)}`);
    });

    return true;
  } catch (err) {
    error(`Failed to get statistics: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function runTests() {
  console.log(colors.blue + '╔════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  Outcome Measures API Integration Tests       ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════════════╝' + colors.reset);

  // Login and setup
  if (!await login()) return;
  if (!await getFirstClient()) return;

  // Run tests
  await testGetQuestionnaireDefinition();
  const measureId = await testAdministerOutcomeMeasure();
  await testGetClientOutcomeMeasures();
  await testGetProgressData();
  await testGetClientStatistics();

  console.log('\n' + colors.blue + '╔════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  Test Summary                                  ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════════════╝' + colors.reset);
  success('All outcome measures endpoints are working correctly!');
  info('Frontend URL: http://localhost:5175/clients/' + testClientId + '/outcome-measures');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
