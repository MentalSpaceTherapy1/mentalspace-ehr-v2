# Account Management Guide for Administrators

**For**: MentalSpace EHR Administrators
**Version**: 2.0
**Last Updated**: November 2, 2025
**Audience**: Practice Administrators, IT Administrators, System Administrators

---

## Table of Contents

1. [Administrator Responsibilities](#administrator-responsibilities)
2. [Unlocking Locked Accounts](#unlocking-locked-accounts)
3. [Forcing Password Changes](#forcing-password-changes)
4. [Managing User Sessions](#managing-user-sessions)
5. [MFA Support](#mfa-support)
6. [Viewing Audit Logs](#viewing-audit-logs)
7. [Security Best Practices](#security-best-practices)
8. [Incident Response](#incident-response)
9. [Compliance Reporting](#compliance-reporting)

---

## Administrator Responsibilities

### Your Role in Account Security

As a MentalSpace administrator, you are responsible for:

**User Management**:
- Creating and deactivating user accounts
- Assigning appropriate roles and permissions
- Unlocking locked accounts
- Resetting forgotten passwords
- Forcing password changes when needed

**Security Oversight**:
- Monitoring audit logs for suspicious activity
- Responding to security incidents
- Enforcing security policies
- Providing user support for authentication issues
- Ensuring HIPAA compliance

**Compliance**:
- Maintaining audit trails
- Generating compliance reports
- Documenting security incidents
- Conducting security reviews

### Administrator Best Practices

**Do's**:
- Enable MFA on your own administrator account
- Use a strong, unique password
- Review audit logs weekly
- Respond to lockout requests promptly
- Document all administrative actions
- Keep user contact information updated

**Don'ts**:
- Don't share your administrator credentials
- Don't unlock accounts without verifying user identity
- Don't reset passwords over unsecured channels (phone, text)
- Don't access user accounts without valid reason
- Don't disable security features (lockout, MFA) system-wide

---

## Unlocking Locked Accounts

### When Accounts Get Locked

User accounts are automatically locked after **5 failed login attempts** for **30 minutes**.

**Common Reasons for Lockout**:
- User forgot password
- Caps Lock was on
- Password was recently changed and user is using old password
- Someone attempting unauthorized access
- Browser autofill using wrong password

### How to Identify Locked Accounts

**Method 1: User Notification**
User will contact you saying:
> "I can't log in. It says my account is locked."

**Method 2: Dashboard Alert**
Check Admin Dashboard for lockout alerts:
1. Log into MentalSpace as Administrator
2. Click "Admin" in main navigation
3. Click "Security Alerts"
4. Filter by "Account Lockouts"

**Method 3: Audit Log**
Search audit logs for `ACCOUNT_LOCKED` events.

### Unlock Procedure

#### Via Admin Dashboard (Recommended)

1. **Navigate to User Management**
   - Admin > Users > Search for user

2. **Verify User Identity FIRST**
   - Call or email the user to confirm they are requesting unlock
   - Verify at least 2 pieces of information:
     - Full name
     - Employee ID or date of hire
     - Last 4 digits of phone number
   - Never unlock based solely on email request

3. **Review Recent Activity**
   - Click on user's name
   - Click "Audit Log" tab
   - Look for:
     - Failed login IP addresses
     - Time of failed attempts
     - Any suspicious activity

4. **Unlock the Account**
   - Click "Security" tab
   - Find "Account Status" section
   - You'll see: "Account Locked Until: [timestamp]"
   - Click "Unlock Account" button
   - Confirm: "Yes, unlock account"

5. **Document the Action**
   - Add note in "Admin Notes" field:
     ```
     Account unlocked by [Your Name] on [Date] at [Time].
     Reason: User forgot password.
     Verification: Confirmed via phone call to extension 1234.
     ```

6. **Notify the User**
   - Call or email user: "Your account has been unlocked. You may now log in."
   - If password was forgotten, provide instructions for "Forgot Password" feature

#### Via API (Advanced)

For programmatic unlocking:

```bash
POST /api/v1/users/:userId/unlock
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "User request verified via phone",
  "verifiedBy": "admin-user-id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account unlocked successfully",
  "data": {
    "userId": "uuid-here",
    "unlockedBy": "admin-uuid",
    "unlockedAt": "2025-11-02T10:30:00.000Z"
  }
}
```

### Security Considerations

**Verify User Identity**:
- Never unlock based on email alone (could be compromised account)
- Call user at known phone number (not number provided in email)
- Ask security questions (date of birth, employee ID)

**Investigate Suspicious Lockouts**:
- If IP address is unfamiliar, ask user if they tried to log in
- Multiple lockouts in short time may indicate attack
- Check if other users are experiencing lockouts (system issue vs. targeted attack)

**When NOT to Unlock**:
- User cannot verify identity
- Lockout appears to be unauthorized access attempt
- User has been terminated but account not yet deactivated
- During active security investigation

**Escalation**:
If you suspect security incident:
1. Do NOT unlock account
2. Email security@mentalspace.com
3. Document incident
4. Wait for security team guidance

---

## Forcing Password Changes

### When to Force Password Change

**Common Scenarios**:
- User's password may have been compromised
- User hasn't changed password in 90+ days (expired)
- User is using weak password (if you become aware)
- Security policy update requires new passwords
- User is leaving organization (force change, then deactivate)
- Suspicious activity detected on account

### How to Force Password Change

#### Via Admin Dashboard

1. **Navigate to User**
   - Admin > Users > Search for user

2. **Force Password Change**
   - Click on user's name
   - Click "Security" tab
   - Find "Password Management" section
   - Click "Force Password Change" button

3. **Provide Reason**
   - Enter reason (required for audit trail):
     ```
     Reason: Security policy update requires all staff to update passwords.
     Requested by: [Your Name]
     Date: 2025-11-02
     ```

4. **Confirm**
   - Click "Yes, require password change"

5. **Notify User**
   - User will be prompted to change password on next login
   - Send email notification:
     ```
     Subject: Password Change Required

     Hello [User Name],

     Your MentalSpace account requires a password change.

     When you next log in, you will be prompted to create a new password.

     Your new password must:
     - Be at least 12 characters long
     - Include uppercase and lowercase letters
     - Include at least one number
     - Include at least one special character
     - Not match any of your last 10 passwords

     If you have questions, please contact IT support.

     Best regards,
     [Your Name]
     IT Administrator
     ```

#### Via API

```bash
POST /api/v1/users/:userId/force-password-change
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Security policy update"
}
```

### What Happens After Forcing Password Change

**User Experience**:
1. User attempts to log in with current password
2. Password is validated successfully
3. User sees: "Password change required"
4. User is redirected to password change screen
5. User must enter:
   - Current password
   - New password (meeting requirements)
   - Confirm new password
6. After successful change, user is logged in

**Audit Trail**:
- Event logged: `PASSWORD_CHANGE_FORCED`
- Includes: Administrator ID, reason, timestamp
- When user changes password: `PASSWORD_CHANGED` event logged

---

## Managing User Sessions

### Viewing Active Sessions

#### View All Active Sessions (System-Wide)

1. **Navigate to Session Management**
   - Admin > Security > Active Sessions

2. **Session List**
   - Shows all currently active sessions
   - Columns:
     - User Name
     - Email
     - IP Address
     - Device (User Agent)
     - Login Time
     - Last Activity
     - Actions

3. **Filter and Sort**
   - Filter by:
     - User
     - IP Address
     - Date Range
     - Active vs. Expired
   - Sort by:
     - Login Time (newest/oldest)
     - Last Activity (most/least recent)
     - User Name (A-Z)

#### View Sessions for Specific User

1. **Navigate to User**
   - Admin > Users > Search for user

2. **Click on User Name**
   - Click "Sessions" tab

3. **View Session Details**
   - Current session (marked with "Current")
   - Other active sessions
   - Recent expired sessions (last 7 days)

### Terminating Sessions

#### Terminate Single Session

**Use Case**: User reports suspicious login from unknown device

**Steps**:
1. Navigate to user's Sessions tab
2. Identify the suspicious session
3. Click "Terminate" button next to that session
4. Confirm: "Yes, terminate this session"
5. Add note: "Terminated due to user report of unauthorized access"

#### Terminate All User Sessions

**Use Case**: User's account may be compromised

**Steps**:
1. Navigate to user's Sessions tab
2. Click "Terminate All Sessions" button
3. Confirm: "Yes, terminate all [User Name]'s sessions"
4. Add reason:
   ```
   All sessions terminated due to suspected account compromise.
   User will need to log in again.
   Date: 2025-11-02
   Admin: [Your Name]
   ```

5. **Notify User Immediately**:
   - Call user: "Your account sessions have been terminated for security reasons. Please log in again and change your password."

#### Force Logout All Users (Emergency)

**Use Case**: Security breach requires logging out all users

**Steps**:
1. Admin > Security > Emergency Actions
2. Click "Force Logout All Users"
3. Enter administrator password
4. Enter reason: "Security incident - forced logout of all users"
5. Confirm: "Yes, logout all users"

**Impact**:
- All users are immediately logged out
- Users must log in again
- Use only in emergencies (password breach, security patch, etc.)
- Creates audit log entry

### Session Monitoring

**Regular Monitoring**:
- Check active sessions weekly
- Look for:
  - Unusually high number of sessions for one user
  - Logins from unexpected locations (IP addresses)
  - Multiple concurrent sessions from different countries
  - Sessions from IP addresses that don't match practice locations

**Red Flags**:
- User has 3+ simultaneous sessions (limit is 2)
- Sessions from multiple countries simultaneously
- Login at unusual hours (2 AM when user works 9-5)
- Rapid session creation (many logins in short time)

---

## MFA Support

### Common MFA Issues

As administrator, you'll handle these MFA issues:

#### 1. User Lost Phone with Authenticator App

**User Request**: "I lost my phone and can't log in with MFA."

**Solution A - User Has Backup Codes**:
1. Instruct user to use a backup code:
   - "On the MFA verification screen, click 'Use a backup code instead'"
   - "Enter one of your 5 backup codes"
2. After user logs in, they should:
   - Go to Settings > Security > MFA
   - Disable MFA (using another backup code if prompted)
   - Set up MFA on new phone

**Solution B - User Has NO Backup Codes**:
1. **Verify User Identity** (phone call + 2 security questions)
2. **Temporarily Disable MFA**:
   - Admin > Users > [User Name]
   - Security tab > MFA section
   - Click "Disable MFA" button
   - Enter reason: "User lost phone, no backup codes available. Identity verified via phone call."
   - Confirm: "Yes, disable MFA"

3. **Notify User**:
   - "Your MFA has been temporarily disabled. You can now log in with just your password."
   - "After logging in, please re-enable MFA immediately in Settings > Security."

4. **Follow-Up**:
   - Check next day to ensure user re-enabled MFA
   - If not re-enabled, send reminder email

#### 2. User's MFA Codes Not Working

**Common Causes**:
- Phone time is not synchronized
- User is using wrong authenticator app
- Secret key was lost during phone transfer

**Troubleshooting Steps**:
1. **Check Phone Time**:
   - Instruct user: "Go to phone Settings > ensure 'Automatic Time' is ON"
   - User should restart phone after changing

2. **Verify Correct App**:
   - Ask user: "Which authenticator app are you using?"
   - Confirm it's Google Authenticator, Microsoft Authenticator, or Authy
   - User might have multiple apps, using wrong one

3. **Use Backup Code**:
   - If still not working, user should use backup code
   - Then disable and re-enable MFA with new QR code

4. **Last Resort - Admin Disable**:
   - Verify user identity
   - Disable MFA
   - User re-enables MFA after logging in

#### 3. User Wants to Disable MFA

**Policy**: MFA is optional, so users can disable it.

**Conversation**:
1. **Understand Why**:
   - "Can I ask why you want to disable MFA?"
   - Common reasons: inconvenience, lost phone, switching phones frequently

2. **Explain Security Implications**:
   - "Without MFA, your account is protected only by your password."
   - "If your password is compromised, anyone can access patient records."
   - "Consider using backup codes for situations where you don't have your phone."

3. **Offer Alternatives**:
   - Authy (desktop version, cloud backup)
   - Microsoft Authenticator (cloud backup)
   - Printed backup codes

4. **If User Still Wants to Disable**:
   - User can disable MFA themselves in Settings > Security
   - No administrator action needed
   - Audit log will record MFA disable event

### MFA-Related Administrator Actions

**You CANNOT**:
- Bypass MFA during login (by design for security)
- View user's MFA secret or backup codes (encrypted)
- Force MFA enable for users (it's optional)

**You CAN**:
- Temporarily disable MFA (user must re-enable)
- View MFA status (enabled/disabled, enabled date)
- View MFA-related audit events
- Educate users on MFA benefits

### MFA Reporting

Generate reports on MFA adoption:

1. Admin > Reports > Security Reports
2. Select "MFA Adoption Report"
3. View:
   - Total users: 50
   - MFA enabled: 35 (70%)
   - MFA disabled: 15 (30%)
   - By role:
     - Administrators: 10/10 (100%)
     - Clinicians: 20/25 (80%)
     - Billing Staff: 3/10 (30%)
     - Front Desk: 2/5 (40%)

Use this to encourage MFA adoption.

---

## Viewing Audit Logs

### Accessing Audit Logs

**System-Wide Logs**:
1. Admin > Security > Audit Logs
2. View all security events across the system

**User-Specific Logs**:
1. Admin > Users > [User Name]
2. Audit Log tab
3. View events for that specific user

### Types of Security Events

| Event Type | Description | What to Look For |
|------------|-------------|------------------|
| `LOGIN_SUCCESS` | Successful login | Unusual login times or IP addresses |
| `LOGIN_FAILED` | Failed login attempt | Multiple failures may indicate brute force |
| `ACCOUNT_LOCKED` | Account locked after 5 failures | Investigate if user didn't initiate |
| `ACCOUNT_UNLOCKED` | Admin unlocked account | Verify it was legitimate unlock |
| `PASSWORD_CHANGED` | User changed password | Unexpected changes could indicate compromise |
| `PASSWORD_EXPIRED` | Password expired | Normal for staff every 90 days |
| `PASSWORD_CHANGE_FORCED` | Admin forced password change | Should have corresponding admin note |
| `MFA_ENABLED` | User enabled MFA | Good security practice |
| `MFA_DISABLED` | User disabled MFA | Consider follow-up if unexpected |
| `MFA_VERIFICATION_FAILED` | Wrong MFA code entered | Multiple failures may indicate stolen password |
| `SESSION_CREATED` | New login session | Check IP and device info |
| `SESSION_EXPIRED` | Session timed out | Normal after 20 minutes inactivity |
| `SESSION_TERMINATED` | User logged out | Normal logout or admin termination |
| `CONCURRENT_SESSION_BLOCKED` | 3rd session blocked | User exceeded 2 session limit |

### Filtering and Searching Logs

**Filter By**:
- **Date Range**: Last 24 hours, 7 days, 30 days, custom
- **Event Type**: Select from dropdown
- **User**: Search by email or name
- **IP Address**: Find all events from specific IP
- **Status**: Success, Failed, Warning

**Search**:
- Free text search in event details
- Example: Search "192.168.1.100" to find all events from that IP

### Security Monitoring Best Practices

**Weekly Review**:
- Review failed login attempts (look for patterns)
- Check account lockouts (verify they were legitimate)
- Monitor after-hours access (logins between 11 PM - 6 AM)
- Review admin actions (ensure all are documented)

**Monthly Review**:
- Generate security report
- Review MFA adoption rates
- Check for dormant accounts (no login in 60+ days)
- Review list of users with admin privileges

**Quarterly Review**:
- Comprehensive security audit
- Review all admin actions from past quarter
- Check compliance with security policies
- Update documentation as needed

### Investigating Suspicious Activity

**Red Flags**:
1. **Multiple Failed Logins from Different IPs**
   - Indicates potential distributed attack
   - Action: Monitor, consider temporary IP blocking if continues

2. **Successful Login from Unusual Location**
   - User usually logs in from USA, suddenly from Russia
   - Action: Contact user immediately, verify it's them

3. **Password Changed + MFA Disabled**
   - Could indicate compromised account
   - Action: Terminate all sessions, contact user, investigate

4. **After-Hours Data Export**
   - Large data export at 2 AM by user who works 9-5
   - Action: Contact user, review what was exported

**Investigation Steps**:
1. **Document**: Take screenshots of suspicious events
2. **Timeline**: Create timeline of related events
3. **Context**: Check if user was actually working at that time
4. **Contact**: Call user to verify activity
5. **Containment**: If compromised, terminate sessions, force password change
6. **Report**: Document incident, report if required by policy

---

## Security Best Practices

### User Account Management

**New User Onboarding**:
1. Create account with temporary password
2. Send invitation email with setup instructions
3. User sets permanent password on first login
4. Encourage MFA setup (provide guide link)
5. Assign appropriate roles (principle of least privilege)
6. Set supervisor relationship if applicable

**User Account Review** (Monthly):
- Review list of all users
- Identify inactive accounts (no login in 60+ days)
- Verify roles are still appropriate
- Check for terminated employees who still have access
- Update contact information

**User Termination**:
1. **Immediate**: Deactivate account (within hours of termination)
2. **Document**: Note termination date and reason
3. **Sessions**: Terminate all active sessions
4. **Supervisor**: If they were a supervisor, reassign supervisees
5. **Data**: Export user's data if needed for continuity
6. **Retention**: Keep deactivated account for audit purposes (7 years)

### Password Policy Enforcement

**Communicate Policies**:
- Include in new hire orientation
- Email reminders about expiration
- Post security tips in staff area
- Provide password strength guidance

**Monitor Compliance**:
- Check for users with expired passwords
- Review users who frequently reuse passwords (hit history limit)
- Identify users hitting lockout threshold often (training opportunity)

**Training**:
- Annual security training for all staff
- Include: password management, phishing, MFA
- Document training completion

### System-Level Security

**Regular Tasks**:
- **Daily**: Review security alerts
- **Weekly**: Check audit logs for anomalies
- **Monthly**: Generate security reports
- **Quarterly**: Comprehensive security audit
- **Annually**: Security policy review and update

**System Hardening**:
- Ensure all staff accounts have strong passwords
- Encourage (but don't mandate) MFA for all users
- Monitor for brute force attempts
- Keep security documentation updated
- Test incident response procedures

---

## Incident Response

### Security Incident Types

**Type 1: Compromised Account**
- **Indicators**: Suspicious logins, unauthorized changes, user reports unusual activity
- **Severity**: High
- **Response Time**: Immediate

**Type 2: Brute Force Attack**
- **Indicators**: Multiple failed logins from same IP or distributed IPs
- **Severity**: Medium
- **Response Time**: Within 1 hour

**Type 3: Insider Threat**
- **Indicators**: Authorized user accessing records inappropriately
- **Severity**: High (HIPAA breach potential)
- **Response Time**: Immediate

**Type 4: System-Wide Issue**
- **Indicators**: Multiple users affected, system behaving unexpectedly
- **Severity**: Critical
- **Response Time**: Immediate escalation to vendor

### Incident Response Procedure

**Step 1: Identify**
- Detect incident through:
  - Audit log review
  - User report
  - Security alert
  - Unusual system behavior

**Step 2: Contain**
- Terminate affected sessions
- Disable compromised accounts
- Block malicious IP addresses (if applicable)
- Isolate affected systems (if necessary)

**Step 3: Investigate**
- Review audit logs
- Determine scope (who, what, when, where)
- Identify which data was accessed
- Document findings

**Step 4: Remediate**
- Force password changes
- Re-enable accounts with new credentials
- Patch vulnerabilities
- Implement additional controls

**Step 5: Report**
- Internal incident report
- HIPAA breach notification (if PHI accessed inappropriately)
- Law enforcement (if criminal activity suspected)
- Affected users notification (if their data compromised)

**Step 6: Follow-Up**
- Lessons learned session
- Update security policies
- Additional user training if needed
- Enhanced monitoring of affected areas

### Incident Documentation Template

```markdown
# Security Incident Report

**Incident ID**: INC-2025-001
**Date/Time Discovered**: 2025-11-02 10:30 AM EST
**Discovered By**: Jane Smith, Administrator
**Severity**: High

## Description
Brief description of the incident.

## Timeline
- 10:15 AM: First suspicious event detected
- 10:20 AM: Administrator notified
- 10:25 AM: Investigation began
- 10:30 AM: Account compromised confirmed
- 10:32 AM: Sessions terminated, password reset

## Affected Users
- John Doe (john.doe@mentalspace.com)

## Affected Data
- Potential access to 5 patient records
- No data exported or modified

## Root Cause
User's password was compromised via phishing email.

## Actions Taken
1. Terminated all sessions for affected user
2. Forced password change
3. Enabled MFA on account
4. Reviewed audit logs for unauthorized access
5. Notified user and provided security training

## Follow-Up Required
- Monitor account for next 30 days
- All-staff email about phishing awareness
- Review MFA adoption rates

## Lessons Learned
Need better phishing training for staff.

**Report Prepared By**: Jane Smith
**Date**: 2025-11-02
**Status**: Closed
```

---

## Compliance Reporting

### HIPAA Audit Reports

**Required for Compliance**:
- Access logs (who accessed what, when)
- Failed access attempts
- Administrative actions
- Password changes
- MFA events

**Generate Report**:
1. Admin > Reports > Compliance Reports
2. Select "HIPAA Access Report"
3. Select date range
4. Click "Generate Report"
5. Export as PDF for compliance officer

**Report Includes**:
- All authentication events
- All PHI access events
- Administrative actions
- Security incidents (if any)
- Exceptions and anomalies

### Regular Compliance Tasks

**Monthly**:
- Generate access logs
- Review for unauthorized access
- Document any exceptions
- File report with compliance officer

**Quarterly**:
- Security policy review
- User access review
- MFA adoption report
- Training compliance check

**Annually**:
- Comprehensive security audit
- Risk assessment
- Policy updates
- Disaster recovery testing

---

## Appendix: Quick Reference

### Common Administrator Tasks

| Task | Steps | Documentation |
|------|-------|---------------|
| Unlock Account | Admin > Users > [User] > Security > Unlock | Document reason in notes |
| Force Password Change | Admin > Users > [User] > Security > Force Password Change | Email user about requirement |
| View Audit Logs | Admin > Security > Audit Logs | Review weekly |
| Terminate Sessions | Admin > Users > [User] > Sessions > Terminate | Document if suspicious |
| Disable MFA | Admin > Users > [User] > Security > MFA > Disable | Verify user identity first |
| Generate Reports | Admin > Reports > [Report Type] | For compliance |

### Contact Information

**MentalSpace Support**:
- Email: support@mentalspace.com
- Phone: 1-800-MENTAL-SPACE
- Hours: Monday-Friday, 8 AM - 8 PM EST

**Security Incidents**:
- Email: security@mentalspace.com
- Phone: 1-800-MENTAL-SPACE (option 9)
- Available: 24/7

**Compliance Questions**:
- Email: compliance@mentalspace.com
- Response Time: Within 24 hours

---

**Last Updated**: November 2, 2025
**Version**: 2.0
**For Administrator Training**: contact training@mentalspace.com
