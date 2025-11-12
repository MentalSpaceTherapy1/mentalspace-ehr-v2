/**
 * Vendor & Financial Administration Test Script
 *
 * Tests all vendor, budget, expense, and purchase order endpoints
 *
 * Usage: node test-vendor-financial.js
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Test credentials (use existing admin user)
const TEST_EMAIL = 'admin@mentalspace.com';
const TEST_PASSWORD = 'Admin123!';

let authToken = '';
let testVendorId = '';
let testBudgetId = '';
let testExpenseId = '';
let testPurchaseOrderId = '';
let testUserId = '';

/**
 * Helper function to make API requests
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status}):`, data);
      return { success: false, status: response.status, data };
    }

    return { success: true, status: response.status, data };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 1: Authentication
 */
async function testAuthentication() {
  console.log('\n=== Test 1: Authentication ===');

  const result = await apiRequest('/auth/login', 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (result.success && result.data.token) {
    authToken = result.data.token;
    testUserId = result.data.user.id;
    console.log('✅ Authentication successful');
    console.log(`   User ID: ${testUserId}`);
    return true;
  } else {
    console.error('❌ Authentication failed');
    return false;
  }
}

/**
 * Test 2: Create Vendor
 */
async function testCreateVendor() {
  console.log('\n=== Test 2: Create Vendor ===');

  const vendorData = {
    companyName: 'Test Clinical Supplies Co.',
    contactPerson: 'John Smith',
    phone: '555-0123',
    email: 'contact@testvendor.com',
    address: {
      street: '123 Vendor Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
    },
    website: 'https://testvendor.com',
    servicesProvided: ['Medical Supplies', 'Diagnostic Equipment'],
    category: 'CLINICAL_SUPPLIES',
    contractStart: new Date('2025-01-01').toISOString(),
    contractEnd: new Date('2025-12-31').toISOString(),
    contractValue: 50000,
    paymentTerms: 'Net 30',
    insuranceExpiration: new Date('2025-12-31').toISOString(),
    performanceScore: 85,
    notes: 'Test vendor for clinical supplies',
  };

  const result = await apiRequest('/vendors', 'POST', vendorData);

  if (result.success && result.data.id) {
    testVendorId = result.data.id;
    console.log('✅ Vendor created successfully');
    console.log(`   Vendor ID: ${testVendorId}`);
    console.log(`   Company: ${result.data.companyName}`);
    return true;
  } else {
    console.error('❌ Failed to create vendor');
    return false;
  }
}

/**
 * Test 3: Get Vendor
 */
async function testGetVendor() {
  console.log('\n=== Test 3: Get Vendor ===');

  const result = await apiRequest(`/vendors/${testVendorId}`);

  if (result.success && result.data.id === testVendorId) {
    console.log('✅ Vendor retrieved successfully');
    console.log(`   Company: ${result.data.companyName}`);
    console.log(`   Category: ${result.data.category}`);
    console.log(`   Performance Score: ${result.data.performanceScore}`);
    return true;
  } else {
    console.error('❌ Failed to get vendor');
    return false;
  }
}

/**
 * Test 4: List Vendors
 */
async function testListVendors() {
  console.log('\n=== Test 4: List Vendors ===');

  const result = await apiRequest('/vendors?limit=10');

  if (result.success && Array.isArray(result.data.vendors)) {
    console.log('✅ Vendors listed successfully');
    console.log(`   Total vendors: ${result.data.total}`);
    console.log(`   Retrieved: ${result.data.vendors.length}`);
    return true;
  } else {
    console.error('❌ Failed to list vendors');
    return false;
  }
}

/**
 * Test 5: Create Budget
 */
async function testCreateBudget() {
  console.log('\n=== Test 5: Create Budget ===');

  const budgetData = {
    name: 'Clinical Supplies Budget FY2025',
    fiscalYear: 2025,
    department: 'Clinical Operations',
    category: 'CLINICAL_SUPPLIES',
    allocatedAmount: 100000,
    startDate: new Date('2025-01-01').toISOString(),
    endDate: new Date('2025-12-31').toISOString(),
    ownerId: testUserId,
    notes: 'Annual budget for clinical supplies',
  };

  const result = await apiRequest('/budgets', 'POST', budgetData);

  if (result.success && result.data.id) {
    testBudgetId = result.data.id;
    console.log('✅ Budget created successfully');
    console.log(`   Budget ID: ${testBudgetId}`);
    console.log(`   Allocated: $${result.data.allocatedAmount}`);
    console.log(`   Remaining: $${result.data.remainingAmount}`);
    return true;
  } else {
    console.error('❌ Failed to create budget');
    return false;
  }
}

/**
 * Test 6: Get Budget Utilization
 */
async function testGetBudgetUtilization() {
  console.log('\n=== Test 6: Get Budget Utilization ===');

  const result = await apiRequest(`/budgets/${testBudgetId}/utilization`);

  if (result.success && result.data) {
    console.log('✅ Budget utilization retrieved successfully');
    console.log(`   Allocated: $${result.data.allocatedAmount}`);
    console.log(`   Spent: $${result.data.spentAmount} (${result.data.percentSpent.toFixed(1)}%)`);
    console.log(`   Status: ${result.data.status}`);
    return true;
  } else {
    console.error('❌ Failed to get budget utilization');
    return false;
  }
}

/**
 * Test 7: Create Expense
 */
async function testCreateExpense() {
  console.log('\n=== Test 7: Create Expense ===');

  const expenseData = {
    description: 'Medical supplies purchase',
    category: 'CLINICAL_SUPPLIES',
    amount: 500,
    taxAmount: 40,
    expenseDate: new Date().toISOString(),
    vendorId: testVendorId,
    budgetId: testBudgetId,
    department: 'Clinical Operations',
    submittedById: testUserId,
    paymentMethod: 'Credit Card',
  };

  const result = await apiRequest('/expenses', 'POST', expenseData);

  if (result.success && result.data.id) {
    testExpenseId = result.data.id;
    console.log('✅ Expense created successfully');
    console.log(`   Expense ID: ${testExpenseId}`);
    console.log(`   Amount: $${result.data.amount}`);
    console.log(`   Total: $${result.data.totalAmount}`);
    console.log(`   Status: ${result.data.status}`);
    return true;
  } else {
    console.error('❌ Failed to create expense');
    return false;
  }
}

/**
 * Test 8: Approve Expense
 */
async function testApproveExpense() {
  console.log('\n=== Test 8: Approve Expense ===');

  const approvalData = {
    approvedById: testUserId,
    approvalNotes: 'Approved for necessary supplies',
  };

  const result = await apiRequest(`/expenses/${testExpenseId}/approve`, 'POST', approvalData);

  if (result.success && result.data.status === 'APPROVED') {
    console.log('✅ Expense approved successfully');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Approved by: ${result.data.approvedBy?.firstName} ${result.data.approvedBy?.lastName}`);
    return true;
  } else {
    console.error('❌ Failed to approve expense');
    return false;
  }
}

/**
 * Test 9: Create Purchase Order
 */
async function testCreatePurchaseOrder() {
  console.log('\n=== Test 9: Create Purchase Order ===');

  const poData = {
    vendorId: testVendorId,
    items: [
      {
        description: 'Diagnostic equipment - Model XYZ',
        quantity: 2,
        unitPrice: 1500,
        total: 3000,
      },
      {
        description: 'Medical supplies bundle',
        quantity: 5,
        unitPrice: 200,
        total: 1000,
      },
    ],
    tax: 320,
    shipping: 80,
    expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    budgetId: testBudgetId,
    department: 'Clinical Operations',
    requestedById: testUserId,
    notes: 'Urgent order for new clinic location',
  };

  const result = await apiRequest('/purchase-orders', 'POST', poData);

  if (result.success && result.data.id) {
    testPurchaseOrderId = result.data.id;
    console.log('✅ Purchase order created successfully');
    console.log(`   PO ID: ${testPurchaseOrderId}`);
    console.log(`   PO Number: ${result.data.poNumber}`);
    console.log(`   Subtotal: $${result.data.subtotal}`);
    console.log(`   Total: $${result.data.total}`);
    console.log(`   Status: ${result.data.status}`);
    return true;
  } else {
    console.error('❌ Failed to create purchase order');
    return false;
  }
}

/**
 * Test 10: Approve Purchase Order
 */
async function testApprovePurchaseOrder() {
  console.log('\n=== Test 10: Approve Purchase Order ===');

  const approvalData = {
    approvedById: testUserId,
  };

  const result = await apiRequest(
    `/purchase-orders/${testPurchaseOrderId}/approve`,
    'POST',
    approvalData
  );

  if (result.success && result.data.status === 'APPROVED') {
    console.log('✅ Purchase order approved successfully');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Approved by: ${result.data.approvedBy?.firstName} ${result.data.approvedBy?.lastName}`);
    return true;
  } else {
    console.error('❌ Failed to approve purchase order');
    return false;
  }
}

/**
 * Test 11: Get Vendor Performance
 */
async function testGetVendorPerformance() {
  console.log('\n=== Test 11: Get Vendor Performance ===');

  const result = await apiRequest(`/vendors/${testVendorId}/performance`);

  if (result.success && result.data) {
    console.log('✅ Vendor performance retrieved successfully');
    console.log(`   Total Expenses: ${result.data.totalExpenses}`);
    console.log(`   Total POs: ${result.data.totalPurchaseOrders}`);
    console.log(`   Avg Expense: $${result.data.averageExpenseAmount.toFixed(2)}`);
    console.log(`   Avg PO: $${result.data.averagePOAmount.toFixed(2)}`);
    console.log(`   Active Contract: ${result.data.activeContract}`);
    return true;
  } else {
    console.error('❌ Failed to get vendor performance');
    return false;
  }
}

/**
 * Test 12: Get Expense Summary
 */
async function testGetExpenseSummary() {
  console.log('\n=== Test 12: Get Expense Summary ===');

  const result = await apiRequest('/expenses/summary');

  if (result.success && result.data) {
    console.log('✅ Expense summary retrieved successfully');
    console.log(`   Total Expenses: ${result.data.totalExpenses}`);
    console.log(`   Pending: ${result.data.pendingCount}`);
    console.log(`   Approved: ${result.data.approvedCount}`);
    console.log(`   Total Pending: $${result.data.totalPending.toFixed(2)}`);
    console.log(`   Total Approved: $${result.data.totalApproved.toFixed(2)}`);
    return true;
  } else {
    console.error('❌ Failed to get expense summary');
    return false;
  }
}

/**
 * Test 13: Get PO Summary
 */
async function testGetPOSummary() {
  console.log('\n=== Test 13: Get Purchase Order Summary ===');

  const result = await apiRequest('/purchase-orders/summary');

  if (result.success && result.data) {
    console.log('✅ Purchase order summary retrieved successfully');
    console.log(`   Total POs: ${result.data.totalPOs}`);
    console.log(`   Pending: ${result.data.pendingCount}`);
    console.log(`   Approved: ${result.data.approvedCount}`);
    console.log(`   Total Approved: $${result.data.totalApproved.toFixed(2)}`);
    console.log(`   Overdue: ${result.data.overdueCount}`);
    return true;
  } else {
    console.error('❌ Failed to get PO summary');
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     VENDOR & FINANCIAL ADMINISTRATION TEST SUITE               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Create Vendor', fn: testCreateVendor },
    { name: 'Get Vendor', fn: testGetVendor },
    { name: 'List Vendors', fn: testListVendors },
    { name: 'Create Budget', fn: testCreateBudget },
    { name: 'Get Budget Utilization', fn: testGetBudgetUtilization },
    { name: 'Create Expense', fn: testCreateExpense },
    { name: 'Approve Expense', fn: testApproveExpense },
    { name: 'Create Purchase Order', fn: testCreatePurchaseOrder },
    { name: 'Approve Purchase Order', fn: testApprovePurchaseOrder },
    { name: 'Get Vendor Performance', fn: testGetVendorPerformance },
    { name: 'Get Expense Summary', fn: testGetExpenseSummary },
    { name: 'Get PO Summary', fn: testGetPOSummary },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw error:`, error.message);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  console.log('\n📊 Created Test Data:');
  if (testVendorId) console.log(`   Vendor ID: ${testVendorId}`);
  if (testBudgetId) console.log(`   Budget ID: ${testBudgetId}`);
  if (testExpenseId) console.log(`   Expense ID: ${testExpenseId}`);
  if (testPurchaseOrderId) console.log(`   Purchase Order ID: ${testPurchaseOrderId}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
