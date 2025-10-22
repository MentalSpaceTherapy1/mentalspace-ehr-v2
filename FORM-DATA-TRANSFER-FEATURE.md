# Form Data Transfer Feature - Complete Guide

## Overview

The Form Data Transfer feature allows staff to automatically transfer client-submitted form data from the portal directly into EHR records with a single click. This eliminates duplicate data entry, reduces errors, and streamlines the intake workflow.

**Status**: ✅ FULLY IMPLEMENTED - Ready for Testing
**Version**: 1.0.0
**Date**: October 22, 2025
**Git Commit**: `a70e462`

---

## What It Does

Instead of manually re-typing information that clients already provided in portal forms, staff can:

1. View the client's submitted form
2. See a side-by-side comparison with current EHR data
3. Select which fields to transfer
4. Review conflicts where values differ
5. Click one button to transfer the data

**Supported Transfers:**
- **Client Information Form** → Client Demographics
- **Client History Form** → Clinical Intake Assessment

---

## User Guide for Staff

### How to Transfer Client Information to Demographics

**Step 1: Access the Submitted Form**
1. Navigate to: **Clients** → **Select Client** → **Client Detail Page**
2. Click on the **"Portal"** tab
3. Scroll to **"Assigned Forms"** section
4. Find "Client Information Form" with status **"COMPLETED"**
5. Click the **"View Submission"** button

**Step 2: Review the Transfer Option**
- At the top of the submission viewer, you'll see a green section titled **"Quick Data Transfer Available"**
- This section explains what will be transferred
- If you see a loading spinner, wait for the current demographics data to load

**Step 3: Open the Transfer Modal**
- Click the **"Transfer to Demographics"** button
- A large modal window opens showing side-by-side comparison

**Step 4: Review the Data Comparison**

The modal shows:
- **Left Column**: Client's submitted data
- **Right Column**: Current demographics data

Color coding:
- 🟨 **Yellow**: Conflict (values differ) - Review carefully!
- 🟦 **Blue**: New data (field currently empty)
- 🟩 **Green**: Match (values are the same)
- ⬜ **Gray**: No data submitted by client

At the top, you'll see statistics:
- Total fields available
- Number of conflicts
- Number of new data fields
- Number of matching fields
- Number of fields selected

**Step 5: Select Fields to Transfer**

You have several options:

**Individual Selection:**
- Check/uncheck boxes next to each field
- Only fields with submitted data can be selected

**Bulk Actions:**
- **Select All**: Select all fields with client data
- **Deselect All**: Unselect all fields
- **Select Conflicts**: Select only fields with conflicts
- **Select New Data**: Select only fields that are currently empty

**Step 6: Handle Conflicts**

If there are conflicts (yellow rows):
- Review the "Current Demographics Data" column carefully
- Decide if you want to overwrite with the client's new data
- Uncheck the field if you want to keep the existing value
- **Warning**: Transferring a conflicting field will overwrite the existing value

**Step 7: Confirm Transfer**
1. Click **"Continue"** button at the bottom
2. Confirmation screen appears showing:
   - Number of fields to be transferred
   - List of all selected fields
   - Warning about overwriting existing data
3. Review the summary carefully
4. Click **"Back"** if you want to change your selection
5. Click **"Confirm Transfer"** to proceed

**Step 8: Transfer Complete**
- Success message appears: "Client information transferred successfully to demographics"
- Modal closes automatically
- Data is now in the client's demographics record
- You can navigate to the **Demographics** tab to verify

---

### How to Transfer Client History to Intake Assessment

**Step 1: Access the Submitted Form**
1. Navigate to: **Clients** → **Select Client** → **Client Detail Page**
2. Click on the **"Portal"** tab
3. Scroll to **"Assigned Forms"** section
4. Find "Client History Form" with status **"COMPLETED"**
5. Click the **"View Submission"** button

**Step 2: Review the Transfer Option**
- At the top, you'll see **"Quick Data Transfer Available"**
- Message states: "Transfer client history directly to a new or existing clinical intake assessment"

**Step 3: Open the Transfer Modal**
- Click the **"Transfer to Intake Form"** button
- Modal opens with side-by-side comparison

**Step 4: Select Fields to Transfer**
- Same process as demographics transfer
- Review conflicts carefully
- Use bulk actions to speed up selection

**Clinician-Only Fields:**
The transfer will populate client-provided information such as:
- Chief complaint and symptoms
- Previous treatment history
- Medical history
- Family history
- Substance use
- Social history
- Client-stated goals

The clinician-only sections remain empty for you to complete:
- Clinical assessment
- Mental status exam
- Diagnosis
- Treatment plan
- Risk assessment
- Clinical impressions

**Step 5: Choose Transfer Target**

The system will:
- Look for existing **Draft** intake assessments
- If found: Transfer will **update** the existing draft
- If not found: Transfer will **create new** intake assessment

**Step 6: Confirm and Transfer**
- Click **"Continue"**
- Review summary
- Click **"Confirm Transfer"**
- Success message appears
- Navigate to **Assessments** tab to complete the intake

---

## Benefits

### Time Savings
- **Before**: Staff manually re-type 25+ demographic fields ≈ 10-15 minutes
- **After**: Review and transfer with 3 clicks ≈ 1-2 minutes
- **Savings**: 8-13 minutes per client

### Error Reduction
- No transcription errors
- Data comes directly from client
- Reduces typos and misread handwriting

### Data Accuracy
- Client provides their own information
- Client reviews and verifies before submission
- More accurate than staff interpretation

### Workflow Efficiency
- Staff focus on clinical work, not data entry
- Streamlined intake process
- Faster client onboarding

### Transparency & Control
- Staff see exactly what will be transferred
- Can review conflicts before overwriting
- Full control over which fields to transfer
- Complete audit trail

---

## Field Mappings

### Client Information Form → Demographics

**Personal Information:**
- First Name, Middle Name, Last Name
- Preferred Name
- Date of Birth
- Gender
- Pronouns
- Social Security Number

**Contact Information:**
- Email Address
- Primary Phone
- Alternate Phone
- Street Address
- Address Line 2
- City, State, ZIP Code

**Emergency Contact:**
- Emergency Contact Name
- Emergency Contact Relationship
- Emergency Contact Phone

**Insurance Information:**
- Insurance Provider
- Insurance Member ID
- Insurance Group Number
- Insurance Policy Holder

**Additional Information:**
- Marital Status
- Occupation
- Employer
- Referral Source

**Total**: 25+ fields mapped

---

### Client History Form → Clinical Intake

**Presenting Problem:**
- Chief Complaint
- Current Symptoms
- Symptom Onset
- Symptom Severity (client-rated)

**Mental Health History:**
- Previous Mental Health Treatment
- Previous Therapists/Providers
- Previous Psychiatric Medications
- Current Medications (all)
- Psychiatric Hospitalizations
- Suicide Attempt History
- Self-Harm History

**Medical History:**
- Current Medical Conditions
- Allergies (medication and other)
- Current Medical Providers
- Surgical History

**Family History:**
- Family Mental Health History
- Family Medical History
- Family Substance Abuse History

**Substance Use:**
- Alcohol Use
- Drug Use
- Tobacco Use
- Substance Abuse Treatment History

**Trauma History:**
- Trauma History
- Abuse History (physical/sexual/emotional)

**Social History:**
- Current Living Situation
- Relationship Status
- Social Support System
- Employment Status
- Financial Stressors
- Legal Issues

**Cultural/Spiritual:**
- Cultural Background
- Religious/Spiritual Beliefs
- Cultural Factors Affecting Treatment

**Treatment Goals (Client-Stated):**
- Client-Stated Treatment Goals
- Treatment Expectations
- What Has Been Helpful Previously
- What Did Not Help Previously

**Strengths & Resources:**
- Client Strengths and Resources
- Hobbies and Interests
- Current Coping Strategies

**Total**: 40+ fields mapped

---

## Technical Details

### Data Transformation

The system automatically transforms data as needed:

**Phone Numbers:**
- Strips formatting (parentheses, dashes, spaces)
- Stores as digits only
- Example: "(555) 123-4567" → "5551234567"

**Social Security Numbers:**
- Strips formatting (dashes)
- Stores as digits only
- Example: "123-45-6789" → "123456789"

**Dates:**
- Converts to ISO format
- Handles various input formats
- Stores as proper DateTime

**Email:**
- Validates format
- Ensures proper structure

**Arrays:**
- Handles multi-value fields
- Converts single values to arrays where needed

### Conflict Detection

The system compares values using JSON serialization:
- `JSON.stringify(value1) !== JSON.stringify(value2)`
- Detects differences in strings, numbers, arrays, objects
- Handles null/undefined/empty values appropriately

### Audit Trail

Every transfer is logged with:
- User ID (who performed the transfer)
- Timestamp
- Form submission ID (source)
- Client ID (target)
- List of fields transferred
- Changed fields with old and new values
- All logged to backend console

Future enhancement: Activity log table in database

---

## Security & Permissions

### Required Permissions:
- User must be authenticated
- User must have role: ADMINISTRATOR, SUPERVISOR, or CLINICIAN
- User must have access to the specific client
- All existing access controls apply

### Data Protection:
- All transfers happen server-side
- API validates form type before transfer
- Cannot transfer arbitrary data
- Maintains data integrity with transactions

### Audit & Compliance:
- Complete audit trail of all transfers
- Tracks who, what, when
- Records overwritten values
- Maintains HIPAA compliance

---

## Troubleshooting

### Transfer Button Not Showing

**Possible Causes:**
- Form is not a supported type (must be "Client Information Form" or "Client History Form")
- Integration not deployed

**Solution:**
- Verify form name matches exactly
- Check browser console for errors
- Ensure frontend code is deployed

### Loading Current Data Indefinitely

**Possible Causes:**
- API endpoint not responding
- Network issue
- Permission problem

**Solution:**
- Check browser network tab for API errors
- Verify user has access to client
- Check backend logs for errors

### "Unable to Load Current Data"

**Possible Causes:**
- Client record not found
- API error
- Backend issue

**Solution:**
- Verify client exists in database
- Check backend logs
- Try refreshing the page

### Transfer Fails with Error

**Possible Causes:**
- Validation error
- Database error
- Permission denied

**Solution:**
- Check error message in toast notification
- Review browser console for details
- Check backend logs
- Verify all required fields are selected
- Ensure no data integrity issues

### Transferred Data Not Appearing

**Possible Causes:**
- Transfer actually failed (check for error message)
- Wrong field mapping
- Data in different field than expected

**Solution:**
- Navigate to Demographics/Assessments tab
- Refresh the page
- Check API response in network tab
- Verify field mappings in formFieldMappings.ts

### Conflicts Not Detected

**Possible Causes:**
- Values are actually the same (case-sensitive)
- Data type mismatch
- Null vs empty string

**Solution:**
- Review the exact values in both columns
- Check data types match
- This is expected behavior for matching data

---

## Best Practices

### When to Use Transfer

✅ **DO use transfer when:**
- Client has filled out a complete form
- Most data is new (client is truly new)
- You've reviewed the submission for accuracy
- Client data looks correct and complete
- Saving time is important

❌ **DON'T use transfer when:**
- Client data looks suspicious or incorrect
- Form appears to be spam/test submission
- You need to verify information first
- Current demographics data is known to be correct
- Only a few fields need updating (faster to type manually)

### Handling Conflicts

**Best Approach:**
1. Review WHY the conflict exists
2. Consider which value is more recent/accurate
3. When in doubt, keep the existing value
4. Transfer new values only when confident
5. Make note in client record if changing important data

**Common Conflict Scenarios:**

**Phone Number Changed:**
- Likely the client's new number is correct
- Transfer the new value

**Address Changed:**
- Client may have moved
- Transfer if makes sense

**DOB Differs:**
- ⚠️ **STOP** - This is a red flag
- Do NOT transfer automatically
- Verify with client directly
- May indicate wrong client record

**Name Spelling Differs:**
- Client may have corrected a previous error
- Or may have typed incorrectly
- Verify which is correct before transferring

### Field Selection Strategy

**For New Clients:**
- Use "Select All" or "Select New Data"
- Review conflicts quickly
- Transfer most/all fields

**For Existing Clients:**
- Use "Select Conflicts" to focus on changes
- Review what changed and why
- Be selective about what to transfer

**For Updates:**
- Select only the fields that client is updating
- Leave other fields unchecked
- Focus on what's new

---

## FAQs

**Q: Can I undo a transfer?**
A: Not automatically. You would need to manually edit the demographics/intake to restore previous values. The audit trail shows what was overwritten, so you can reference the old values.

**Q: What happens to fields I don't select?**
A: They remain unchanged. Only selected fields are transferred.

**Q: Can I transfer the same form twice?**
A: Yes, you can open the transfer modal as many times as needed. Each transfer will overwrite with the current form submission data.

**Q: Will this create duplicate intake assessments?**
A: No. For intake transfers, the system looks for an existing Draft assessment and updates it. Only if no draft exists will it create a new one.

**Q: What if the client submits a new form with updated information?**
A: You can transfer again. The newer submission will overwrite the previous data.

**Q: Can clients see when their data was transferred?**
A: No, this is a staff-only feature. Clients only see their form submission.

**Q: Does transfer work for all forms?**
A: Currently only "Client Information Form" and "Client History Form" are supported. Other forms can be added by creating field mappings.

**Q: What if a required field is empty in the form?**
A: The transfer will skip that field. You'll need to fill it manually in demographics/intake.

**Q: Can I edit data after transfer?**
A: Yes! Transfer just populates the fields. You can edit any field normally afterward.

**Q: What if transfer fails halfway through?**
A: Transfers are atomic - either all selected fields transfer or none do. There's no partial transfer.

---

## Adding New Form Transfers

To add support for additional forms, you need to:

**1. Create Field Mapping**

Edit: `packages/frontend/src/config/formFieldMappings.ts`

```typescript
export const NEW_FORM_TO_TARGET: FormTransferConfig = {
  formName: 'Your Form Name', // Must match exactly
  targetModel: 'Client' | 'ClinicalIntake',
  transferEndpoint: '/clients/:clientId/forms/:assignmentId/transfer-to-target',
  buttonText: 'Transfer to Target',
  successMessage: 'Data transferred successfully',
  fieldMappings: [
    {
      sourceField: 'form_field_id',
      targetField: 'database_field_name',
      label: 'Display Label',
      dataType: 'string',
      required: false,
      transform: (value) => value, // Optional
      validate: (value) => true, // Optional
    },
    // ... more mappings
  ],
};
```

**2. Add to Configuration Array**

In the same file, add your config to the `getTransferConfig` function:

```typescript
export function getTransferConfig(formName: string): FormTransferConfig | null {
  const configs = [
    CLIENT_INFO_TO_DEMOGRAPHICS,
    CLIENT_HISTORY_TO_INTAKE,
    NEW_FORM_TO_TARGET, // Add here
  ];
  return configs.find(config => config.formName === formName) || null;
}
```

**3. Create Backend Endpoint (if new target model)**

If transferring to a new model (not Client or ClinicalIntake):

Edit: `packages/backend/src/controllers/clientForms.controller.ts`

Create a new transfer function following the pattern of `transferToDemographics` or `transferToIntake`.

**4. Add Route**

Edit: `packages/backend/src/routes/clientForms.routes.ts`

```typescript
router.post('/:clientId/forms/:assignmentId/transfer-to-target', clientFormsController.transferToTarget);
```

**5. Test**
- Create the form in the system
- Assign to a test client
- Fill out in portal
- Submit
- View in EHR
- Verify transfer button appears
- Test the transfer workflow
- Verify data populates correctly

---

## Future Enhancements

Potential improvements for future versions:

1. **Transfer History**
   - View log of all past transfers
   - See who transferred what and when
   - Revert to previous values

2. **Scheduled/Automatic Transfer**
   - Auto-transfer on form submission
   - Configurable per-form
   - Still creates audit trail

3. **Partial Field Editing**
   - Edit values in transfer modal before transferring
   - Fix typos without editing form submission
   - Transform data on-the-fly

4. **Transfer Templates**
   - Save common field selections
   - Quick apply for similar clients
   - Organization-wide defaults

5. **Conflict Resolution Rules**
   - Auto-resolve certain conflicts
   - Configurable precedence rules
   - Smart merge for arrays

6. **Multi-Form Transfer**
   - Transfer from multiple forms at once
   - Aggregate data from various sources
   - One unified comparison view

7. **Transfer Analytics**
   - Track time saved
   - Measure adoption rates
   - Identify common conflicts

8. **Mobile Optimization**
   - Responsive transfer modal
   - Touch-friendly field selection
   - Simplified mobile workflow

---

## Support & Feedback

### Getting Help

**For Technical Issues:**
1. Check this documentation
2. Review troubleshooting section
3. Check browser console for errors
4. Review backend logs
5. Contact IT support

**For Training:**
- Review this guide
- Watch demo video (if available)
- Practice with test client
- Ask supervisor for guidance

**For Feature Requests:**
- Submit via feedback channel
- Discuss with product team
- Describe use case clearly

### Reporting Issues

When reporting problems, include:
- What you were trying to do
- Which form you were transferring
- What error message appeared (exact text)
- Screenshot of the issue
- Browser and version
- Client ID (if safe to share)

---

## Conclusion

The Form Data Transfer feature significantly improves efficiency in the client intake process by eliminating duplicate data entry. By reviewing this guide and following best practices, staff can save time while maintaining data accuracy and integrity.

**Key Takeaways:**
- ✅ Review the side-by-side comparison carefully
- ✅ Pay special attention to conflicts (yellow rows)
- ✅ Use bulk actions to speed up selection
- ✅ Verify transferred data in Demographics/Assessments
- ✅ When in doubt, don't transfer - verify first

**Questions?** Contact your system administrator or refer to this guide.

---

**Document Version**: 1.0.0
**Last Updated**: October 22, 2025
**Author**: MentalSpace EHR Development Team
**Status**: Published - Ready for Use
