# Practice Settings Module - Implementation Plan

## Overview
Comprehensive Practice Settings module that gives administrators complete control over every module in the MentalSpace EHR system.

## Database Schema ✅ COMPLETE

Added `PracticeSettings` model to `packages/database/prisma/schema.prisma` with the following categories:

### 1. General Practice Information
- Practice name, email, phone, website, logo
- Timezone configuration
- Business hours and days

### 2. Clinical Documentation Settings
- Note due date configuration (default: 3 days)
- Co-sign requirements for associates
- Sunday lockout automation toggle
- Note reminder schedules
- Late completion policies

### 3. Scheduling Settings
- Default appointment duration
- Online booking toggle
- Waitlist management
- Recurring appointments
- Cancellation policies and fees
- Buffer times between appointments

### 4. Billing Settings
- Currency and tax configuration
- Insurance vs self-pay options
- Payment methods accepted
- Late fees and collection policies
- Invoice numbering system

### 5. Compliance Settings
- HIPAA compliance features
- Two-factor authentication requirements
- Password expiration policies
- Session timeout duration
- Audit logging
- Data retention policies
- Auto-backup configuration

### 6. Telehealth Settings
- Enable/disable telehealth
- Platform selection
- Consent requirements
- Session recording policies

### 7. Supervision Settings
- Supervision requirements
- Required hours configuration
- Session frequency
- Group/triadic supervision options

### 8. AI Integration Settings ⭐ NEW
- Enable/disable AI features
- AI provider selection (OpenAI, Anthropic, Custom)
- AI model configuration
- API key storage (encrypted)
- Feature toggles:
  - AI note generation
  - AI treatment suggestions
  - AI scheduling assistance
  - AI diagnosis assistance
- Confidence threshold settings
- Human review requirements
- AI usage logging

### 9. Email Notification Settings
- SMTP configuration
- Email templates
- Notification toggles (appointments, billing, system)

### 10. Client Portal Settings
- Portal feature toggles
- Email verification requirements
- Available portal features

### 11. Reporting Settings
- Report generation toggles
- Auto-generation schedules
- Distribution email settings

### 12. Feature Flags
- Beta features toggle
- Experimental AI toggle
- Advanced analytics toggle

## Backend Implementation Tasks

### 1. Practice Settings Routes (`packages/backend/src/routes/practiceSettings.routes.ts`)
**Endpoints:**
- `GET /practice-settings` - Get current settings (Admin only)
- `PUT /practice-settings` - Update settings (Admin only)
- `POST /practice-settings/initialize` - Create initial settings (System)
- `GET /practice-settings/public` - Get public-facing settings (No auth)

**Features:**
- Role-based access control (ADMINISTRATOR only for updates)
- Input validation for all fields
- Encryption for sensitive fields (AI API keys, SMTP passwords)
- Audit logging for all changes
- Default settings initialization

### 2. Practice Settings Service (`packages/backend/src/services/practiceSettings.service.ts`)
**Functions:**
- `getPracticeSettings()` - Retrieve current settings
- `updatePracticeSettings(data)` - Update settings with validation
- `initializePracticeSettings()` - Create default settings
- `getPublicSettings()` - Get non-sensitive public settings
- `encryptSensitiveFields(settings)` - Encrypt API keys, passwords
- `decryptSensitiveFields(settings)` - Decrypt for admin view

### 3. Middleware for Settings (`packages/backend/src/middleware/practiceSettings.middleware.ts`)
- Load settings at application startup
- Cache settings in memory
- Invalidate cache on update
- Apply settings to compliance service (Sunday lockout config)

## Frontend Implementation Tasks

### 1. Enhanced Practice Settings Page (`packages/frontend/src/pages/Settings/PracticeSettings.tsx`)

**UI Structure:**
```
┌─────────────────────────────────────────────┐
│  Practice Settings                           │
│  ┌─────────────────────────────────────┐    │
│  │ Tab Navigation                       │    │
│  │ • General                            │    │
│  │ • Clinical Documentation             │    │
│  │ • Scheduling                         │    │
│  │ • Billing                            │    │
│  │ • Compliance                         │    │
│  │ • Telehealth                         │    │
│  │ • Supervision                        │    │
│  │ • AI Integration ⭐                  │    │
│  │ • Email Notifications                │    │
│  │ • Client Portal                      │    │
│  │ • Reporting                          │    │
│  │ • Advanced                           │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  [Tab Content Here]                          │
│                                              │
│  [Cancel] [Save Settings]                    │
└──────────────────────────────────────────────┘
```

### 2. Individual Tab Components

#### **General Settings Tab**
- Practice Information section
- Business Hours configuration
- Address information
- Logo upload (S3 integration)

#### **Clinical Documentation Settings Tab**
- Note due date slider (1-7 days)
- Co-sign requirements toggle
- Sunday lockout configuration:
  - Enable/disable toggle
  - Day of week selection
  - Time selection
- Note reminder schedule configuration
- Late completion policy toggles

#### **Scheduling Settings Tab**
- Default appointment duration selector
- Online booking toggle
- Waitlist management toggle
- Recurring appointments toggle
- Cancellation policies:
  - Notice period (hours)
  - Fees (cancellation, no-show)
- Buffer time slider
- Max advance booking days

#### **Billing Settings Tab**
- Currency selection dropdown
- Tax rate input
- Insurance vs self-pay toggles
- Payment methods checklist
- Late fee configuration
- Invoice settings:
  - Prefix input
  - Starting number input

#### **Compliance Settings Tab**
- HIPAA compliance toggle
- Two-factor authentication requirement
- Password policy:
  - Expiration days slider
- Session timeout slider
- Audit logging toggle
- Data retention slider (years)
- Backup configuration:
  - Auto-backup toggle
  - Frequency dropdown (Daily/Weekly/Monthly)

#### **Telehealth Settings Tab**
- Enable telehealth toggle
- Platform selection dropdown
- Consent requirement toggle
- Session recording policy:
  - Enable toggle
  - Disclosure text area

#### **Supervision Settings Tab**
- Enable supervision toggle
- Required hours input
- Session frequency dropdown
- Group supervision toggle
- Triadic supervision toggle

#### **AI Integration Settings Tab** ⭐ **NEW & IMPORTANT**
```
┌─────────────────────────────────────────────────────────┐
│ AI Integration Settings                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⚠️ AI Features Master Toggle                           │
│  ┌────────────────────────────────────────────┐         │
│  │ [ ] Enable AI Features                      │         │
│  │                                              │         │
│  │ When enabled, AI-powered features will be   │         │
│  │ available throughout the system             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  AI Provider Configuration                               │
│  ┌────────────────────────────────────────────┐         │
│  │ Provider: [OpenAI ▼]                        │         │
│  │ Model:    [gpt-4-turbo ▼]                   │         │
│  │ API Key:  [••••••••••••••] [Update]        │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  Feature Toggles                                         │
│  ┌────────────────────────────────────────────┐         │
│  │ [ ] AI Note Generation                      │         │
│  │     Generate clinical notes from session     │         │
│  │     transcripts or dictation                 │         │
│  │                                              │         │
│  │ [ ] AI Treatment Suggestions                │         │
│  │     Provide evidence-based treatment         │         │
│  │     recommendations                          │         │
│  │                                              │         │
│  │ [ ] AI Scheduling Assistant                 │         │
│  │     Optimize appointment scheduling          │         │
│  │                                              │         │
│  │ [ ] AI Diagnosis Assistance                 │         │
│  │     Suggest relevant ICD-10 codes based      │         │
│  │     on symptoms and presentation             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  AI Quality & Safety Settings                            │
│  ┌────────────────────────────────────────────┐         │
│  │ Confidence Threshold: [80%] ═════════       │         │
│  │                                              │         │
│  │ [✓] Require Human Review                    │         │
│  │     All AI-generated content must be         │         │
│  │     reviewed by a clinician before use       │         │
│  │                                              │         │
│  │ [✓] Enable AI Usage Logging                 │         │
│  │     Track all AI interactions for audit      │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ⚠️ Important: AI-generated content should always be    │
│  reviewed by qualified professionals. AI is a tool to    │
│  assist, not replace, clinical judgment.                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### **Email Notifications Tab**
- SMTP configuration form
- From name/address inputs
- Notification toggles:
  - Appointment reminders
  - Billing reminders
  - System notifications
- Test email button

#### **Client Portal Settings Tab**
- Portal feature toggles (grid layout):
  - Email verification
  - Appointment booking
  - Billing access
  - Secure messaging
  - Document sharing
  - Mood tracking
  - Assessments

#### **Reporting Settings Tab**
- Report type toggles
- Auto-generation schedule
- Distribution email input

#### **Advanced Tab**
- Beta features toggle
- Experimental AI toggle
- Advanced analytics toggle
- System reset options

### 3. Component Architecture

```
PracticeSettingsPage (Main container)
├── TabNavigation (Tab switcher)
├── GeneralSettingsTab
├── ClinicalDocSettingsTab
├── SchedulingSettingsTab
├── BillingSettingsTab
├── ComplianceSettingsTab
├── TelehealthSettingsTab
├── SupervisionSettingsTab
├── AIIntegrationTab ⭐
├── EmailSettingsTab
├── PortalSettingsTab
├── ReportingSettingsTab
└── AdvancedSettingsTab
```

## Integration Points

### 1. Sunday Lockout Integration
- Practice Settings controls compliance service configuration
- When settings are updated, compliance service reloads cron jobs
- Admin can toggle lockout on/off, change day/time

### 2. AI Integration ⭐
- Settings control which AI features are available
- API keys securely stored (encrypted at rest)
- Confidence thresholds applied to all AI operations
- Usage logging for compliance and audit

### 3. Email Service Integration
- SMTP settings from Practice Settings
- Fallback to environment variables if not configured
- Test email functionality

### 4. Client Portal Integration
- Portal features dynamically enabled/disabled
- Portal respects practice-wide toggles

## Security Considerations

### 1. Sensitive Data Encryption
- AI API keys encrypted using AES-256
- SMTP passwords encrypted
- Encryption keys stored in environment variables
- Decrypt only for authorized administrators

### 2. Access Control
- Only ADMINISTRATOR role can view/edit settings
- Audit log all setting changes
- Track who made changes and when

### 3. Validation
- Input validation on all fields
- Business logic validation (e.g., lockout day must be valid)
- API rate limiting on settings endpoints

## Testing Checklist

### Backend Tests
- [ ] Get settings (admin access)
- [ ] Get settings (non-admin - should fail)
- [ ] Update settings (admin access)
- [ ] Update settings (non-admin - should fail)
- [ ] Encryption/decryption of sensitive fields
- [ ] Validation of invalid inputs
- [ ] Audit logging of changes
- [ ] Public settings endpoint (no sensitive data)

### Frontend Tests
- [ ] All tabs render correctly
- [ ] Form fields save properly
- [ ] Toggles work as expected
- [ ] Validation messages display
- [ ] Success/error notifications show
- [ ] API key masking works
- [ ] Tab navigation preserves unsaved changes warning

### Integration Tests
- [ ] Settings changes affect compliance service
- [ ] AI features respect toggle states
- [ ] Email settings update email service
- [ ] Portal settings affect portal features

## Implementation Timeline

### Phase 1 (Day 1) - Backend Foundation
- [ ] Create PracticeSettings database model ✅ COMPLETE
- [ ] Create practice settings routes
- [ ] Create practice settings service
- [ ] Add encryption utilities
- [ ] Test all endpoints

### Phase 2 (Day 2) - Frontend Structure
- [ ] Create main PracticeSettings page with tabs
- [ ] Implement tab navigation
- [ ] Create reusable form components (toggle, slider, input)

### Phase 3 (Day 3-4) - Tab Implementation
- [ ] Implement all 12 tabs
- [ ] Connect to backend API
- [ ] Add validation
- [ ] Add success/error handling

### Phase 4 (Day 5) - AI Integration Tab ⭐
- [ ] Build comprehensive AI settings UI
- [ ] Implement API key management
- [ ] Add provider/model selection
- [ ] Test AI feature toggles

### Phase 5 (Day 6) - Integration & Testing
- [ ] Integrate with compliance service
- [ ] Integrate with email service
- [ ] End-to-end testing
- [ ] Fix bugs

## File Structure

```
packages/backend/src/
├── routes/
│   └── practiceSettings.routes.ts (NEW)
├── services/
│   └── practiceSettings.service.ts (NEW)
├── middleware/
│   └── practiceSettings.middleware.ts (NEW)
└── utils/
    └── encryption.ts (NEW)

packages/frontend/src/
├── pages/
│   └── Settings/
│       ├── PracticeSettings.tsx (REPLACE EXISTING)
│       ├── GeneralSettingsTab.tsx (NEW)
│       ├── ClinicalDocSettingsTab.tsx (NEW)
│       ├── SchedulingSettingsTab.tsx (NEW)
│       ├── BillingSettingsTab.tsx (NEW)
│       ├── ComplianceSettingsTab.tsx (NEW)
│       ├── TelehealthSettingsTab.tsx (NEW)
│       ├── SupervisionSettingsTab.tsx (NEW)
│       ├── AIIntegrationTab.tsx (NEW) ⭐
│       ├── EmailSettingsTab.tsx (NEW)
│       ├── PortalSettingsTab.tsx (NEW)
│       ├── ReportingSettingsTab.tsx (NEW)
│       └── AdvancedSettingsTab.tsx (NEW)
└── components/
    └── Settings/
        ├── ToggleSetting.tsx (NEW)
        ├── SliderSetting.tsx (NEW)
        ├── InputSetting.tsx (NEW)
        └── SelectSetting.tsx (NEW)
```

## Next Steps

1. Generate Prisma client with new model
2. Create backend routes and service
3. Build frontend tab structure
4. Implement each tab component
5. Test and integrate

---

**Status**: Database schema complete, ready for backend implementation
**Priority**: HIGH - Required for AI integration module
**Complexity**: MEDIUM-HIGH
**Estimated Time**: 5-6 days for full implementation
