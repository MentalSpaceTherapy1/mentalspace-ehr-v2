# MentalSpaceEHR V2 - Module 5: Billing & Claims Management
## Comprehensive Product Requirements Document

---

## CRITICAL IMPLEMENTATION DIRECTIVE

**This PRD defines MINIMUM requirements. The implemented system:**
- ✅ **CAN and SHOULD** include additional features, enhancements, and optimizations beyond what's specified
- ❌ **MUST NOT** omit any feature, workflow, or requirement documented in this PRD
- 🎯 **MUST** treat every requirement as mandatory unless explicitly marked as "optional" or "future enhancement"

---

## Module Overview

The Billing & Claims Management module is the financial engine of MentalSpaceEHR V2, managing all aspects of revenue cycle management from service delivery through payment collection. This module features deep integration with AdvancedMD for claims processing, AI-powered billing analytics, automated charge capture, complex authorization management, and comprehensive financial reporting while ensuring compliance with billing regulations and maximizing practice revenue.

---

## 1. Business Requirements

### 1.1 Primary Objectives
- Maximize revenue capture through automated charge creation and claim submission
- Minimize claim denials through AI-powered validation and verification
- Streamline payment posting and reconciliation processes
- Ensure compliance with incident-to billing and supervision requirements
- Provide real-time financial insights through AI analytics
- Reduce administrative burden through automation
- Support multiple insurance payers and payment methods
- Maintain detailed audit trails for financial compliance

### 1.2 Billing Scenarios

#### Standard Billing Types
- **Individual Therapy Sessions**
  - Standard psychotherapy codes (90834, 90837, 90853)
  - Initial evaluations (90791, 90792)
  - Crisis interventions (90839, 90840)
  - Add-on codes for complexity

- **Group Therapy Billing**
  - Group psychotherapy (90853)
  - Multi-family group (90849)
  - Group size tracking
  - Individual billing per participant

- **Psychological Testing**
  - Testing administration
  - Scoring and interpretation
  - Report writing
  - Multi-day test batteries

- **Incident-to Billing**
  - Supervisor NPI used for billing
  - Supervisee as rendering provider
  - Documentation requirements met
  - Compliance tracking

#### Payment Types
- Insurance payments (primary, secondary, tertiary)
- Client copayments and coinsurance
- Deductible collections
- Self-pay/private pay
- Sliding scale fees
- Employee Assistance Program (EAP)
- Grant funding
- Court-ordered payment arrangements

### 1.3 Regulatory Requirements
- CMS incident-to billing rules
- State-specific billing regulations
- Insurance contract compliance
- Timely filing requirements
- Medical necessity documentation
- Fraud and abuse prevention
- HIPAA transaction standards

---

## 2. Functional Requirements

### 2.1 Charge Capture & Creation

#### Automated Charge Generation

**Appointment-Based Charge Creation:**
When a clinical note is signed, the system automatically:

1. **Extracts Billing Information:**
   - Service date and time
   - Duration of service
   - Provider information
   - Location of service
   - Service type

2. **Determines CPT Codes:**
   - Primary procedure code
   - Add-on codes if applicable
   - Modifiers (telehealth, etc.)
   - Units of service
   - Place of service codes

3. **Validates Billing Requirements:**
   - Note completion status
   - Signature requirements met
   - Supervision documentation complete
   - Medical necessity documented
   - Authorization available

**Manual Charge Creation:**
- Non-appointment charges
- Missed appointment fees
- Report writing charges
- Phone consultation billing
- Court testimony billing
- Record preparation fees

**Charge Validation Rules:**
- Duplicate charge prevention
- Date of service validation
- Provider credential checking
- Authorization verification
- Diagnosis requirement checking
- Timely filing validation

### 2.2 Insurance Verification & Authorization

#### Real-Time Insurance Verification

**AdvancedMD Integration:**
The system connects to AdvancedMD's eligibility API to check:

**Coverage Information:**
- Active coverage status
- Effective and termination dates
- Mental health benefits
- Outpatient vs inpatient coverage
- Telehealth coverage
- Group therapy coverage

**Financial Information:**
- Copay amounts
- Deductible (individual/family)
- Deductible met to date
- Coinsurance percentages
- Out-of-pocket maximum
- Out-of-pocket met to date

**Authorization Details:**
- Prior authorization requirements
- Existing authorizations
- Sessions used/remaining
- Authorization expiration dates
- Covered diagnoses
- Excluded diagnoses

#### Prior Authorization Management

**Authorization Tracking:**
- Authorization request submission
- Required documentation attachment
- Approval/denial tracking
- Appeal management
- Authorization updates
- Expiration warnings

**Session Management:**
- Remaining session countdown
- Warning at 5, 3, 1 sessions
- Automatic stop at limit
- Override documentation
- Extension requests
- Retroactive authorization

### 2.3 Claims Generation & Submission

#### Electronic Claims Creation

**Claims Assembly Process:**
1. **Data Collection:**
   - Patient demographics
   - Insurance information
   - Provider information
   - Service details
   - Diagnosis codes
   - Referring provider

2. **Claims Validation:**
   - Required field checking
   - Format validation
   - Diagnosis/procedure matching
   - Medical necessity checking
   - Duplicate checking
   - Timely filing checking

3. **Claims Generation:**
   - 837P format creation
   - Payer-specific requirements
   - Secondary claims creation
   - Corrected claims handling
   - Void/replacement claims

**AdvancedMD Submission:**
- Batch creation (hourly/daily)
- Real-time submission option
- Acknowledgment tracking
- Rejection handling
- Status monitoring
- Error queue management

### 2.4 Payment Processing

#### Payment Posting

**ERA/Electronic Payment Posting:**
- 835 file processing
- Automatic payment matching
- Adjustment reason codes
- Denial reason codes
- Secondary billing triggers
- Patient responsibility calculation

**Manual Payment Entry:**
- Check payments
- Credit card payments
- Cash payments
- Payment plans
- Write-offs
- Refunds

**Payment Application Rules:**
- Oldest balance first
- Copay before coinsurance
- Primary before secondary
- Service line distribution
- Credit balance handling
- Refund processing

#### Client Payment Management

**Payment Collection:**
- Point-of-service collection
- Payment plan setup
- Auto-pay enrollment
- Credit card on file
- Payment reminders
- Collection workflows

**Payment Methods:**
- Credit/debit cards (PCI compliant)
- ACH/bank transfers
- Cash handling
- Check processing
- HSA/FSA cards
- Payment links via portal

### 2.5 Denial Management

#### Automated Denial Processing

**Denial Categorization:**
- Authorization denials
- Medical necessity denials
- Coding errors
- Eligibility issues
- Timely filing denials
- Duplicate claim denials

**Denial Workflow:**
1. Automatic categorization
2. Assignment to appropriate queue
3. Suggested resolution
4. Documentation requirements
5. Appeal generation
6. Resubmission tracking

**AI-Powered Denial Prevention:**
- Pattern recognition
- Common denial predictions
- Preventive alerts
- Documentation suggestions
- Coding recommendations

### 2.6 AI Billing Analytics

#### Revenue Cycle Analytics

**Real-Time KPIs:**
- Days in A/R
- Collection rate
- Denial rate
- First-pass resolution rate
- Net collection rate
- Average payment time

**AI-Powered Insights:**
The AI continuously analyzes billing data to provide:

**Revenue Optimization:**
- Undercoding detection
- Missing charge identification
- Authorization optimization
- Payer mix analysis
- Service line profitability
- Provider productivity analysis

**Predictive Analytics:**
- Payment likelihood scoring
- Denial risk prediction
- Collection timeline forecasting
- Bad debt prediction
- Seasonal trend analysis
- Cash flow projections

**Actionable Recommendations:**
- "Provider X has 15% higher denial rate - recommend coding training"
- "Tuesday appointments have 30% lower collection rate"
- "Insurance Y denies 90853 without prior auth - update workflow"
- "Client payment plans over $500 have 60% default rate"

### 2.7 Financial Reporting

#### Standard Reports

**Daily Reports:**
- Charges created
- Payments received
- Claims submitted
- Denials received
- Deposit summary

**Monthly Reports:**
- Revenue summary
- A/R aging
- Payer analysis
- Provider productivity
- Collection analysis
- Write-off summary

**Annual Reports:**
- Tax reporting (1099s)
- Financial statements
- Audit reports
- Compliance reports

#### Custom Reporting
- Report builder interface
- Scheduled distribution
- Export capabilities
- Dashboard widgets
- Drill-down functionality

### 2.8 Sliding Scale & Financial Assistance

#### Sliding Scale Management

**Fee Schedule Setup:**
- Income-based tiers
- Family size consideration
- Documentation requirements
- Approval workflows
- Expiration/renewal dates
- Audit tracking

**Application Processing:**
- Income verification
- Calculation automation
- Approval notifications
- Denial documentation
- Appeal process
- Annual recertification

---

## 3. Integration Requirements

### 3.1 AdvancedMD Integration

#### Bidirectional Data Flow

**Outbound to AdvancedMD:**
- Patient demographics
- Insurance information
- Appointments
- Charges
- Claims
- Payment adjustments

**Inbound from AdvancedMD:**
- Eligibility responses
- Claim status updates
- ERA/payment data
- Denial information
- Prior authorizations
- Payer updates

#### Synchronization Rules
- Real-time for critical data
- Batch for high-volume transactions
- Conflict resolution protocols
- Error handling and retries
- Audit logging
- Rollback capabilities

### 3.2 Clinical System Integration

**Documentation Integration:**
- Automatic charge triggers
- Diagnosis code pulling
- Medical necessity verification
- Session note requirements
- Addendum handling

**Scheduling Integration:**
- Appointment-based charges
- Cancellation fee generation
- No-show billing
- Authorization checking
- Copay reminders

### 3.3 Accounting System Integration

**QuickBooks Integration:**
- Daily deposit summaries
- Patient account sync
- Tax reporting data
- Financial statements
- Accounts receivable

**Banking Integration:**
- Payment verification
- Deposit reconciliation
- Merchant services
- ACH processing

---

## 4. User Interface Requirements

### 4.1 Billing Dashboard

**Key Metrics Display:**
- Today's charges
- Pending claims
- Outstanding A/R
- Recent payments
- Denial queue
- Action items

**Quick Actions:**
- Create charge
- Post payment
- Submit claims
- View denials
- Run eligibility
- Generate statements

### 4.2 Charge Management Interface

**Charge Grid:**
- Service date
- Client name
- Provider
- CPT code
- Amount
- Status
- Actions

**Charge Details:**
- Full service information
- Documentation links
- Authorization status
- Submission history
- Payment history
- Adjustment history

### 4.3 Claims Management Interface

**Claims Queue:**
- Ready to submit
- Pending response
- Paid
- Denied
- Need information
- Appeals

**Claims Workspace:**
- Batch operations
- Individual editing
- Validation results
- Submission tracking
- Status updates
- Error resolution

### 4.4 Payment Processing Interface

**Payment Entry Screen:**
- Patient search
- Payment method
- Amount entry
- Service selection
- Auto-distribution
- Receipt generation

**ERA Processing:**
- File upload
- Automatic matching
- Exception handling
- Posting confirmation
- Reconciliation reports

---

## 5. Data Model

### 5.1 Core Tables

#### Charges Table
```
- charge_id (UUID, PK)
- client_id (FK)
- appointment_id (FK)
- provider_id (FK)
- supervisor_id (FK, nullable)
- service_date
- cpt_code
- modifiers (array)
- units
- charge_amount
- diagnosis_codes (array)
- place_of_service
- authorization_id (FK)
- note_id (FK)
- status
- created_date
- created_by
- submitted_date
- batch_id
```

#### Claims Table
```
- claim_id (UUID, PK)
- claim_number
- client_id (FK)
- insurance_id (FK)
- charges (array of charge_ids)
- total_charge_amount
- expected_reimbursement
- status
- submission_date
- payer_claim_number
- filing_indicator
- accept_assignment
- release_of_info
- patient_signature_source
```

#### Payments Table
```
- payment_id (UUID, PK)
- payment_type (insurance/patient/other)
- payment_method
- reference_number
- amount
- payment_date
- deposit_date
- payer_id
- era_id
- applied_amount
- unapplied_amount
- posting_date
- posted_by
```

#### Payment_Applications Table
```
- application_id (UUID, PK)
- payment_id (FK)
- charge_id (FK)
- amount_applied
- adjustment_amount
- adjustment_codes (array)
- patient_responsibility
- transfer_to_secondary
- write_off_amount
- application_date
```

#### Prior_Authorizations Table
```
- authorization_id (UUID, PK)
- client_id (FK)
- insurance_id (FK)
- auth_number
- start_date
- end_date
- total_units_approved
- units_used
- units_remaining
- cpt_codes_approved (array)
- diagnosis_codes (array)
- requesting_provider_id
- status
- obtained_date
```

#### Denials Table
```
- denial_id (UUID, PK)
- claim_id (FK)
- charge_id (FK)
- denial_date
- denial_code
- denial_reason
- category
- action_required
- appeal_deadline
- appeal_status
- resolution_date
- resolution_action
- assigned_to
```

#### Fee_Schedules Table
```
- schedule_id (UUID, PK)
- payer_id
- cpt_code
- standard_fee
- contracted_rate
- effective_date
- termination_date
- modifier_adjustments (JSON)
```

#### Financial_Assistance Table
```
- assistance_id (UUID, PK)
- client_id (FK)
- application_date
- income_verified
- household_size
- discount_percentage
- approved_by
- effective_date
- expiration_date
- documentation_ids (array)
```

#### Billing_Analytics Table
```
- analytics_id (UUID, PK)
- date
- provider_id (FK)
- charges_created
- claims_submitted
- payments_received
- denials_received
- collection_rate
- denial_rate
- days_in_ar
- outstanding_ar
```

---

## 6. VERIFICATION CHECKLIST

### 6.1 Charge Management
**Required Functionality:**
- [ ] Automatic charge creation from signed notes
- [ ] CPT code determination based on service type and duration
- [ ] Modifier application (telehealth, multiple procedures)
- [ ] Unit calculation for timed codes
- [ ] Incident-to billing supervisor assignment
- [ ] Manual charge creation interface
- [ ] Duplicate charge prevention
- [ ] Charge void/correction capability
- [ ] Batch charge creation for groups
- [ ] Authorization verification before charge creation

**Data Requirements:**
- [ ] Charges table with all specified fields
- [ ] Link to appointments, notes, and providers
- [ ] Audit trail for all charge modifications
- [ ] Historical charge data retention (7 years)

**UI Components:**
- [ ] Charge creation modal
- [ ] Charge grid with filtering and sorting
- [ ] Charge detail view with full history
- [ ] Bulk charge operations interface

### 6.2 Insurance Verification
**Required Functionality:**
- [ ] Real-time eligibility checking via AdvancedMD
- [ ] Coverage detail display (copay, deductible, coinsurance)
- [ ] Mental health benefit verification
- [ ] Authorization requirement checking
- [ ] Automatic verification on appointment scheduling
- [ ] Manual verification override
- [ ] Verification history tracking
- [ ] Expired coverage alerts
- [ ] Secondary/tertiary insurance support

**Data Requirements:**
- [ ] Insurance verification log table
- [ ] Response data storage from AdvancedMD
- [ ] Last verification timestamp
- [ ] Coverage effective dates tracking

**UI Components:**
- [ ] Verification button on client profile
- [ ] Coverage detail modal
- [ ] Verification status indicators
- [ ] Benefits summary display
- [ ] Authorization status badges

### 6.3 Claims Processing
**Required Functionality:**
- [ ] 837P electronic claim generation
- [ ] Claim validation before submission
- [ ] Batch claim submission to AdvancedMD
- [ ] Individual claim submission option
- [ ] Secondary claim auto-generation
- [ ] Corrected claim creation
- [ ] Claim status tracking
- [ ] Resubmission capability
- [ ] Paper claim generation (when required)
- [ ] Claim attachment support

**Data Requirements:**
- [ ] Claims table with all required fields
- [ ] Claim history tracking
- [ ] Submission batch records
- [ ] Payer response storage

**UI Components:**
- [ ] Claims queue interface
- [ ] Claim creation/edit form
- [ ] Batch submission interface
- [ ] Claim status dashboard
- [ ] Error resolution workspace

### 6.4 Payment Processing
**Required Functionality:**
- [ ] ERA (835) file processing
- [ ] Automatic payment posting
- [ ] Manual payment entry
- [ ] Payment application to charges
- [ ] Adjustment posting with reason codes
- [ ] Secondary billing triggers
- [ ] Credit balance management
- [ ] Refund processing
- [ ] Payment plan management
- [ ] Credit card processing (PCI compliant)

**Data Requirements:**
- [ ] Payments table
- [ ] Payment applications table
- [ ] Payment method secure storage
- [ ] ERA file storage
- [ ] Deposit reconciliation records

**UI Components:**
- [ ] Payment entry screen
- [ ] ERA upload interface
- [ ] Payment posting queue
- [ ] Payment search and filters
- [ ] Receipt generation
- [ ] Deposit summary report

### 6.5 Denial Management
**Required Functionality:**
- [ ] Automatic denial categorization
- [ ] Denial work queue assignment
- [ ] Appeal deadline tracking
- [ ] Appeal letter generation
- [ ] Resubmission tracking
- [ ] Denial trend analysis
- [ ] Root cause identification
- [ ] Preventive action suggestions
- [ ] Denial rate by payer/provider/code

**Data Requirements:**
- [ ] Denials table with reason codes
- [ ] Appeal tracking
- [ ] Resolution documentation
- [ ] Denial analytics data

**UI Components:**
- [ ] Denial queue dashboard
- [ ] Denial detail workspace
- [ ] Appeal generation interface
- [ ] Denial analytics dashboard
- [ ] Action assignment interface

### 6.6 Prior Authorization
**Required Functionality:**
- [ ] Authorization request creation
- [ ] Required document attachment
- [ ] Authorization tracking
- [ ] Units/sessions countdown
- [ ] Expiration warnings (30, 15, 7 days)
- [ ] Authorization verification before billing
- [ ] Extension request management
- [ ] Retroactive authorization support
- [ ] Authorization history
- [ ] Multi-CPT code authorizations

**Data Requirements:**
- [ ] Prior authorizations table
- [ ] Authorization usage tracking
- [ ] Document attachment storage
- [ ] Historical authorization data

**UI Components:**
- [ ] Authorization request form
- [ ] Authorization list/grid
- [ ] Remaining units display
- [ ] Warning notifications
- [ ] Extension request interface

### 6.7 AI Billing Analytics
**Required Functionality:**
- [ ] Real-time KPI dashboard
- [ ] Revenue optimization recommendations
- [ ] Denial prediction algorithms
- [ ] Payment likelihood scoring
- [ ] Undercoding detection
- [ ] Missing charge identification
- [ ] Collection forecasting
- [ ] Payer performance analysis
- [ ] Provider productivity metrics
- [ ] Actionable insights generation

**Data Requirements:**
- [ ] Analytics aggregation tables
- [ ] Historical trend storage
- [ ] Prediction model outputs
- [ ] Recommendation log

**UI Components:**
- [ ] Executive dashboard
- [ ] KPI widgets
- [ ] Trend graphs
- [ ] Recommendation cards
- [ ] Drill-down reports
- [ ] Alert notifications

### 6.8 Financial Reporting
**Required Functionality:**
- [ ] Daily transaction reports
- [ ] Monthly financial summaries
- [ ] A/R aging reports
- [ ] Collection analysis
- [ ] Provider productivity reports
- [ ] Payer mix analysis
- [ ] Service line profitability
- [ ] Custom report builder
- [ ] Scheduled report delivery
- [ ] Export to Excel/PDF

**Data Requirements:**
- [ ] Report templates storage
- [ ] Scheduled report queue
- [ ] Report generation logs
- [ ] Custom report definitions

**UI Components:**
- [ ] Report library
- [ ] Report builder interface
- [ ] Report viewer
- [ ] Export options
- [ ] Schedule manager
- [ ] Distribution lists

### 6.9 Client Billing Portal
**Required Functionality:**
- [ ] Statement viewing
- [ ] Online payment
- [ ] Payment plan setup
- [ ] Payment history
- [ ] Insurance information update
- [ ] Receipt download
- [ ] Balance notifications
- [ ] Auto-pay enrollment
- [ ] HSA/FSA integration

**Data Requirements:**
- [ ] Portal access logs
- [ ] Payment method tokens
- [ ] Auto-pay schedules
- [ ] Communication preferences

**UI Components:**
- [ ] Client billing dashboard
- [ ] Payment interface
- [ ] Statement viewer
- [ ] Payment plan calculator
- [ ] Transaction history

### 6.10 Compliance & Audit
**Required Functionality:**
- [ ] Billing audit trail
- [ ] Compliance reporting
- [ ] Fraud detection alerts
- [ ] Unusual billing patterns
- [ ] Documentation completeness
- [ ] Timely filing monitoring
- [ ] Contract compliance checking
- [ ] Incident-to billing validation

**Data Requirements:**
- [ ] Complete audit log
- [ ] Compliance check results
- [ ] Exception reports
- [ ] Investigation records

**UI Components:**
- [ ] Audit report interface
- [ ] Compliance dashboard
- [ ] Exception queue
- [ ] Investigation workspace

---

## 7. Performance Requirements

### 7.1 Transaction Processing
- Charge creation: < 1 second
- Claim generation: < 2 seconds per claim
- Payment posting: < 1 second per line
- Eligibility check: < 5 seconds
- Batch processing: 1000 claims in < 5 minutes

### 7.2 Reporting Performance
- Dashboard load: < 2 seconds
- Standard reports: < 5 seconds
- Custom reports: < 30 seconds
- Data export: < 1 minute for 10,000 records

### 7.3 Integration Performance
- AdvancedMD sync: Near real-time (< 30 seconds)
- ERA processing: 1000 payments in < 10 minutes
- Eligibility batch: 100 checks in < 2 minutes

---

## 8. Security & Compliance

### 8.1 PCI Compliance
- Credit card tokenization
- Secure transmission
- No storage of CVV
- Regular security scans
- Access controls

### 8.2 HIPAA Compliance
- Minimum necessary access
- Audit trails
- Encryption
- Business associate agreements
- Security training

### 8.3 Financial Compliance
- Fraud detection
- Unusual pattern alerts
- Double billing prevention
- Audit support
- Documentation retention

---

## 9. Success Metrics

### Financial Metrics
- Days in A/R < 30
- Collection rate > 95%
- Denial rate < 5%
- First-pass resolution > 90%
- Clean claim rate > 95%

### Operational Metrics
- Charge lag < 24 hours
- Claims submission < 48 hours
- Payment posting < 24 hours
- Denial work time < 7 days

### User Satisfaction
- Billing staff efficiency > 30% improvement
- Error rate < 1%
- Client payment satisfaction > 90%
- Provider satisfaction with billing > 85%

---

## Risk Mitigation

### Financial Risks
- **Revenue loss**: Automated charge capture and missing charge detection
- **Claim denials**: AI-powered validation and prediction
- **Payment delays**: Automated follow-up and escalation
- **Bad debt**: Early intervention and payment plans
- **Compliance violations**: Continuous monitoring and alerts

### Operational Risks
- **System downtime**: Offline billing capability and queue management
- **Integration failures**: Retry mechanisms and manual overrides
- **Data loss**: Continuous backup and transaction logging
- **User errors**: Validation and confirmation workflows

### Compliance Risks
- **Billing fraud**: Pattern detection and audit trails
- **Documentation issues**: Requirement checking and blocks
- **Timely filing**: Automatic tracking and warnings
- **Contract violations**: Payer-specific rule engines

---

## Notes for Development

This module directly impacts practice revenue and must be extremely reliable. Key implementation priorities:

1. **AdvancedMD integration** must be rock-solid with proper error handling
2. **Charge capture** must never miss billable services
3. **Payment processing** must be accurate and auditable
4. **AI analytics** should provide actionable insights, not just data
5. **Compliance checks** must prevent violations before they occur

The billing system must balance automation with control, allowing overrides when necessary but preventing errors that could impact revenue or compliance.

---

**Document Version**: 2.0
**Last Updated**: Current Date
**Status**: Ready for Review
**Next Module**: Telehealth & Virtual Care

