#!/usr/bin/env python3
import re

file_path = 'packages/backend/src/controllers/portal/documents.controller.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the submitForm function
old_pattern = r'''export const submitForm = async \(req: Request, res: Response\) => \{
  try \{
    const \{ formId \} = req\.params;
    const \{ assignmentId, responses, signature \} = req\.body;
    const clientId = \(req as any\)\.portalAccount\?\.clientId;

    if \(!clientId\) \{
      return res\.status\(401\)\.json\(\{
        success: false,
        message: 'Unauthorized',
      \}\);
    \}

    // Verify assignment
    const assignment = await prisma\.formAssignment\.findFirst\(\{
      where: \{
        id: assignmentId,
        formId,
        clientId,
      \},
    \}\);

    if \(!assignment\) \{
      return res\.status\(404\)\.json\(\{
        success: false,
        message: 'Form assignment not found',
      \}\);
    \}

    // Create submission
    const submission = await prisma\.intakeFormSubmission\.create\(\{
      data: \{
        formId,
        clientId,
        responsesJson: responses,
        status: 'Submitted',
        submittedDate: new Date\(\),
      \},
    \}\);

    // Update assignment status
    await prisma\.formAssignment\.update\(\{
      where: \{ id: assignmentId \},
      data: \{
        status: 'COMPLETED',
        completedAt: new Date\(\),
      \},
    \}\);

    // Create signature record if provided
    if \(signature\) \{
      await prisma\.documentSignature\.create\(\{
        data: \{
          documentId: submission\.id,
          signedBy: clientId,
          signatureImageS3: signature, // In real implementation, upload to S3 first
          signedAt: new Date\(\),
          ipAddress: req\.ip \|\| '',
          userAgent: req\.get\('user-agent'\) \|\| '',
          signatureType: 'ELECTRONIC',
        \},
      \}\);
    \}

    logger\.info\(`Client \$\{clientId\} submitted form \$\{formId\}`\);

    return res\.status\(200\)\.json\(\{
      success: true,
      message: 'Form submitted successfully',
      data: submission,
    \}\);
  \} catch \(error\) \{
    logger\.error\('Error submitting form:', error\);
    return res\.status\(500\)\.json\(\{
      success: false,
      message: 'Failed to submit form',
    \}\);
  \}
\};'''

new_function = '''export const submitForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const {
      assignmentId,
      responses,
      signatureData,
      signedByName,
      consentAgreed
    } = req.body;
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify assignment
    const assignment = await prisma.formAssignment.findFirst({
      where: {
        id: assignmentId,
        formId,
        clientId,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Form assignment not found',
      });
    }

    // Validate e-signature if provided
    if (signatureData || signedByName) {
      // If any signature field is provided, all required fields must be present
      if (!signatureData) {
        return res.status(400).json({
          success: false,
          message: 'Signature image is required when submitting with e-signature',
        });
      }

      if (!signedByName || signedByName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Signed name is required when submitting with e-signature',
        });
      }

      if (!consentAgreed) {
        return res.status(400).json({
          success: false,
          message: 'You must agree to the e-signature consent to submit',
        });
      }
    }

    // Get client's IP address for audit trail
    const ipAddress = req.ip ||
                     req.headers['x-forwarded-for'] as string ||
                     req.socket.remoteAddress ||
                     'unknown';

    // Create submission with e-signature data
    const submission = await prisma.intakeFormSubmission.create({
      data: {
        formId,
        clientId,
        responsesJson: responses,
        status: 'Submitted',
        submittedDate: new Date(),
        // E-signature fields
        signatureData: signatureData || null,
        signedByName: signedByName ? signedByName.trim() : null,
        signedDate: signatureData ? new Date() : null,
        signatureIpAddress: signatureData ? ipAddress : null,
        consentAgreed: consentAgreed || false,
        // Audit fields
        ipAddress: ipAddress,
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    // Update assignment status
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        submissionId: submission.id,
      },
    });

    logger.info(`Client ${clientId} submitted form ${formId}`, {
      submissionId: submission.id,
      hasSignature: !!signatureData,
      signedByName: signedByName || 'N/A',
    });

    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      data: submission,
    });
  } catch (error) {
    logger.error('Error submitting form:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit form',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};'''

new_content = re.sub(old_pattern, new_function, content, flags=re.DOTALL)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Backend API updated successfully")
else:
    print("No changes made - pattern not found")
