# GoDaddy DNS Configuration Guide
## Connecting mentalspaceehr.com to AWS Route 53

---

## Overview

You currently own `mentalspaceehr.com` registered with GoDaddy. To use AWS services (CloudFront, ALB, Route 53), you need to point your domain's nameservers from GoDaddy to AWS Route 53.

**Why?** AWS Route 53 provides:
- Better integration with AWS services (CloudFront, ALB, S3)
- Health checks and failover
- Alias records (no cost, faster)
- Traffic routing policies
- DNSSEC support

---

## Step-by-Step Instructions

### Step 1: Get Your Route 53 Nameservers

After creating your Route 53 hosted zone (see [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)), you'll receive **4 nameservers**.

They will look similar to this:
```
ns-1234.awsdns-12.org
ns-5678.awsdns-34.com
ns-9012.awsdns-56.net
ns-3456.awsdns-78.co.uk
```

**To find your nameservers:**

**Option 1: AWS Console**
1. Go to AWS Console → Route 53
2. Click "Hosted zones"
3. Click on `mentalspaceehr.com`
4. Look for "Name servers" in the right panel
5. Copy all 4 nameservers

**Option 2: AWS CLI**
```bash
aws route53 get-hosted-zone --id YOUR_HOSTED_ZONE_ID
```

---

### Step 2: Log into GoDaddy

1. Go to https://www.godaddy.com
2. Click "Sign In" (top right)
3. Enter your username and password
4. Click "Sign In"

---

### Step 3: Navigate to DNS Management

**Method 1: From Dashboard**
1. After logging in, you'll see your dashboard
2. Click on your name (top right) → "My Products"
3. Scroll to "Domains"
4. Find `mentalspaceehr.com`
5. Click the three dots (⋮) or "Manage" button next to the domain
6. Click "Manage DNS" or "DNS"

**Method 2: Direct Link**
- Go directly to: https://dcc.godaddy.com/domains

---

### Step 4: Change Nameservers

1. On the DNS Management page for `mentalspaceehr.com`
2. Scroll down to find the **"Nameservers"** section
3. Click "Change" or "Manage" next to Nameservers

4. You'll see two options:
   - **Default (GoDaddy nameservers)** - Currently selected
   - **Custom** or **I'll use my own nameservers** - Select this

5. Click "Enter my own nameservers (advanced)"

6. You'll see input fields for nameservers

7. **Enter all 4 Route 53 nameservers:**
   ```
   Nameserver 1: ns-1234.awsdns-12.org
   Nameserver 2: ns-5678.awsdns-34.com
   Nameserver 3: ns-9012.awsdns-56.net
   Nameserver 4: ns-3456.awsdns-78.co.uk
   ```

   **Replace with YOUR actual Route 53 nameservers from Step 1!**

8. Click "Save" or "Save Changes"

9. **Confirmation:** GoDaddy will show a warning:
   > "Changing your nameservers will affect your website and email. Make sure your new nameservers are set up correctly before saving."

   Click "Continue" or "Yes, I understand"

---

### Step 5: Wait for DNS Propagation

**Timeline:**
- Minimum: 10 minutes (if you're lucky)
- Typical: 2-4 hours
- Maximum: 24-48 hours (rare)

**Why so long?**
DNS changes propagate across the internet gradually. Different DNS servers cache records for different amounts of time based on TTL (Time To Live) settings.

**During this time:**
- Your website may be intermittently unavailable
- Some users may see the old site, others the new
- Email may be affected if you have email records

---

### Step 6: Verify DNS Propagation

**Method 1: Command Line (Windows)**
```cmd
nslookup -type=NS mentalspaceehr.com
```

**Method 2: Command Line (Mac/Linux)**
```bash
dig mentalspaceehr.com NS +short
```

**Method 3: Online Tools**
- https://www.whatsmydns.net/#NS/mentalspaceehr.com
- https://dnschecker.org/#NS/mentalspaceehr.com
- https://mxtoolbox.com/SuperTool.aspx?action=ns%3amentalspaceehr.com

**What you should see:**
After propagation completes, all 4 Route 53 nameservers should appear in the results.

---

## Important Notes & Warnings

### ⚠️ Email Impact
If you're using GoDaddy email (or Office 365 through GoDaddy), **you MUST recreate your MX records in Route 53** before changing nameservers, or email will stop working.

**Backup your current DNS records:**
1. Before changing nameservers, go to GoDaddy DNS Management
2. Take screenshots of ALL records (A, CNAME, MX, TXT, etc.)
3. Save this information - you'll need to recreate important records in Route 53

**Common records to recreate:**
- **MX records** (for email)
- **TXT records** (for SPF, DKIM, DMARC email authentication)
- **CNAME records** (for subdomains like www, mail, etc.)

### ⚠️ Website Downtime
There will be a period where your website is unavailable while DNS propagates. Plan accordingly:
- Best time: Late night/early morning (low traffic)
- Avoid: Business hours, weekends if you're B2C
- Notify users if possible

### ✅ Resend Email Records
Your Resend email (`support@chctherapy.com`) uses `chctherapy.com`, NOT `mentalspaceehr.com`, so email notifications will continue to work during this transition.

---

## Checklist Before Changing Nameservers

- [ ] Route 53 hosted zone created for `mentalspaceehr.com`
- [ ] All 4 Route 53 nameservers copied and ready
- [ ] Screenshots of current GoDaddy DNS records taken
- [ ] MX records identified (if using email)
- [ ] TXT records identified (SPF, DKIM, DMARC)
- [ ] Important CNAME/A records identified
- [ ] Users notified of potential downtime (if applicable)
- [ ] Low-traffic time window selected
- [ ] Backup plan ready (can revert nameservers if needed)

---

## Checklist After Changing Nameservers

- [ ] Nameservers changed in GoDaddy
- [ ] DNS propagation checked (nslookup, dig, or online tools)
- [ ] Route 53 A record created for root domain → CloudFront
- [ ] Route 53 A record created for www → CloudFront
- [ ] SSL certificate validated in ACM
- [ ] Website accessible at https://mentalspaceehr.com
- [ ] Email working (if applicable)
- [ ] All subdomains working (if applicable)

---

## What Records to Create in Route 53

After nameservers are updated, you'll create these DNS records in Route 53:

### 1. Root Domain (mentalspaceehr.com)
**Type:** A Record (Alias)
**Name:** `mentalspaceehr.com` (or leave blank)
**Value:** CloudFront distribution
**Purpose:** Points your domain to your website

### 2. WWW Subdomain
**Type:** A Record (Alias)
**Name:** `www.mentalspaceehr.com`
**Value:** Same CloudFront distribution
**Purpose:** Points www.mentalspaceehr.com to your website

### 3. Email Records (Resend)
You're using `support@chctherapy.com`, so these go in the `chctherapy.com` zone (if you own it).

If you want email at `mentalspaceehr.com`:
**Type:** MX Record
**Name:** `mentalspaceehr.com`
**Value:** Resend MX records (get from Resend dashboard)
**Priority:** 10

### 4. SPF Record (Email Authentication)
**Type:** TXT Record
**Name:** `mentalspaceehr.com`
**Value:** `v=spf1 include:_spf.resend.com ~all`
**Purpose:** Prevents email spoofing

### 5. DKIM Record (Email Authentication)
**Type:** TXT Record
**Name:** `resend._domainkey.mentalspaceehr.com`
**Value:** (Get from Resend dashboard)
**Purpose:** Email signature verification

---

## Troubleshooting

### Problem: "Nameservers won't save in GoDaddy"
**Solution:**
- Make sure you entered exactly 4 nameservers
- Check for typos or extra spaces
- Try a different browser
- Clear browser cache
- Contact GoDaddy support: 1-480-505-8877

### Problem: "DNS propagation taking too long"
**Solution:**
- Wait 48 hours before panicking
- Use multiple DNS checker tools
- Try from different devices/networks
- Flush your local DNS cache

**Windows:**
```cmd
ipconfig /flushdns
```

**Mac:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**
```bash
sudo systemd-resolve --flush-caches
```

### Problem: "Website shows SSL error after DNS change"
**Solution:**
- Ensure SSL certificate is validated in ACM (us-east-1)
- Certificate must include both `mentalspaceehr.com` and `www.mentalspaceehr.com`
- CloudFront must be configured with the certificate
- Wait for CloudFront deployment to complete (15-20 minutes)

### Problem: "Email stopped working"
**Solution:**
- Check if you had MX records in GoDaddy
- Recreate MX records in Route 53
- Add SPF, DKIM, DMARC records
- Wait for DNS propagation
- Test email: https://mxtoolbox.com/domain/mentalspaceehr.com

### Problem: "Want to revert back to GoDaddy nameservers"
**Solution:**
1. Go to GoDaddy DNS Management
2. Click "Change" on Nameservers
3. Select "Default (GoDaddy nameservers)"
4. Click "Save"
5. Wait for propagation (2-48 hours)

---

## Reference: GoDaddy Default Nameservers

If you need to revert, GoDaddy's default nameservers are typically:
```
ns01.domaincontrol.com
ns02.domaincontrol.com
```

But **yours may be different**. To find your original GoDaddy nameservers:
1. Log into GoDaddy
2. Go to DNS Management
3. Select "Default" nameservers option
4. GoDaddy will show you the nameservers it would use

---

## Support Contacts

**GoDaddy Support:**
- Phone: 1-480-505-8877 (24/7)
- Chat: Available in account dashboard
- Help Center: https://www.godaddy.com/help

**AWS Support:**
- Console: https://console.aws.amazon.com/support/
- Documentation: https://docs.aws.amazon.com/route53/

---

## Summary Timeline

| Step | Action | Time |
|------|--------|------|
| 1 | Create Route 53 hosted zone | 2 minutes |
| 2 | Copy Route 53 nameservers | 1 minute |
| 3 | Update GoDaddy nameservers | 5 minutes |
| 4 | **Wait for DNS propagation** | **2-48 hours** |
| 5 | Verify propagation | 2 minutes |
| 6 | Create Route 53 records | 10 minutes |
| 7 | Validate SSL certificate | 5-30 minutes |
| 8 | Deploy CloudFront | 15-20 minutes |
| 9 | Final testing | 10 minutes |

**Total Active Time:** ~1 hour
**Total Elapsed Time:** 2-48 hours (due to DNS propagation)

---

**Last Updated:** October 20, 2025
**Domain:** mentalspaceehr.com
**Registrar:** GoDaddy
**DNS Provider:** AWS Route 53 (after migration)
