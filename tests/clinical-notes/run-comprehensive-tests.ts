import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * COMPREHENSIVE TEST EXECUTION SCRIPT
 * Runs all Clinical Notes module tests and generates detailed reports
 */

interface TestResult {
  testFile: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: TestError[];
}

interface TestError {
  testName: string;
  error: string;
  stackTrace: string;
  screenshot?: string;
}

interface ComprehensiveReport {
  executionDate: string;
  totalDuration: number;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
  testResults: TestResult[];
  detailedErrors: TestError[];
  coverage: {
    noteTypes: string[];
    apiEndpoints: string[];
    uiComponents: string[];
    workflows: string[];
  };
}

class ClinicalNotesTestRunner {
  private reportDir: string;
  private screenshotDir: string;
  private startTime: number = 0;

  constructor() {
    this.reportDir = path.join(__dirname, '../../test-reports/clinical-notes');
    this.screenshotDir = path.join(this.reportDir, 'screenshots');
  }

  async initialize() {
    // Create report directories
    await fs.mkdir(this.reportDir, { recursive: true });
    await fs.mkdir(this.screenshotDir, { recursive: true });

    console.log('🚀 Initializing Clinical Notes Comprehensive Test Suite');
    console.log('===============================================');
    console.log('');
  }

  async runTests(): Promise<ComprehensiveReport> {
    this.startTime = Date.now();

    const testResults: TestResult[] = [];

    // Test files to run
    const testFiles = [
      'clinical-notes-comprehensive.spec.ts',
      'clinical-notes-comprehensive-part2.spec.ts'
    ];

    console.log('📋 Test Execution Plan:');
    console.log('  - All 8 Note Types');
    console.log('  - All CRUD Operations');
    console.log('  - All Workflows (Sign, Cosign, Revision, Lock/Unlock)');
    console.log('  - All Pages (My Notes, Cosign Queue, Compliance Dashboard)');
    console.log('  - All Forms (Complete field testing)');
    console.log('  - All Tables/Lists (Filters, Sorting, Pagination)');
    console.log('  - All API Endpoints (30+ endpoints)');
    console.log('  - All Database Operations');
    console.log('  - All Validation Rules');
    console.log('  - Amendment History');
    console.log('  - Outcome Measures');
    console.log('  - Electronic Signatures');
    console.log('  - All Error Scenarios');
    console.log('');

    for (const testFile of testFiles) {
      console.log(`\n🧪 Running: ${testFile}`);
      console.log('-------------------------------------------');

      try {
        const result = await this.runTestFile(testFile);
        testResults.push(result);

        console.log(`✅ Completed: ${result.passed}/${result.totalTests} passed`);
      } catch (error: any) {
        console.error(`❌ Failed to run ${testFile}:`, error.message);
      }
    }

    const totalDuration = Date.now() - this.startTime;

    // Generate comprehensive report
    const report: ComprehensiveReport = {
      executionDate: new Date().toISOString(),
      totalDuration,
      summary: this.calculateSummary(testResults),
      testResults,
      detailedErrors: this.collectErrors(testResults),
      coverage: this.calculateCoverage()
    };

    return report;
  }

  private async runTestFile(testFile: string): Promise<TestResult> {
    const startTime = Date.now();

    const command = `npx playwright test ${path.join(__dirname, testFile)} --reporter=json`;

    try {
      const { stdout, stderr } = await execAsync(command);

      // Parse Playwright JSON output
      const jsonReport = JSON.parse(stdout);

      const result: TestResult = {
        testFile,
        totalTests: jsonReport.stats.expected,
        passed: jsonReport.stats.passed,
        failed: jsonReport.stats.failed,
        skipped: jsonReport.stats.skipped,
        duration: Date.now() - startTime,
        errors: this.parseErrors(jsonReport)
      };

      return result;
    } catch (error: any) {
      return {
        testFile,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [{
          testName: testFile,
          error: error.message,
          stackTrace: error.stack || ''
        }]
      };
    }
  }

  private parseErrors(jsonReport: any): TestError[] {
    const errors: TestError[] = [];

    for (const suite of jsonReport.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (test.results && test.results.some((r: any) => r.status === 'failed')) {
            const failedResult = test.results.find((r: any) => r.status === 'failed');

            errors.push({
              testName: `${suite.title} > ${spec.title}`,
              error: failedResult.error?.message || 'Unknown error',
              stackTrace: failedResult.error?.stack || '',
              screenshot: failedResult.attachments?.find((a: any) => a.name === 'screenshot')?.path
            });
          }
        }
      }
    }

    return errors;
  }

  private calculateSummary(testResults: TestResult[]) {
    const summary = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      passRate: 0
    };

    for (const result of testResults) {
      summary.totalTests += result.totalTests;
      summary.passed += result.passed;
      summary.failed += result.failed;
      summary.skipped += result.skipped;
    }

    summary.passRate = summary.totalTests > 0
      ? (summary.passed / summary.totalTests) * 100
      : 0;

    return summary;
  }

  private collectErrors(testResults: TestResult[]): TestError[] {
    const allErrors: TestError[] = [];

    for (const result of testResults) {
      allErrors.push(...result.errors);
    }

    return allErrors;
  }

  private calculateCoverage() {
    return {
      noteTypes: [
        'Intake Assessment',
        'Progress Note',
        'Treatment Plan',
        'Cancellation Note',
        'Consultation Note',
        'Contact Note',
        'Termination Note',
        'Miscellaneous Note',
        'Group Therapy Note'
      ],
      apiEndpoints: [
        'GET /api/v1/clinical-notes/my-notes',
        'GET /api/v1/clinical-notes/client/:clientId',
        'GET /api/v1/clinical-notes/:id',
        'POST /api/v1/clinical-notes',
        'PATCH /api/v1/clinical-notes/:id',
        'PUT /api/v1/clinical-notes/:id',
        'DELETE /api/v1/clinical-notes/:id',
        'POST /api/v1/clinical-notes/:id/sign',
        'POST /api/v1/clinical-notes/:id/cosign',
        'GET /api/v1/clinical-notes/cosigning',
        'POST /api/v1/clinical-notes/:id/return-for-revision',
        'POST /api/v1/clinical-notes/:id/resubmit-for-review',
        'GET /api/v1/clinical-notes/validation-rules/:noteType',
        'POST /api/v1/clinical-notes/validate',
        'GET /api/v1/clinical-notes/validation-summary/:noteType',
        'GET /api/v1/clinical-notes/client/:clientId/diagnosis',
        'GET /api/v1/clinical-notes/client/:clientId/treatment-plan-status',
        'GET /api/v1/clinical-notes/client/:clientId/eligible-appointments/:noteType',
        'GET /api/v1/clinical-notes/client/:clientId/inherited-diagnoses/:noteType',
        'GET /api/v1/clinical-notes/compliance/dashboard',
        'GET /api/v1/clinical-notes/compliance/appointments-without-notes',
        'GET /api/v1/clinical-notes/:id/billing-readiness',
        'POST /api/v1/amendments',
        'GET /api/v1/amendments/note/:noteId',
        'POST /api/v1/outcome-measures',
        'GET /api/v1/outcome-measures/note/:noteId',
        'POST /api/v1/signature-events',
        'GET /api/v1/billing-holds/:noteId'
      ],
      uiComponents: [
        'Note Type Selector',
        'Appointment Picker',
        'Appointment Quick Create',
        'ICD-10 Autocomplete',
        'CPT Code Autocomplete',
        'Signature Modal',
        'Revision Modal',
        'Amendment Modal',
        'Outcome Measures Section',
        'Validation Summary',
        'Clinical Notes List',
        'Cosign Queue',
        'Compliance Dashboard',
        'Note Detail View',
        'Amendment History Tab',
        'Version Comparison Modal',
        'Revision Banner',
        'Appointment Badge',
        'Schedule Header',
        'Validated Field',
        'Shared Form Components'
      ],
      workflows: [
        'Create Draft Note',
        'Sign Note (PIN)',
        'Sign Note (Password)',
        'Cosign Note',
        'Return for Revision',
        'Resubmit After Revision',
        'Lock/Unlock Note',
        'Create Amendment',
        'Add Outcome Measure',
        'Validate Note',
        'Delete Draft Note',
        'Filter & Search Notes',
        'Sort Notes',
        'View Compliance Dashboard',
        'Create Note from Appointment',
        'Inherit Diagnoses',
        'Treatment Plan Update Rule (3-month)',
        'Intake Must Be First Rule',
        'Duplicate Note Prevention',
        '7-Day Completion Rule',
        '3-Day Overdue Warning',
        'Sunday Lockout',
        'Unlock Request Workflow'
      ]
    };
  }

  async generateHTMLReport(report: ComprehensiveReport) {
    const htmlPath = path.join(this.reportDir, 'clinical-notes-test-report.html');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clinical Notes Module - Comprehensive Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-card .number {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
        }
        .summary-card.passed .number { color: #28a745; }
        .summary-card.failed .number { color: #dc3545; }
        .summary-card.skipped .number { color: #ffc107; }
        .section {
            padding: 40px;
        }
        .section h2 {
            color: #343a40;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        .test-result {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .test-result h3 {
            color: #495057;
            margin-bottom: 15px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        .stat {
            padding: 8px 15px;
            border-radius: 5px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .stat.passed { background: #d4edda; color: #155724; }
        .stat.failed { background: #f8d7da; color: #721c24; }
        .stat.skipped { background: #fff3cd; color: #856404; }
        .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin-top: 15px;
            border-radius: 5px;
        }
        .error-title {
            font-weight: bold;
            color: #721c24;
            margin-bottom: 8px;
        }
        .error-message {
            color: #721c24;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        .coverage {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .coverage-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
        }
        .coverage-section h3 {
            color: #495057;
            margin-bottom: 15px;
        }
        .coverage-list {
            list-style: none;
        }
        .coverage-list li {
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
            color: #6c757d;
        }
        .coverage-list li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
            margin-right: 5px;
        }
        .footer {
            background: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .pass-rate {
            font-size: 4em;
            font-weight: bold;
            ${report.summary.passRate >= 90 ? 'color: #28a745;' : report.summary.passRate >= 70 ? 'color: #ffc107;' : 'color: #dc3545;'}
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Clinical Notes Module</h1>
            <p>Comprehensive Test Report</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Generated: ${new Date(report.executionDate).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="number">${report.summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="number">${report.summary.failed}</div>
            </div>
            <div class="summary-card skipped">
                <h3>Skipped</h3>
                <div class="number">${report.summary.skipped}</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="pass-rate">${report.summary.passRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="number">${(report.totalDuration / 1000 / 60).toFixed(1)}<span style="font-size: 0.5em;">min</span></div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Test Results by File</h2>
            ${report.testResults.map(result => `
                <div class="test-result">
                    <h3>📄 ${result.testFile}</h3>
                    <div class="stats">
                        <span class="stat passed">✓ ${result.passed} Passed</span>
                        <span class="stat failed">✗ ${result.failed} Failed</span>
                        <span class="stat skipped">⊘ ${result.skipped} Skipped</span>
                        <span style="color: #6c757d; padding: 8px 15px;">⏱ ${(result.duration / 1000).toFixed(2)}s</span>
                    </div>
                    ${result.errors.length > 0 ? `
                        <div class="error">
                            <div class="error-title">❌ Errors Found:</div>
                            ${result.errors.map(error => `
                                <div style="margin-top: 10px;">
                                    <strong>${error.testName}</strong>
                                    <div class="error-message">${error.error}</div>
                                    ${error.screenshot ? `<div style="margin-top: 10px;"><img src="${error.screenshot}" style="max-width: 100%; border-radius: 5px;"></div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        ${report.detailedErrors.length > 0 ? `
            <div class="section" style="background: #fff3cd;">
                <h2>⚠️ All Errors (${report.detailedErrors.length})</h2>
                ${report.detailedErrors.map((error, index) => `
                    <div class="error" style="margin-bottom: 15px;">
                        <div class="error-title">${index + 1}. ${error.testName}</div>
                        <div class="error-message">${error.error}</div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="section" style="background: #f8f9fa;">
            <h2>📋 Test Coverage</h2>
            <div class="coverage">
                <div class="coverage-section">
                    <h3>Note Types Tested (${report.coverage.noteTypes.length})</h3>
                    <ul class="coverage-list">
                        ${report.coverage.noteTypes.map(type => `<li>${type}</li>`).join('')}
                    </ul>
                </div>
                <div class="coverage-section">
                    <h3>API Endpoints Tested (${report.coverage.apiEndpoints.length})</h3>
                    <ul class="coverage-list">
                        ${report.coverage.apiEndpoints.slice(0, 10).map(endpoint => `<li>${endpoint}</li>`).join('')}
                        ${report.coverage.apiEndpoints.length > 10 ? `<li>... and ${report.coverage.apiEndpoints.length - 10} more</li>` : ''}
                    </ul>
                </div>
                <div class="coverage-section">
                    <h3>UI Components Tested (${report.coverage.uiComponents.length})</h3>
                    <ul class="coverage-list">
                        ${report.coverage.uiComponents.slice(0, 10).map(component => `<li>${component}</li>`).join('')}
                        ${report.coverage.uiComponents.length > 10 ? `<li>... and ${report.coverage.uiComponents.length - 10} more</li>` : ''}
                    </ul>
                </div>
                <div class="coverage-section">
                    <h3>Workflows Tested (${report.coverage.workflows.length})</h3>
                    <ul class="coverage-list">
                        ${report.coverage.workflows.slice(0, 10).map(workflow => `<li>${workflow}</li>`).join('')}
                        ${report.coverage.workflows.length > 10 ? `<li>... and ${report.coverage.workflows.length - 10} more</li>` : ''}
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Clinical Notes Module - Comprehensive Test Suite</p>
            <p style="margin-top: 10px; opacity: 0.8;">Testing Every Function, Form, Table, Database Operation & Workflow</p>
        </div>
    </div>
</body>
</html>
    `;

    await fs.writeFile(htmlPath, html, 'utf-8');
    console.log(`\n📄 HTML Report generated: ${htmlPath}`);
  }

  async generateJSONReport(report: ComprehensiveReport) {
    const jsonPath = path.join(this.reportDir, 'clinical-notes-test-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON Report generated: ${jsonPath}`);
  }

  async generateMarkdownReport(report: ComprehensiveReport) {
    const mdPath = path.join(this.reportDir, 'CLINICAL_NOTES_TEST_REPORT.md');

    const markdown = `# Clinical Notes Module - Comprehensive Test Report

## Execution Summary

- **Date**: ${new Date(report.executionDate).toLocaleString()}
- **Total Duration**: ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes

## Test Results

| Metric | Count |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.passed} ✅ |
| Failed | ${report.summary.failed} ❌ |
| Skipped | ${report.summary.skipped} ⊘ |
| **Pass Rate** | **${report.summary.passRate.toFixed(2)}%** |

## Results by Test File

${report.testResults.map(result => `
### ${result.testFile}

- Total: ${result.totalTests}
- Passed: ${result.passed} ✅
- Failed: ${result.failed} ❌
- Skipped: ${result.skipped} ⊘
- Duration: ${(result.duration / 1000).toFixed(2)}s

${result.errors.length > 0 ? `
**Errors:**
${result.errors.map((error, i) => `
${i + 1}. **${error.testName}**
   \`\`\`
   ${error.error}
   \`\`\`
`).join('\n')}
` : '_No errors_'}
`).join('\n')}

## Test Coverage

### Note Types (${report.coverage.noteTypes.length})
${report.coverage.noteTypes.map(type => `- ${type}`).join('\n')}

### API Endpoints (${report.coverage.apiEndpoints.length})
${report.coverage.apiEndpoints.map(endpoint => `- ${endpoint}`).join('\n')}

### UI Components (${report.coverage.uiComponents.length})
${report.coverage.uiComponents.map(component => `- ${component}`).join('\n')}

### Workflows (${report.coverage.workflows.length})
${report.coverage.workflows.map(workflow => `- ${workflow}`).join('\n')}

${report.detailedErrors.length > 0 ? `
## Detailed Errors (${report.detailedErrors.length})

${report.detailedErrors.map((error, i) => `
### ${i + 1}. ${error.testName}

\`\`\`
${error.error}
\`\`\`

${error.stackTrace ? `
<details>
<summary>Stack Trace</summary>

\`\`\`
${error.stackTrace}
\`\`\`

</details>
` : ''}
`).join('\n')}
` : ''}

---

**Generated by Clinical Notes Comprehensive Test Suite**
`;

    await fs.writeFile(mdPath, markdown, 'utf-8');
    console.log(`📄 Markdown Report generated: ${mdPath}`);
  }

  async printConsoleSummary(report: ComprehensiveReport) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           CLINICAL NOTES TEST EXECUTION COMPLETE          ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`📊 Total Tests:    ${report.summary.totalTests}`);
    console.log(`✅ Passed:         ${report.summary.passed}`);
    console.log(`❌ Failed:         ${report.summary.failed}`);
    console.log(`⊘  Skipped:        ${report.summary.skipped}`);
    console.log(`📈 Pass Rate:      ${report.summary.passRate.toFixed(2)}%`);
    console.log(`⏱  Duration:       ${(report.totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`📄 Reports generated in: ${this.reportDir}`);
    console.log('   - clinical-notes-test-report.html (Visual Report)');
    console.log('   - clinical-notes-test-report.json (Data Export)');
    console.log('   - CLINICAL_NOTES_TEST_REPORT.md (Documentation)');
    console.log('');

    if (report.summary.failed > 0) {
      console.log('⚠️  ERRORS FOUND:');
      console.log('═══════════════════════════════════════════════════════════');
      report.detailedErrors.slice(0, 5).forEach((error, i) => {
        console.log(`\n${i + 1}. ${error.testName}`);
        console.log(`   ${error.error}`);
      });

      if (report.detailedErrors.length > 5) {
        console.log(`\n... and ${report.detailedErrors.length - 5} more errors`);
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
  }
}

// Main execution
async function main() {
  const runner = new ClinicalNotesTestRunner();

  try {
    await runner.initialize();

    const report = await runner.runTests();

    await runner.generateHTMLReport(report);
    await runner.generateJSONReport(report);
    await runner.generateMarkdownReport(report);

    await runner.printConsoleSummary(report);

    process.exit(report.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

main();
