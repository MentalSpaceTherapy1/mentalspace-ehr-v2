#!/usr/bin/env python3
import re

file_path = 'packages/frontend/src/pages/Portal/PortalFormViewer.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add import at the top
if 'ESignatureSection' not in content:
    content = content.replace(
        "import { toast } from 'react-hot-toast';",
        "import { toast } from 'react-hot-toast';\nimport { ESignatureSection } from '../../components/ClientPortal/ESignatureSection';"
    )
    print("Added ESignatureSection import")
else:
    print("ESignatureSection import already exists")

# Step 2: Add state variables after existing useState declarations
if 'signatureData' not in content:
    # Find the line with isSubmitting state
    pattern = r'(const \[isSubmitting, setIsSubmitting\] = useState<boolean>\(false\);)'
    replacement = r'''\1

  // E-Signature state
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signedByName, setSignedByName] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);'''

    content = re.sub(pattern, replacement, content)
    print("Added e-signature state variables")
else:
    print("E-signature state variables already exist")

# Step 3: Update handleSubmit to include signature data and validation
if 'signatureData' not in content or 'consentAgreed' not in content:
    # Find the handleSubmit function and add signature validation
    old_submit = r'''try \{
      setIsSubmitting\(true\);
      await api\.post\(`/portal/forms/\$\{formId\}/submit`, \{
        assignmentId,
        responses,
      \}\);'''

    new_submit = '''// Validate e-signature
    if (!consentAgreed) {
      toast.error('Please agree to the e-signature consent before submitting');
      return;
    }

    if (!signedByName.trim()) {
      toast.error('Please enter your full name for the signature');
      return;
    }

    if (!signatureData) {
      toast.error('Please provide your signature before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/portal/forms/${formId}/submit`, {
        assignmentId,
        responses,
        signatureData,
        signedByName,
        consentAgreed,
      });'''

    content = re.sub(old_submit, new_submit, content)
    print("Updated handleSubmit with e-signature validation and data")
else:
    print("handleSubmit already updated")

# Step 4: Add ESignatureSection component before submit buttons
if '<ESignatureSection' not in content:
    # Find the submit buttons section
    pattern = r'(\{formFields\.map\(\(field\) => \(\s+<div key=\{field\.id\}>\s+\{renderField\(field\)\}\s+</div>\s+\)\)\})\s+\n\s+(<!-- Submit Buttons -->|{/\* Submit Buttons \*/})'

    replacement = r'''\1

          {/* E-Signature Section */}
          <div className="mt-8 pt-8 border-t-2 border-gray-300">
            <ESignatureSection
              signatureData={signatureData}
              signedByName={signedByName}
              consentAgreed={consentAgreed}
              onSignatureChange={setSignatureData}
              onNameChange={setSignedByName}
              onConsentChange={setConsentAgreed}
              required={true}
            />
          </div>

          \2'''

    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    print("Added ESignatureSection component")
else:
    print("ESignatureSection component already exists")

# Write back the modified content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nIntegration complete!")
