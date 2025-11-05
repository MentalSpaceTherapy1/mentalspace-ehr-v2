# Account Security Guide

**For**: MentalSpace EHR Users
**Version**: 2.0
**Last Updated**: November 2, 2025

---

## Table of Contents

1. [Password Requirements](#password-requirements)
2. [Password Expiration](#password-expiration)
3. [Session Timeout](#session-timeout)
4. [Account Lockout](#account-lockout)
5. [Security Best Practices](#security-best-practices)
6. [Recognizing Security Threats](#recognizing-security-threats)
7. [What to Do If Your Account Is Compromised](#what-to-do-if-your-account-is-compromised)

---

## Password Requirements

### Current Requirements

Your MentalSpace password must meet these requirements:

- **Minimum Length**: 12 characters
- **Uppercase Letter**: At least one (A-Z)
- **Lowercase Letter**: At least one (a-z)
- **Number**: At least one (0-9)
- **Special Character**: At least one (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Example Strong Passwords

✅ **Good Examples**:
- `BlueOcean$2025!Mental`
- `7Therapy#SpaceDocs`
- `MyP@ssw0rd_EHR123`

❌ **Bad Examples**:
- `password123` (too short, no special characters)
- `Password1!` (too short, only 11 characters)
- `MentalSpace` (no numbers or special characters)

### Why These Requirements?

These requirements protect against:
- **Brute Force Attacks**: Longer passwords take exponentially longer to crack
- **Dictionary Attacks**: Complexity requirements prevent common word usage
- **Password Guessing**: Multiple character types make passwords unpredictable

---

## Password Expiration

### Policy Overview

**For Staff Users**:
- Passwords expire every **90 days**
- Cannot reuse your last **10 passwords**
- Warnings appear at 30, 14, and 7 days before expiration

**For Client Portal Users**:
- Passwords do not expire
- Can be changed voluntarily at any time

### Expiration Warnings

You'll receive warnings when your password is about to expire:

#### 30 Days Before Expiration
- **Banner message** at top of dashboard:
  > "Your password expires in 30 days. Click here to change it now."

#### 14 Days Before Expiration
- **Email notification** sent to your practice email
- Dashboard banner becomes more prominent (yellow)

#### 7 Days Before Expiration
- **Daily email reminders**
- Dashboard banner turns orange
- **Pop-up message** on login

#### On Expiration Day
- **Cannot log in** until password is changed
- Redirected to password change screen
- Email with reset instructions

### How to Change Your Password Before Expiration

**Proactive Password Change**:

1. Log into MentalSpace
2. Click your profile picture (top right)
3. Select "Settings"
4. Click "Security" tab
5. Find "Change Password" section
6. Enter:
   - Current password
   - New password (must meet requirements)
   - Confirm new password
7. Click "Change Password"

**Password History Check**:
If your new password matches one of your last 10 passwords, you'll see:
> "Cannot reuse a recent password. Please choose a different password."

### What Happens If Your Password Expires

If you don't change your password before expiration:

1. **Login Attempt**: You try to log in with your email and password
2. **Expired Notice**: You see:
   > "Your password has expired. You must change it to continue."
3. **Password Reset**: You're redirected to password change screen
4. **New Password**: Enter your current (expired) password and a new password
5. **Success**: You're logged in with your new password

---

## Session Timeout

### Inactivity Timeout Policy

For security, your session will automatically time out after **20 minutes of inactivity**.

**What counts as activity?**
- Clicking any button or link
- Typing in any field
- Viewing different pages
- Saving data

**What does NOT count as activity?**
- Just having the browser tab open
- Reading a page without clicking
- Having the computer on but not using MentalSpace

### Session Timeout Warning

At **18 minutes** (2 minutes before timeout), you'll see a warning modal:

```
┌─────────────────────────────────────────┐
│  Session Timeout Warning                │
├─────────────────────────────────────────┤
│  Your session will expire in:           │
│                                         │
│        1 minute 47 seconds              │
│                                         │
│  [ Extend Session ]  [ Logout ]         │
└─────────────────────────────────────────┘
```

**Your Options**:

1. **Extend Session**: Click to stay logged in (extends timeout by 20 minutes)
2. **Logout**: Click to logout immediately
3. **Do Nothing**: After 2 minutes, you'll be automatically logged out

### What Happens After Timeout

If your session times out:

1. **Auto-Logout**: You're automatically logged out
2. **Redirect**: You're redirected to the login page
3. **Message**: You see:
   > "Your session expired due to inactivity. Please log in again."
4. **Data Loss**: Any unsaved changes are lost

### How to Avoid Losing Work

**Best Practices**:
- **Save frequently**: Click "Save" every few minutes when working on notes
- **Long notes**: If writing long clinical notes, click "Save Draft" every 5-10 minutes
- **Phone calls**: If you need to step away for a call, extend your session first or save your work
- **Meetings**: Logout before attending meetings (don't leave computer unattended)

### Why Session Timeout Is Important

Session timeout protects:
- **Unattended computers**: Prevents unauthorized access if you walk away
- **Public locations**: Critical when working from coffee shops or shared spaces
- **HIPAA compliance**: Automatic logoff is required for PHI access
- **Data breaches**: Limits exposure if someone finds an unlocked device

### Adjusting Session Behavior

**Can I extend the 20-minute timeout?**
No, the 20-minute timeout is a security policy and cannot be changed by individual users.

**Can I disable session timeout?**
No, session timeout is required for HIPAA compliance.

**Can I stay logged in forever?**
No, for security reasons, sessions must expire after inactivity.

---

## Account Lockout

### Lockout Policy

Your account will be **locked for 30 minutes** after **5 failed login attempts**.

**Why 5 attempts?**
- Allows for typos and forgotten passwords
- Prevents brute-force attacks (automated password guessing)
- Balances security with user convenience

### What Counts as a Failed Attempt?

- Wrong password (correct email, wrong password)
- Wrong email format followed by any password

**What does NOT count**:
- Entering email without submitting
- Clicking "Forgot Password"
- Closing the browser

### Lockout Experience

**After 5 Failed Attempts**:

1. **Lockout Message**:
   > "Your account has been locked due to too many failed login attempts. Please try again in 30 minutes or contact your administrator."

2. **Email Notification**: You'll receive an email:
   > "Security Alert: Your MentalSpace account was locked due to multiple failed login attempts from IP address 192.168.1.100 at 10:30 AM EST on November 2, 2025."

3. **Cannot Login**: Any login attempts during the 30-minute lockout will show the same error

### Lockout Duration

| Failed Attempts | Result |
|----------------|---------|
| 1-4 attempts | Warning: "Invalid email or password" |
| 5 attempts | Account locked for 30 minutes |
| After 30 minutes | Lockout automatically expires |
| Successful login | Failed attempt counter resets to 0 |

### How to Unlock Your Account

**Option 1: Wait 30 Minutes**
- Most common approach
- Lockout automatically expires
- No action needed
- Counter resets to 0

**Option 2: Contact Administrator**
- Email your practice administrator
- Provide your email address
- Administrator can unlock immediately
- Useful if you need urgent access

**Option 3: Use "Forgot Password"**
- During lockout, you can still reset password
- Resetting password does NOT unlock account
- You must wait for lockout to expire OR contact admin
- Then use new password to login

### How to Avoid Getting Locked Out

**Best Practices**:

1. **Use Password Manager**: Prevents typos (LastPass, 1Password, Bitwarden)
2. **Double-Check Email**: Make sure email is correct before entering password
3. **Reset After 3 Failures**: If you've failed 3 times, use "Forgot Password" instead of guessing
4. **Check Caps Lock**: Common cause of failed logins
5. **Browser Autofill**: Let browser remember your password (if secure)

**What NOT to Do**:
- Don't keep guessing your password
- Don't try multiple passwords rapidly
- Don't use someone else's account if yours is locked

### Suspicious Lockout

If your account is locked but you didn't attempt to log in:

1. **Check email**: Look for the security alert email
2. **Note IP address**: Is it your IP or someone else's?
3. **Contact administrator immediately**: This could indicate:
   - Someone trying to access your account
   - Phishing attempt
   - Compromised password

### Administrative Unlock

If an administrator unlocks your account:

1. **Immediate Access**: You can log in right away
2. **Audit Trail**: Unlock event is logged with admin's name
3. **Security Review**: Administrator may require password change
4. **Follow-up**: Administrator may ask about the failed attempts

---

## Security Best Practices

### Strong Password Tips

1. **Use a Passphrase**: Combine multiple words
   - Example: `CoffeeTherapy@2025!Blue`
2. **Avoid Personal Info**: Don't use birthdays, names, or addresses
3. **Unique per Site**: Never reuse your MentalSpace password elsewhere
4. **Use a Password Manager**: Let software generate and store complex passwords
5. **Change if Compromised**: If you think password is compromised, change immediately

### Password Manager Recommendations

Free options:
- **Bitwarden**: Open-source, secure, cross-platform
- **LastPass** (Free): Good for single device
- **Dashlane** (Free): User-friendly interface

Paid options:
- **1Password**: $2.99/month, excellent features
- **LastPass Premium**: $3/month, family plans available
- **Keeper**: $2.92/month, security audits

### Multi-Factor Authentication (MFA)

**Highly Recommended**:
- Add a second layer of security (see MFA Setup Guide)
- Protects against password theft
- Optional but strongly encouraged
- Takes only 5 minutes to set up

### Secure Work Habits

**Physical Security**:
- Lock your computer when stepping away (Windows: Win+L, Mac: Ctrl+Cmd+Q)
- Don't share your password with colleagues
- Log out when finished for the day
- Don't write passwords on sticky notes

**Digital Security**:
- Use HTTPS (secure connection) - automatic in MentalSpace
- Don't access from public Wi-Fi without VPN
- Keep your browser updated
- Enable browser security features

**Email Security**:
- Verify emails are from @mentalspace.com
- Don't click links in suspicious emails
- MentalSpace will NEVER ask for your password via email
- Report phishing attempts to support@mentalspace.com

---

## Recognizing Security Threats

### Phishing Emails

**Warning Signs**:
- Email asks for your password
- Urgent language: "Your account will be closed!"
- Generic greeting: "Dear User" instead of your name
- Spelling errors or poor grammar
- Link doesn't match actual URL (hover to check)
- Sender email is suspicious: "mentalsp4ce.com" or "mentaIspace.com" (L vs I)

**Example Phishing Email**:
```
From: support@mentaIspace.com (note the 'I' instead of 'l')
Subject: URGENT: Verify Your Account

Dear User,

Your MentalSpace account will be suspended in 24 hours due to security
reasons. Click here to verify your account immediately:

http://mentalsp4ce-verify.com/login

MentalSpace Security Team
```

**What to Do**:
1. Do NOT click any links
2. Do NOT enter your password
3. Forward to support@mentalspace.com
4. Delete the email

### Legitimate MentalSpace Communications

**Real emails from MentalSpace**:
- Always from @mentalspace.com domain
- Use your name (not "Dear User")
- Never ask for passwords
- Links go to mentalspace.com domain
- Professional formatting and spelling

### Social Engineering

**What is Social Engineering?**
Tricking people into revealing passwords or sensitive information.

**Common Tactics**:
- **Impersonation**: "Hi, this is IT support. I need your password to fix an issue."
- **Urgency**: "Your account will be deleted in 1 hour!"
- **Authority**: "This is the CEO. I need you to send me the patient database."

**How to Protect Yourself**:
- Never share your password with anyone (even IT)
- Verify identity through official channels
- Don't rush - take time to think
- Report suspicious requests to your administrator

---

## What to Do If Your Account Is Compromised

### Signs Your Account May Be Compromised

- Unexpected lockout email from unfamiliar IP address
- Sessions you don't recognize (check Settings > Active Sessions)
- Changes you didn't make (password changed, MFA disabled)
- Unusual activity in audit logs
- Colleagues report receiving suspicious emails from your account

### Immediate Actions

**Step 1: Change Password**
1. If you can still log in, change password immediately
2. Use a completely new password (not variation of old one)
3. Make sure it meets all requirements

**Step 2: Enable MFA**
1. If not already enabled, enable MFA right away
2. This prevents attacker from logging in even with your new password

**Step 3: Terminate All Sessions**
1. Go to Settings > Security > Active Sessions
2. Click "Logout All Devices"
3. This ends any sessions the attacker may have

**Step 4: Review Audit Log**
1. Go to Settings > Security > Audit Log
2. Look for suspicious activity:
   - Logins from unusual locations
   - Changes you didn't make
   - Data exports or downloads
3. Take screenshots of suspicious activity

**Step 5: Contact Administrator**
1. Email your practice administrator immediately
2. Subject: "URGENT: Possible Account Compromise"
3. Include:
   - What you noticed
   - When you first noticed it
   - Screenshots of suspicious activity
4. Request security review

**Step 6: Change Other Passwords**
1. If you used the same password on other sites, change those too
2. Check your email account
3. Check financial accounts
4. Use unique passwords for each site going forward

### Administrator Response

Your administrator will:
- Investigate the incident
- Review audit logs
- Determine if PHI was accessed
- File incident report if required
- Implement additional security measures
- Provide guidance on next steps

### Prevention for the Future

After an incident:
- Always use unique passwords for each site
- Enable MFA on all accounts that support it
- Use a password manager
- Be vigilant about phishing attempts
- Review account activity regularly

---

## Additional Resources

### Internal Resources

- **MFA Setup Guide**: docs/user-guides/mfa-setup-guide.md
- **Admin Guide**: docs/admin-guides/account-management-guide.md
- **Practice Security Policy**: Contact your administrator

### External Resources

- **NIST Password Guidelines**: https://pages.nist.gov/800-63-3/sp800-63b.html
- **HIPAA Security Rule**: https://www.hhs.gov/hipaa/for-professionals/security/
- **Stay Safe Online**: https://staysafeonline.org/

### Getting Help

**Technical Support**:
- Email: support@mentalspace.com
- Phone: 1-800-MENTAL-SPACE
- Hours: Monday-Friday, 8 AM - 8 PM EST

**Security Incidents**:
- Email: security@mentalspace.com
- Response Time: Within 1 hour for urgent issues
- Available: 24/7 for critical security issues

**Practice Administrator**:
- Contact information available in your welcome email
- Can unlock accounts
- Can reset MFA
- Can review audit logs

---

## Compliance Notes

### HIPAA Requirements

The security features described in this guide help MentalSpace comply with:
- **HIPAA Security Rule § 164.312(a)(2)(i)**: Unique user identification
- **HIPAA Security Rule § 164.312(a)(2)(iii)**: Automatic logoff
- **HIPAA Security Rule § 164.312(d)**: Person or entity authentication

### Audit Trail

All security events are logged:
- Login attempts (successful and failed)
- Password changes
- MFA events
- Session creation and termination
- Account lockouts and unlocks
- Administrative actions

These logs are:
- Retained for 7 years (HIPAA requirement)
- Immutable (cannot be edited)
- Available for compliance audits
- Reviewed for suspicious activity

---

**Last Updated**: November 2, 2025
**Version**: 2.0
**For Questions**: support@mentalspace.com
