# AWS SES DNS Records - Add to GoDaddy

**Domain**: mentalspaceehr.com
**Purpose**: Enable email sending via AWS SES

---

## 📋 DNS Records to Add in GoDaddy

### 1. Domain Verification Record (Required)

**Type**: TXT
**Name**: `_amazonses.mentalspaceehr.com`
**Value**: `nXu1rjkacr7woOMLtlDaIqDiTq1ScIwtchPqH5uh53o=`
**TTL**: 3600 (1 hour)

### 2. DKIM Records (Required for Email Authentication)

#### DKIM Token 1
**Type**: CNAME
**Name**: `owrzzxbnrb2c6gv2wso24tavksjvyg7v._domainkey.mentalspaceehr.com`
**Value**: `owrzzxbnrb2c6gv2wso24tavksjvyg7v.dkim.amazonses.com`
**TTL**: 3600

#### DKIM Token 2
**Type**: CNAME
**Name**: `tkfzzanxrahagqp4zm2wheoziy5jjrz5._domainkey.mentalspaceehr.com`
**Value**: `tkfzzanxrahagqp4zm2wheoziy5jjrz5.dkim.amazonses.com`
**TTL**: 3600

#### DKIM Token 3
**Type**: CNAME
**Name**: `p4x3sqstpmuvbbx5almhdfahnyvlgcum._domainkey.mentalspaceehr.com`
**Value**: `p4x3sqstpmuvbbx5almhdfahnyvlgcum.dkim.amazonses.com`
**TTL**: 3600

---

## 🚀 How to Add These Records in GoDaddy

### Step 1: Login to GoDaddy
1. Go to https://sso.godaddy.com
2. Login with your credentials
3. Navigate to "My Products"
4. Click "DNS" next to mentalspaceehr.com

### Step 2: Add Domain Verification TXT Record
1. Click "Add Record"
2. Select "TXT" type
3. In "Name" field, enter: `_amazonses`
4. In "Value" field, paste: `nXu1rjkacr7woOMLtlDaIqDiTq1ScIwtchPqH5uh53o=`
5. TTL: 1 Hour
6. Click "Save"

### Step 3: Add DKIM CNAME Records (3 records)
For each of the 3 DKIM tokens:

1. Click "Add Record"
2. Select "CNAME" type
3. In "Name" field, enter the full name (e.g., `owrzzxbnrb2c6gv2wso24tavksjvyg7v._domainkey`)
4. In "Value" field, enter the corresponding .dkim.amazonses.com value
5. TTL: 1 Hour
6. Click "Save"

**Repeat for all 3 DKIM tokens**

### Step 4: Wait for DNS Propagation
- DNS changes take 15 minutes to 48 hours
- Usually propagates within 1-2 hours
- Check status with: `nslookup -type=TXT _amazonses.mentalspaceehr.com`

---

## ✅ Verification

After adding records, verify in AWS:

```bash
# Check domain verification status
aws ses get-identity-verification-attributes --identities mentalspaceehr.com --region us-east-1

# Check DKIM status
aws ses get-identity-dkim-attributes --identities mentalspaceehr.com --region us-east-1
```

**Expected Output** (after DNS propagates):
```json
{
  "VerificationAttributes": {
    "mentalspaceehr.com": {
      "VerificationStatus": "Success"
    }
  }
}
```

---

## 📧 Additional Recommended Records

### SPF Record (Prevents Email Spoofing)
**Type**: TXT
**Name**: `@` (or `mentalspaceehr.com`)
**Value**: `v=spf1 include:amazonses.com ~all`
**TTL**: 3600

### DMARC Record (Email Policy)
**Type**: TXT
**Name**: `_dmarc.mentalspaceehr.com`
**Value**: `v=DMARC1; p=quarantine; rua=mailto:postmaster@mentalspaceehr.com`
**TTL**: 3600

### MX Record (For Receiving Bounce Notifications)
**Type**: MX
**Name**: `@`
**Value**: `feedback-smtp.us-east-1.amazonses.com`
**Priority**: 10
**TTL**: 3600

---

## 🔍 Quick Verification Commands

```bash
# Check TXT record
nslookup -type=TXT _amazonses.mentalspaceehr.com

# Check DKIM CNAME records
nslookup -type=CNAME owrzzxbnrb2c6gv2wso24tavksjvyg7v._domainkey.mentalspaceehr.com
nslookup -type=CNAME tkfzzanxrahagqp4zm2wheoziy5jjrz5._domainkey.mentalspaceehr.com
nslookup -type=CNAME p4x3sqstpmuvbbx5almhdfahnyvlgcum._domainkey.mentalspaceehr.com

# Check SPF record
nslookup -type=TXT mentalspaceehr.com
```

---

## 📝 Summary

| Record Type | Count | Purpose |
|-------------|-------|---------|
| TXT (Verification) | 1 | Verify domain ownership |
| CNAME (DKIM) | 3 | Email authentication |
| TXT (SPF) | 1 | Prevent spoofing (recommended) |
| TXT (DMARC) | 1 | Email policy (recommended) |
| MX | 1 | Bounce handling (optional) |

**Total Required Records**: 4 (1 TXT + 3 CNAME)
**Total Recommended Records**: 7

---

**Created**: October 22, 2025
**Region**: us-east-1
**Status**: Awaiting DNS configuration
