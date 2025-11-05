# Two-Factor Authentication (MFA) Setup Guide

**For**: MentalSpace EHR Users
**Version**: 2.0
**Last Updated**: November 2, 2025

---

## Table of Contents

1. [What is Two-Factor Authentication (MFA)?](#what-is-two-factor-authentication-mfa)
2. [Why Use MFA?](#why-use-mfa)
3. [Is MFA Required?](#is-mfa-required)
4. [How to Enable MFA](#how-to-enable-mfa)
5. [How to Skip MFA](#how-to-skip-mfa)
6. [Using MFA to Login](#using-mfa-to-login)
7. [Backup Codes](#backup-codes)
8. [How to Disable MFA](#how-to-disable-mfa)
9. [Troubleshooting](#troubleshooting)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## What is Two-Factor Authentication (MFA)?

Two-Factor Authentication (MFA), also called 2FA or multi-factor authentication, adds an extra layer of security to your MentalSpace EHR account.

**How it works**:
1. **First Factor**: Your password (something you know)
2. **Second Factor**: A time-based code from your phone (something you have)

Even if someone steals your password, they cannot access your account without the second factor code from your phone.

---

## Why Use MFA?

### Security Benefits

MFA protects your account and patient data from:
- **Password theft**: Stolen or guessed passwords cannot be used without your phone
- **Phishing attacks**: Even if you accidentally enter your password on a fake site, attackers still can't log in
- **Data breaches**: If a password database is compromised, your account remains secure
- **Unauthorized access**: Prevents ex-employees or unauthorized users from accessing PHI

### Compliance Benefits

- **HIPAA Alignment**: While not strictly mandatory in our system, MFA is considered a best practice for PHI access
- **Audit Trail**: MFA events are logged for compliance reporting
- **Professional Standards**: Many state licensing boards recommend MFA for telehealth systems

---

## Is MFA Required?

**No, MFA is OPTIONAL** in MentalSpace EHR.

You can choose to:
- **Enable MFA** for maximum security (recommended)
- **Skip MFA** if you prefer password-only authentication

**Our Recommendation**:
We strongly encourage all staff members to enable MFA, especially:
- Administrators with full system access
- Clinicians accessing patient records
- Users working from home or public locations
- Users with billing or financial access

However, we understand that MFA may not be suitable for all workflows, so we've made it optional.

---

## How to Enable MFA

### Prerequisites

You'll need a smartphone with one of these authenticator apps:
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (iOS/Android - if you use their password manager)

All these apps are free and work the same way.

### Step-by-Step Instructions

#### Step 1: Navigate to MFA Settings

1. Log into MentalSpace EHR
2. Click your profile picture (top right)
3. Select "Settings" from the dropdown
4. Click "Security" tab
5. Find the "Two-Factor Authentication" section
6. Click "Enable MFA" button

#### Step 2: Download an Authenticator App

If you don't already have one, download an authenticator app:

- **iPhone**: Open App Store, search "Google Authenticator" or "Microsoft Authenticator"
- **Android**: Open Google Play, search "Google Authenticator" or "Microsoft Authenticator"

#### Step 3: Scan the QR Code

1. Open your authenticator app
2. Tap "Add Account" or "+" button
3. Choose "Scan QR Code"
4. Point your camera at the QR code on your screen
5. The app will automatically add "MentalSpace EHR" to your account list

#### Step 4: Manual Entry (if QR code fails)

If you cannot scan the QR code:

1. In your authenticator app, choose "Enter a setup key manually"
2. Enter these details:
   - **Account name**: MentalSpace EHR
   - **Your email**: your-email@mentalspace.com
   - **Key**: Copy the code shown below the QR code on screen
   - **Time-based**: Yes (should be selected by default)

3. Tap "Add" or "Done"

#### Step 5: Verify Your Setup

1. Look at your authenticator app
2. You'll see a 6-digit code that changes every 30 seconds
3. Enter the current 6-digit code into MentalSpace
4. Click "Verify and Enable"

#### Step 6: Save Your Backup Codes

**CRITICAL STEP - DO NOT SKIP**

After verification, you'll see 5 backup codes. These codes can be used if you lose your phone.

**How to save them**:
1. Click "Download Backup Codes" button
2. Save the file to a secure location
3. Consider printing them and storing in a safe place
4. **DO NOT** save them on your phone (defeats the purpose if phone is lost)

**Good places to store backup codes**:
- Printed paper in a locked drawer
- Password manager (1Password, LastPass, Bitwarden)
- Encrypted USB drive

**Bad places to store backup codes**:
- Text file on your desktop
- Email to yourself
- Notes app on your phone

#### Step 7: Test Your Setup

1. Click "Done"
2. Log out of MentalSpace
3. Log back in with your email and password
4. Enter the 6-digit code from your authenticator app
5. You're in!

---

## How to Skip MFA

If you decide not to enable MFA:

### During First-Time Setup

When prompted to set up MFA after your first login:
1. Read the MFA benefits explanation
2. Click the "Skip for Now" button at the bottom
3. You'll be taken to the dashboard
4. You can enable MFA later from Settings

### If You Change Your Mind

You can enable MFA any time:
1. Go to Settings > Security > Two-Factor Authentication
2. Follow the enable MFA steps above

---

## Using MFA to Login

Once MFA is enabled, your login process changes slightly:

### Login Process

1. **Enter Email and Password**
   - Go to MentalSpace login page
   - Enter your email and password as usual
   - Click "Sign In"

2. **Enter MFA Code**
   - You'll see a new screen: "Enter Verification Code"
   - Open your authenticator app
   - Find the MentalSpace EHR entry
   - Enter the current 6-digit code
   - Click "Verify"

3. **You're Logged In**
   - If the code is correct, you'll be taken to the dashboard
   - If the code is wrong, you can try again

### Tips for Smooth Logins

- **Timing**: Codes change every 30 seconds. If code is about to expire (timer almost empty), wait for the next code
- **Copy/Paste**: Some authenticator apps let you copy the code by tapping it
- **Multiple Devices**: You can set up the same account on multiple devices (phone and tablet)

---

## Backup Codes

Backup codes are one-time use codes that can be used instead of your authenticator app.

### When to Use Backup Codes

Use a backup code if:
- You lost your phone
- Your phone battery died
- Your authenticator app was accidentally deleted
- You're traveling without your phone

### How to Use a Backup Code

1. On the MFA verification screen
2. Click "Use a backup code instead"
3. Enter one of your 5 backup codes
4. Click "Verify"

**Important**: Each backup code can only be used once. After using a code, cross it off your list.

### Regenerating Backup Codes

If you've used all 5 codes or lost your list:

1. Log into MentalSpace
2. Go to Settings > Security > Two-Factor Authentication
3. Click "Regenerate Backup Codes"
4. Enter a verification code from your app
5. Save the new 5 backup codes
6. Old backup codes are now invalid

**Best Practice**: Regenerate codes once per year even if you haven't used them.

---

## How to Disable MFA

If you need to disable MFA:

### Steps to Disable

1. Log into MentalSpace (you'll need your authenticator app)
2. Go to Settings > Security > Two-Factor Authentication
3. Find "MFA Status: Enabled"
4. Click "Disable MFA" button
5. Enter a verification code from your authenticator app
6. Confirm "Yes, disable MFA"
7. MFA is now disabled

### After Disabling

- You can log in with just email and password
- Your backup codes are no longer valid
- Audit logs will record the MFA disable event
- You can re-enable MFA anytime

### Security Warning

Disabling MFA makes your account less secure. Consider these alternatives:
- If you lost your phone, use a backup code to log in, then set up MFA on a new device
- If MFA is inconvenient, consider using a desktop authenticator app (Authy for Desktop)

---

## Troubleshooting

### "Invalid verification code" Error

**Problem**: Code from app doesn't work

**Solutions**:
1. **Check timing**: Make sure code isn't expired (wait for next code)
2. **Check phone time**: Go to phone Settings > ensure "Automatic time" is ON
3. **Try next code**: If current code doesn't work, wait 30 seconds and try the next
4. **Use backup code**: If all else fails, use a backup code

### Lost Phone

**Problem**: Phone with authenticator app is lost, stolen, or broken

**Solutions**:
1. **Use backup code**: Enter a backup code instead of authenticator code
2. **Contact admin**: If no backup codes, email support@mentalspace.com or call your practice administrator
3. **Provide verification**: Admin will need to verify your identity before unlocking account

### Deleted Authenticator App Accidentally

**Problem**: Accidentally deleted the app from phone

**Solutions**:
1. **Use backup code**: Log in with a backup code
2. **Re-download app**: Get the authenticator app again from app store
3. **Disable and re-enable MFA**: In Settings, disable MFA (using backup code), then re-enable and scan new QR code

### Wrong Code Accepted (Clock Sync Issue)

**Problem**: Codes work sometimes but not other times

**Solutions**:
1. **Fix phone time**:
   - iPhone: Settings > General > Date & Time > Set Automatically = ON
   - Android: Settings > System > Date & Time > Set Automatically = ON
2. **Restart phone**: After fixing time, restart phone
3. **Sync authenticator app**: Some apps have a "Sync" option in settings

### Code Not Appearing in App

**Problem**: MentalSpace account not showing in authenticator app

**Solutions**:
1. **Check correct app**: Make sure you're looking at the right authenticator app
2. **Scroll down**: Account might be further down the list
3. **Re-add account**: Use manual entry to add account again with setup key

---

## Frequently Asked Questions

### Q: Do I need MFA?

**A**: No, MFA is optional. However, we strongly recommend it for staff members accessing patient records, especially administrators and clinicians.

### Q: Can I use SMS text message codes instead?

**A**: Currently, we only support authenticator app codes (TOTP). SMS-based MFA is less secure and not recommended for healthcare applications.

### Q: What happens if I get a new phone?

**A**: Before erasing your old phone:
1. Set up MFA on your new phone (scan QR code again from Settings)
2. Test that new phone works
3. Then erase old phone

If you already erased old phone:
1. Use a backup code to log in
2. Disable MFA in Settings
3. Re-enable MFA and scan QR code with new phone

### Q: Can I set up MFA on multiple devices?

**A**: Yes! You can scan the same QR code with multiple devices. This is a good backup strategy.

### Q: How long do backup codes last?

**A**: Backup codes never expire, but each can only be used once. We recommend regenerating them annually.

### Q: Will MFA slow down my login?

**A**: Only slightly - adds about 5-10 seconds to enter the 6-digit code. Most users find the security benefit worth the small time trade-off.

### Q: Can I trust this device for 30 days?

**A**: This feature is coming in a future update. Currently, you need to enter MFA code on every login.

### Q: What if I'm in a session and my session times out?

**A**: You'll need to log in again with your password and MFA code. To avoid this, extend your session before it expires (warning appears at 18 minutes).

### Q: Can an administrator bypass MFA if I'm locked out?

**A**: Administrators cannot bypass MFA directly, but they can temporarily disable MFA for your account so you can log in with just your password. You'll then need to set up MFA again.

### Q: Is my MFA secret secure?

**A**: Yes, your MFA secret is encrypted in our database and never transmitted in plain text. Only the verification codes are sent during login.

### Q: What happens to MFA if I'm terminated?

**A**: When your account is deactivated, MFA is automatically disabled. If you're rehired, you'll need to set up MFA again.

---

## Getting Help

If you need assistance with MFA:

### Practice Administrator
Your practice administrator can:
- Reset your MFA if you're completely locked out
- Provide guidance on practice-specific MFA policies
- Help troubleshoot setup issues

### Email Support
- **Email**: support@mentalspace.com
- **Subject**: "MFA Setup Help"
- **Include**: Your email address and description of issue

### Phone Support
- **Phone**: 1-800-MENTAL-SPACE
- **Hours**: Monday-Friday, 8 AM - 8 PM EST
- **Have Ready**: Your email address and employee ID

---

## Security Best Practices

### Do's

- Enable MFA for maximum account security
- Save backup codes in a secure location
- Keep your phone's time synchronized automatically
- Use a password manager for your MentalSpace password
- Report suspicious login activity to your administrator

### Don'ts

- Don't share your MFA codes with anyone (not even IT support)
- Don't save backup codes on your phone
- Don't take screenshots of QR codes
- Don't use the same password for multiple sites
- Don't disable MFA without a good reason

---

## Appendix: Authenticator App Comparison

| Feature | Google Authenticator | Microsoft Authenticator | Authy |
|---------|---------------------|------------------------|-------|
| **Cost** | Free | Free | Free |
| **Platforms** | iOS, Android | iOS, Android, Windows | iOS, Android, Desktop |
| **Cloud Backup** | No | Yes (encrypted) | Yes (encrypted) |
| **Multi-device** | Manual setup | Automatic sync | Automatic sync |
| **Offline** | Yes | Yes | Yes |
| **Our Recommendation** | Good for simplicity | Best for Microsoft users | Best for multi-device |

**Our Overall Recommendation**: Microsoft Authenticator or Authy for cloud backup feature

---

**Last Updated**: November 2, 2025
**Version**: 2.0
**For Questions**: support@mentalspace.com
