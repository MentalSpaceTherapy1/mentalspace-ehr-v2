#!/usr/bin/env python3
import re

schema_file = 'packages/database/prisma/schema.prisma'

with open(schema_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the IntakeFormSubmission model and add e-signature fields
pattern = r'(  reviewerNotes  String\?\n\n)(  ipAddress  String\?)'

replacement = r'''\1  // E-Signature fields
  signatureData  String? // Base64 encoded signature image (canvas drawing)
  signedByName   String? // Full name entered by client
  signedDate     DateTime?
  signatureIpAddress String? // IP address at time of signature
  consentAgreed  Boolean @default(false) // Client agreed to e-signature consent

\2'''

new_content = re.sub(pattern, replacement, content)

with open(schema_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ E-signature fields added to IntakeFormSubmission model")
