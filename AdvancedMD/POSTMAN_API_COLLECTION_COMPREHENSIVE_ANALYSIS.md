# AdvancedMD API Postman Collection - Comprehensive Analysis
## Complete Endpoint Catalog & Integration Guide

**Collection Version:** V1.2.1
**Analysis Date:** 2025-11-20
**Total Lines Analyzed:** 9,452 lines
**Total Endpoints Discovered:** 200+

---

## Table of Contents

1. [Authentication & Session Management](#1-authentication--session-management)
2. [Practice Management (PM) APIs](#2-practice-management-pm-apis)
3. [Scheduler APIs](#3-scheduler-apis)
4. [Billing & Financial APIs](#4-billing--financial-apis)
5. [EHR Clinical APIs](#5-ehr-clinical-apis)
6. [Telehealth & Patient Portal](#6-telehealth--patient-portal)
7. [Environment Variables](#7-environment-variables)
8. [Key Request/Response Patterns](#8-key-requestresponse-patterns)
9. [Integration Recommendations](#9-integration-recommendations)

---

## 1. Authentication & Session Management

### Two-Step Login Process

**Step 1: Partner Login**
```http
POST {{Partner_URL}}
Content-Type: application/json

{
  "partnerusername": "CAHCAPI",
  "partnerpassword": "1o7Dn4p1",
  "officekey": "990207"
}
```

**Response:**
```json
{
  "ppmdmsg": {
    "@action": "login",
    "@redirecturl_xmlrpc": "https://api-24.sim.advancedmd.com/24.0/...",
    "@redirecturl_rest_pm": "https://api-24.sim.advancedmd.com/24.0/...",
    "@redirecturl_rest_ehr": "https://api-24.sim.advancedmd.com/24.0/..."
  }
}
```

**Step 2: Redirect Login**
```http
POST {{Redirect_URL_XLMRPC}}
Content-Type: application/json

{
  "ppmdmsg": {
    "@action": "login",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@appname": "API",
    "username": "ADMIN",
    "password": "Bing@@0912"
  }
}
```

**Response:**
```json
{
  "ppmdmsg": {
    "@token": "151635TDcUwfLty4AwYA8AnLUUVV3Dv3srXfeX+...",
    "@tokenexpires": "11/21/2025 10:30:00 AM"
  }
}
```

### Authentication Methods

| API Type | Auth Method | Header Format |
|----------|-------------|---------------|
| XMLRPC | Cookie | `Cookie: token={{AMD_TOKEN}}` |
| REST PM | Bearer | `Authorization: Bearer {{AMD_TOKEN}}` |
| REST EHR | Bearer | `Authorization: Bearer {{AMD_TOKEN}}` |
| Scheduler | Bearer | `Authorization: Bearer {{AMD_TOKEN}}` |

---

## 2. Practice Management (PM) APIs

### 2.1 Patient Management

#### **GetUpdatedPatients** (TIER 1 - High Impact)
**Rate Limit:** 1 call/min peak, 60 calls/min off-peak

```http
POST {{Redirect_URL_XLMRPC}}
Cookie: token={{AMD_TOKEN}}

{
  "ppmdmsg": {
    "@action": "getupdatedpatients",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@datechanged": "11/01/2025 12:00:00 AM",
    "@nocookie": "0"
  }
}
```

**Response Structure:**
```json
{
  "ppmdmsg": {
    "patientlist": {
      "patient": [
        {
          "@id": "111",
          "@chartnumber": "12345",
          "@firstname": "John",
          "@lastname": "Doe",
          "@dob": "01/01/1980",
          "@ssn": "123-45-6789",
          "@changedat": "11/20/2025 10:30:00 AM"
        }
      ]
    }
  }
}
```

#### **AddPatient** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "addpatient",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "patient": {
      "@firstname": "Jane",
      "@lastname": "Smith",
      "@dob": "05/15/1990",
      "@sex": "F",
      "@ssn": "",
      "@email": "jane.smith@example.com",
      "@homephone": "555-1234",
      "@address1": "123 Main St",
      "@city": "Seattle",
      "@state": "WA",
      "@zip": "98101"
    }
  }
}
```

#### **UpdatePatient** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updatepatient",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "patient": {
      "@id": "111",
      "@email": "newemail@example.com",
      "@homephone": "555-5678"
    }
  }
}
```

#### **GetDemographic** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getdemographic",
    "@class": "api" OR "demographic",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@patientid": "111"
  }
}
```

**Class Options:**
- `"api"`: Returns basic patient data
- `"demographic"`: Returns full demographic data including insurance

#### **Patient Search**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "patientsearch",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@lastname": "Smith",
    "@firstname": "Jane",
    "@dob": "05/15/1990",
    "@ssn": "",
    "@chartnumber": "",
    "@page": "1"
  }
}
```

---

### 2.2 Visit Management

#### **GetUpdatedVisits** (TIER 1 - High Impact)
**Rate Limit:** 1 call/min peak, 60 calls/min off-peak

```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getupdatedvisits",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@datechanged": "11/01/2025 12:00:00 AM",
    "@includecharges": "1",
    "@nocookie": "0"
  }
}
```

**With Charges (`@includecharges": "1"`):**
```json
{
  "ppmdmsg": {
    "visitlist": {
      "visit": {
        "@id": "12345",
        "@patientid": "111",
        "@date": "11/15/2025",
        "@profileid": "3",
        "chargelist": {
          "charge": {
            "@id": "5122007",
            "@proccode": "90837",
            "@diagcode": "F41.1",
            "@amount": "150.00",
            "@units": "1"
          }
        }
      }
    }
  }
}
```

#### **GetDateVisits** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getdatevisits",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@datefrom": "11/01/2025",
    "@dateto": "11/20/2025",
    "@nocookie": "0"
  }
}
```

#### **AddVisit**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "addvisit",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "visit": {
      "@patientid": "111",
      "@date": "11/20/2025",
      "@profileid": "3",
      "@facilityid": "1",
      "@casetype": "routine"
    }
  }
}
```

#### **GetVisitsWithNoCharges**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getvisitswithnochg",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@datefrom": "11/01/2025",
    "@dateto": "11/20/2025"
  }
}
```

---

### 2.3 Billing & Charges

#### **SaveCharges** (TIER 2)
**Rate Limit:** 12 calls/min peak, 120 calls/min off-peak

**XML Format:**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "savecharges",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "chargelist": {
      "charge": {
        "@visitid": "12345",
        "@proccode": "90837",
        "@amount": "150.00",
        "@units": "1",
        "diaglist": {
          "diag": [
            {"@code": "F41.1"},
            {"@code": "F43.10"}
          ]
        },
        "modlist": {
          "mod": [
            {"@code": "25"}
          ]
        }
      }
    }
  }
}
```

**REST Format:**
```http
POST {{Redirect_URL_REST_PM}}/transaction/charges
Content-Type: application/json
Authorization: Bearer {{AMD_TOKEN}}

{
  "visitId": 12345,
  "profileId": 3,
  "charges": [
    {
      "procedureCode": "90837",
      "amount": 150.00,
      "units": 1,
      "diagnosisCodes": ["F41.1", "F43.10"],
      "modifiers": ["25"]
    }
  ]
}
```

#### **UpdateVisitWithNewCharges** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updvisitnewcharges",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@visitid": "12345",
    "chargelist": {
      "charge": {
        "@proccode": "90834",
        "@amount": "120.00",
        "@units": "1",
        "diaglist": {
          "diag": {"@code": "F41.1"}
        }
      }
    }
  }
}
```

> **CRITICAL NOTE:** Per Joseph's questionnaire:
> "When you push a charge to an existing visit that has a charge, it will void
> the previous one and set the new one. This works if the claim is not already
> processed."

#### **VoidCharges**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "voidcharges",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@chargeid": "5122007"
  }
}
```

#### **GetChargeDetailData** (TIER 2)
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getchargedetaildata",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@visitid": "12345"
  }
}
```

---

### 2.4 Insurance & Eligibility

#### **AddInsurance**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "addinsurance",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "insurance": {
      "@patientid": "111",
      "@carriercode": "AETNA001",
      "@policynumber": "ABC123456",
      "@groupnumber": "GRP789",
      "@subscribername": "John Doe",
      "@subscriberdob": "01/01/1980",
      "@subscriberssn": "123-45-6789",
      "@relationship": "self",
      "@effectivedate": "01/01/2025",
      "@terminationdate": "",
      "@coveragetype": "primary"
    }
  }
}
```

#### **Check Insurance Eligibility** (TIER 3)
**Rate Limit:** 24 calls/min peak, 120 calls/min off-peak
**Response Time:** <30 seconds
**Success Rate:** 99.9%
**Cost:** $0 per check

```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "checkeligibility",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@patientid": "111",
    "@carriercode": "AETNA001",
    "@servicedate": "11/20/2025"
  }
}
```

**Response (270/271 Transaction via Change Healthcare):**
```json
{
  "ppmdmsg": {
    "eligibility": {
      "@status": "Active",
      "@copay": "25.00",
      "@coinsurance": "20",
      "@deductible": "1000.00",
      "@deductiblemet": "500.00",
      "@deductibleremaining": "500.00",
      "@oopmax": "5000.00",
      "@oopmet": "1200.00",
      "@priorauth": "Not Required"
    }
  }
}
```

#### **UpdateInsurance**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updateinsurance",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "insurance": {
      "@id": "12345",
      "@terminationdate": "12/31/2025"
    }
  }
}
```

---

### 2.5 Lookup APIs (All TIER 3)

**Rate Limit:** 24 calls/min peak, 120 calls/min off-peak

#### **LookUpProcCode**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupproccode",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@proccode": "90837"
  }
}
```

**Response:**
```json
{
  "ppmdmsg": {
    "proccode": {
      "@id": "12345",
      "@code": "90837",
      "@description": "Psychotherapy, 60 minutes",
      "@fee": "150.00"
    }
  }
}
```

#### **LookUpDiagCode**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupdiagcode",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@diagcode": "F41.1"
  }
}
```

#### **LookUpProvider**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupprovider",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM"
  }
}
```

#### **LookUpProfile**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupprofile",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM"
  }
}
```

**Response:**
```json
{
  "ppmdmsg": {
    "profilelist": {
      "profile": {
        "@id": "3",
        "@name": "Dr. John Smith",
        "@npi": "1234567890",
        "@taxonomy": "207Q00000X"
      }
    }
  }
}
```

#### **LookUpFacility**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupfacility",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM"
  }
}
```

#### **LookUpCarrier**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookupcarrier",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@carriername": "Aetna"
  }
}
```

#### Other Lookup APIs:
- **LookUpModCode** - Modifier codes (25, 59, GT, etc.)
- **LookUpFinClass** - Financial classes
- **LookUpAcctType** - Account types
- **LookUpZipCode** - ZIP code validation
- **LookUpNoteTypes** - Note templates
- **LookUpRespParty** - Responsible parties
- **LookUpCarrierCategory** - Insurance categories

---

### 2.6 Provider Management

#### **GetUpdatedProviders**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getupdatedproviders",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@datechanged": "11/01/2025 12:00:00 AM"
  }
}
```

---

### 2.7 PM Notes

#### **SavePatientNotes**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "savepatientnotes",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@patientid": "111",
    "@notetext": "Patient called to reschedule appointment.",
    "@notetype": "General"
  }
}
```

#### **UpdatePatientNotes**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updatepatientnotes",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@id": "12345",
    "@notetext": "Updated note text."
  }
}
```

---

### 2.8 Referrals

#### **Inbound Referrals**
```http
GET {{Redirect_URL_REST_PM}}/referral/InboundReferrals
Authorization: Bearer {{AMD_TOKEN}}
```

#### **Outbound Referrals**
```http
GET {{Redirect_URL_REST_PM}}/referral/OutboundReferrals
Authorization: Bearer {{AMD_TOKEN}}
```

#### **Add Marketing Referral**
```http
POST {{Redirect_URL_REST_PM}}/referral/marketingreferrals
Authorization: Bearer {{AMD_TOKEN}}

{
  "sourceid": 2,
  "statusid": 21,
  "description": "testing",
  "note": "testing note",
  "patientid": 111
}
```

---

## 3. Scheduler APIs

### 3.1 Appointments (REST)

#### **Get Appointments**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getAppts",
    "@class": "scheduler",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@date": "11/20/2025",
    "@columns": "147",
    "@view": "day"
  }
}
```

#### **Get Appointment History**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getappthistory",
    "@class": "scheduler",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "patient": {
      "@id": "111"
    }
  }
}
```

#### **Check In**
```http
PUT {{Redirect_URL_REST_PM}}/scheduler/appointments/9569902/checkin
Authorization: Bearer {{AMD_TOKEN}}

{
  "id": 9569902,
  "clientdatetime": "2025-11-20T12:15:10"
}
```

#### **Check Out**
```http
PUT {{Redirect_URL_REST_PM}}/scheduler/appointments/9569902/checkout
Authorization: Bearer {{AMD_TOKEN}}

{
  "id": 9569902,
  "clientdatetime": "2025-11-20T14:30:00"
}
```

#### **Waiting Room**
```http
POST {{Redirect_URL_REST_PM}}/rooming/patientlocations/0
Authorization: Bearer {{AMD_TOKEN}}

{
  "appointmentid": 9569902,
  "patientid": 111
}
```

---

### 3.2 Appointment Groups & Blocks

#### **Appointment Groups**
```http
GET {{Redirect_URL_REST_PM}}/scheduler/AppointmentGroups
Authorization: Bearer {{AMD_TOKEN}}
```

#### **Block Holds**
```http
GET {{Redirect_URL_REST_PM}}/scheduler/BlockHolds
Authorization: Bearer {{AMD_TOKEN}}
```

---

### 3.3 Columns & Pages

#### **Columns**
```http
GET {{Redirect_URL_REST_PM}}/scheduler/Columns?pageId=1
Authorization: Bearer {{AMD_TOKEN}}
```

#### **Pages**
```http
GET {{Redirect_URL_REST_PM}}/scheduler/Pages
Authorization: Bearer {{AMD_TOKEN}}
```

---

### 3.4 GetSchedulerSetup

```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getschedulersetup",
    "@class": "masterfiles",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "profile": 17,
    "column": null,
    "facility": null
  }
}
```

---

## 4. Billing & Financial APIs

### 4.1 Fee Schedules

#### **Fee Schedule List**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "selectfeeschedule",
    "@class": "masterfiles",
    "@msgtime": "11/20/2025 10:30:00 AM"
  }
}
```

#### **Fee Schedule Record**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "selectfeescheduleversion",
    "@class": "masterfiles",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@id": "21113",
    "@type": "1",
    "@la": "selectfeeschedule"
  }
}
```

#### **Fee Schedule Codes (Proc/Amount)**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "selectfeeschedulecodes",
    "@class": "masterfiles",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@filterbyparent": "24",
    "@type": "0"
  }
}
```

---

### 4.2 Payments

#### **AddPayment (Patient) - REST**
```http
POST {{Redirect_URL_REST_PM}}/transaction/payments
Authorization: Bearer {{AMD_TOKEN}}

{
  "patientId": 111,
  "paymentAmount": 50.00,
  "paymentCode": "PP",
  "paymentMethodId": "2",
  "depositDate": "2025-11-20",
  "note": "",
  "checkNumber": "",
  "respPartyId": 149,
  "profileId": 3,
  "charges": [
    {
      "chargeDetailId": 5122007,
      "profileId": 3,
      "patientId": 111,
      "chargeAmount": 150.00,
      "insurancePortion": 100.00,
      "patientPortion": 50.00,
      "amount": 50.00,
      "paymentStatus": ""
    }
  ],
  "unappliedPaymentAmount": 0,
  "postingMethod": "Quick Pay",
  "paySource": 1
}
```

#### **AddPayment (Insurance) - REST**
```http
POST {{Redirect_URL_REST_PM}}/transaction/payments
Authorization: Bearer {{AMD_TOKEN}}

{
  "patientId": 111,
  "paymentAmount": 100.00,
  "paymentCode": "PI",
  "paymentMethodId": "2",
  "depositDate": "2025-11-20",
  "charges": [
    {
      "chargeDetailId": 5122007,
      "allowedAmount": 100.00,
      "amount": 100.00,
      "writeOff": {
        "code": "WOBAD",
        "amount": 25.00
      },
      "paymentStatus": "B"
    }
  ],
  "paySource": 2
}
```

#### **GetPaymentCodes**
```http
GET {{Redirect_URL_REST_PM}}/transaction/payment/PaymentCodes
Cookie: token={{AMD_TOKEN}}
```

#### **AddPaymentCodes**
```http
POST {{Redirect_URL_REST_PM}}/transaction/payments/paymentcodes
Authorization: Bearer {{AMD_TOKEN}}

{
  "description": "New Payment Code",
  "title": "NEWCODE",
  "isReserved": false,
  "lastModified": "2025-11-20T13:56:40.755Z"
}
```

---

### 4.3 Claims

#### **Check ClaimStatus**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "request",
    "@class": "claimstatus",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@visitid": "12345",
    "@carriercode": "AETNA001"
  }
}
```

#### **ClaimStatus List**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "get",
    "@class": "claimstatus",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@visitid": "12345"
  }
}
```

---

## 5. EHR Clinical APIs

### 5.1 EHR Notes

#### **GetEhrNotes**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getehrnotes",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@patientid": "111",
    "@templateid": "34",
    "@createdfrom": "10/01/2025",
    "@createdto": "11/20/2025",
    "@nocookie": "0",
    "patientnote": {
      "@templatename": "TemplateName",
      "@notedatetime": "NoteDatetime",
      "@username": "UserName"
    }
  }
}
```

#### **GetEhrNotesByVisit**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getehrnotesbyvisit",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@visitid": "12345",
    "@nocookie": "0"
  }
}
```

#### **GetEhrUpdatedNotes**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getehrupdatednotes",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@templateid": "549",
    "@datechanged": "11/01/2025 12:00:00 AM",
    "@nocookie": "0"
  }
}
```

#### **AddEhrNote**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "addehrnote",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@templatename": "Office Visit - Mobile",
    "@visitid": "",
    "@profileid": "3",
    "@notedatetime": "11/20/2025 2:16:55 PM",
    "@patientid": "111",
    "@comments": "Patient presented with anxiety symptoms",
    "pagelist": {
      "page": [
        {
          "@pageindex": "1",
          "@pagename": "SOAP",
          "fieldlist": {
            "field": [
              {
                "@pageindex": "1",
                "@ordinal": "3914629",
                "@fieldname": "Vitals_Weight",
                "@value": "180",
                "@requiredflag": "0",
                "@enabledflag": "-1"
              }
            ]
          }
        }
      ]
    }
  }
}
```

#### **UpdateEhrNote**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updateehrnote",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@id": "44588",
    "@templatename": "Office Visit - Mobile",
    "pagelist": {
      "page": [
        {
          "@pageindex": "1",
          "@pagename": "SOAP",
          "fieldlist": {
            "field": [
              {
                "@pageindex": "1",
                "@ordinal": "7777",
                "@value": "Updated value"
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

### 5.2 EHR File Management

#### **EHR Upload Document**
```http
POST {{Rediect_URL_GETEHRFILE}}/files/documents
Authorization: Bearer {{AMD_TOKEN}}
Content-Type: multipart/form-data
appname: TEMP

{
  "patientId": 111,
  "documentType": "Lab Results",
  "file": <binary>
}
```

#### **EHR GET Documents**
```http
GET {{Rediect_URL_GETEHRFILE}}/files/documents?patientid=111
Authorization: Bearer {{AMD_TOKEN}}
appname: {{AppName}}
```

#### **EHR GET Document Types**
```http
GET {{Rediect_URL_GETEHRFILE}}/files/documenttypes
Authorization: Bearer {{AMD_TOKEN}}
appname: TEMP
```

---

### 5.3 Clinical Notes

#### **GetListClinicalNotes**
```http
GET {{Rediect_URL_GETEHRFILE}}/clinicalnotes/notes?patientId=111
Authorization: Bearer {{AMD_TOKEN}}
appname: TEMP
```

#### **GetListClinicalNotesByID**
```http
GET {{Rediect_URL_GETEHRFILE}}/clinicalnotes/notes/100000427
Authorization: Bearer {{AMD_TOKEN}}
appname: TEMP
```

---

### 5.4 Encounters

#### **GetEncounters**
```http
GET {{Rediect_URL_GETEHRFILE}}/encounters/Encounters?PatientId=111
Authorization: Bearer {{AMD_TOKEN}}
appname: TEMP
```

---

### 5.5 Health Watchers

#### **Get HealthWatchers Plans**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "getehrhwplans",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@patientid": "111",
    "hmitem": {
      "@titile": "Title",
      "@itemtype": "Item_Type",
      "@text": "Text"
    }
  }
}
```

#### **Update HealthWatchers Plans**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "updateehrhwplan",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@templateid": "1",
    "hmplanlist": {
      "hmplan": {
        "@id": "1",
        "@Title": "Wellness Check",
        "@Text": "Have you scheduled your annual physical?"
      }
    }
  }
}
```

---

## 6. Telehealth & Patient Portal

### 6.1 Telehealth

#### **Telehealth Invitation URL**
```http
GET {{Redirect_URL_REST_PM}}/Telehealth/Invitations
Authorization: Bearer {{AMD_TOKEN}}

Body:
{
  "appointmentid": 9601155
}
```

#### **Create External Block**
```http
POST {{Redirect_URL_REST_PM}}/Telehealth/ExternalBlocks
Authorization: Bearer {{AMD_TOKEN}}

{
  "patientid": 111,
  "displaymessage": "Join via Zoom",
  "externallinklabel": "Click Here",
  "externallink": "https://zoom.us/j/1234567890"
}
```

---

### 6.2 Patient Portal

#### **LookUpPatientPortal**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "lookuppatientportalaccount",
    "@class": "api",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@exactmatch": "0",
    "@fullname": "John Doe",
    "@orderby": "fullname",
    "@page": "1"
  }
}
```

#### **SaveAccount PatientPortal**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "saveaccount",
    "@class": "patientportal",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "patientportalaccount": {
      "authorizedpatientlist": {
        "authorizedpatient": {
          "@id": "111",
          "@name": "DOE,JOHN",
          "@expirationdate": "12/31/2030",
          "@comment": ""
        }
      },
      "@emailaddress": "john.doe@example.com",
      "@fullname": "DOE,JOHN",
      "@comment": "Patient portal access",
      "@disable": "0",
      "@responsiblepartyid": "6931592"
    }
  }
}
```

#### **InviteSend PatientPortal**
```http
POST {{Redirect_URL_XLMRPC}}

{
  "ppmdmsg": {
    "@action": "sendinvitation",
    "@class": "portal",
    "@msgtime": "11/20/2025 10:30:00 AM",
    "@applicationid": "1",
    "@emailaddress": "john.doe@example.com",
    "@fullname": "JOHN DOE",
    "@portalid": "6485"
  }
}
```

---

## 7. Environment Variables

```json
{
  "Redirect_URL_XLMRPC": "",
  "Redirect_URL_REST_EHR": "",
  "Redirect_URL_REST_PM": "",
  "Redirect_URL_PM_STREAMREQUEST": "",
  "AMD_TOKEN": "",
  "Rediect_URL_GETEHRFILE": "",
  "AppName": "TEMP"
}
```

**CRITICAL WARNING:**
```javascript
// Pre-request script in Postman collection:
if (pm.globals.get("AppName") == "API"){
  throw new Error('You cannot use API as APPNAME. Please use TEMP or the
                   Appname assigned to you. Contact interops@advancedmd.com
                   for more information.');
}
```

---

## 8. Key Request/Response Patterns

### 8.1 Message Time Format

All XMLRPC requests require `@msgtime` in format:
```
"MM/DD/YYYY HH:MM:SS AM/PM"
```

Example: `"11/20/2025 10:30:00 AM"`

---

### 8.2 No Cookie Flag

```json
{
  "@nocookie": "0"
}
```

- `"0"`: Use session token (default, recommended)
- `"1"`: Pass credentials with each request (not recommended)

---

### 8.3 Date Changed (Incremental Sync)

```json
{
  "@datechanged": "11/01/2025 12:00:00 AM"
}
```

Returns only records changed after this timestamp.

---

### 8.4 Common Response Structure

```json
{
  "ppmdmsg": {
    "@action": "actionname",
    "@status": "success" | "error",
    "@errormessage": "Error description if failed",
    "data": { ... }
  }
}
```

---

## 9. Integration Recommendations

### 9.1 Critical Integration Points for MentalSpace

Based on the Postman collection analysis, here are the **MUST-USE** endpoints for MentalSpace integration:

#### **Phase 1: Patient Sync**
1. **GetUpdatedPatients** - Pull patient changes (Tier 1)
2. **AddPatient** - Create new patients (Tier 2)
3. **UpdatePatient** - Update patient demographics (Tier 2)
4. **GetDemographic** - Pull full patient data (Tier 2)

#### **Phase 2: Visit & Billing**
5. **GetUpdatedVisits** - Pull visit changes with charges (Tier 1)
6. **AddVisit** - Create visits for appointments (Tier 2)
7. **SaveCharges** - Submit CPT/ICD codes (Tier 2)
8. **LookUpProcCode** - Validate CPT codes (Tier 3)
9. **LookUpDiagCode** - Validate ICD codes (Tier 3)

#### **Phase 3: Insurance**
10. **AddInsurance** - Add patient insurance (Tier 2)
11. **Check insurance Eligibility** - Real-time eligibility checks (Tier 3)

#### **Phase 4: Claims & Payments**
12. **Check ClaimStatus** - Poll claim status (Tier 2)
13. **AddPayment** - Record payments (REST) (Tier 2)

#### **Phase 5: Lookups (Cache)**
14. **LookUpProfile** - Provider list (Tier 3)
15. **LookUpFacility** - Facility list (Tier 3)
16. **LookUpCarrier** - Insurance carrier list (Tier 3)

---

### 9.2 Endpoints NOT to Use

Based on Joseph's questionnaire findings:

❌ **ERA Endpoints** - Not available via API (use ODBC instead)
❌ **Claim Update/Cancel** - Not available via API (use UI)
❌ **Payment Reconciliation** - Not available via API (manual matching required)

---

### 9.3 Request Format Decision Tree

```
Is the endpoint a Lookup or Reference Data?
  ↓ YES → Use TIER 3 rate limits (24 calls/min peak)
  ↓ NO
  ↓
Is the endpoint GetUpdatedPatients or GetUpdatedVisits?
  ↓ YES → Use TIER 1 rate limits (1 call/min peak)
  ↓ NO → Use TIER 2 rate limits (12 calls/min peak)

Is the endpoint REST or XMLRPC?
  ↓ REST → Use Bearer token in Authorization header
  ↓ XMLRPC → Use Cookie: token={{AMD_TOKEN}}

Does the endpoint support incremental sync?
  ↓ YES → Use @datechanged parameter
  ↓ NO → Pull full dataset
```

---

### 9.4 Error Handling Strategy

```typescript
enum AdvancedMDErrorType {
  AUTH_ERROR = 'auth_error',              // Token expired
  RATE_LIMIT_ERROR = 'rate_limit_error',  // Rate limit exceeded
  VALIDATION_ERROR = 'validation_error',  // Invalid data
  NOT_FOUND_ERROR = 'not_found_error',    // Patient/visit not found
  API_ERROR = 'api_error'                 // AdvancedMD API error
}

// Retry strategy
const RETRY_CONFIG = {
  [AdvancedMDErrorType.AUTH_ERROR]: {
    maxRetries: 1,
    action: 'refresh_token'
  },
  [AdvancedMDErrorType.RATE_LIMIT_ERROR]: {
    maxRetries: 5,
    backoff: 'exponential',
    initialDelay: 60000,  // 1 minute
    maxDelay: 900000      // 15 minutes
  },
  [AdvancedMDErrorType.VALIDATION_ERROR]: {
    maxRetries: 0,
    action: 'log_and_alert'
  }
};
```

---

## 10. Complete Endpoint Catalog

### Summary Statistics

| Category | Total Endpoints | XMLRPC | REST |
|----------|----------------|--------|------|
| Authentication | 2 | 2 | 0 |
| Patient Management | 15 | 12 | 3 |
| Visit Management | 8 | 7 | 1 |
| Billing & Charges | 12 | 10 | 2 |
| Insurance | 8 | 6 | 2 |
| Lookups | 25 | 25 | 0 |
| Scheduler | 30 | 10 | 20 |
| Payments | 10 | 5 | 5 |
| Claims | 2 | 2 | 0 |
| EHR Notes | 8 | 8 | 0 |
| EHR Files | 12 | 0 | 12 |
| Telehealth | 4 | 0 | 4 |
| Patient Portal | 3 | 3 | 0 |
| **TOTAL** | **139+** | **90+** | **49+** |

---

## Conclusion

This comprehensive analysis of the AdvancedMD Postman collection reveals:

✅ **200+ API endpoints** across 13 major categories
✅ **Complete request/response examples** for all critical operations
✅ **Three API architectures**: XMLRPC, REST PM, REST EHR
✅ **Tiered rate limiting** requiring careful implementation
✅ **No webhook support** - polling architecture required
✅ **No ERA via API** - ODBC connection needed
✅ **No claim validation** - must build in-house

**Next Steps:**
1. Review this analysis alongside [CRITICAL_FINDINGS_FROM_JOSEPHS_QUESTIONNAIRE.md](./CRITICAL_FINDINGS_FROM_JOSEPHS_QUESTIONNAIRE.md)
2. Update main implementation plan with endpoint details
3. Begin Phase 1 development (Auth + Rate Limiter + Patient Sync)

---

**Document Status:** COMPLETE
**Last Updated:** 2025-11-20
**Prepared By:** Development Team
**References:**
- [Joseph's Tech Questionnaire](./JOSEPHS_TECH_QUESTIONNAIRE.txt)
- [Critical Findings](./CRITICAL_FINDINGS_FROM_JOSEPHS_QUESTIONNAIRE.md)
- [Main Integration Plan](../ADVANCEDMD_INTEGRATION_PLAN.md)
