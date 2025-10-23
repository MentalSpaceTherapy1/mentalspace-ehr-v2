#!/usr/bin/env python3
"""
Integrate FormSubmissionViewer into PortalTab.tsx

This script:
1. Adds import for FormSubmissionViewer
2. Adds state for viewing submissions
3. Updates the "View Submission" button to open the viewer
4. Adds the FormSubmissionViewer component with modal
"""

import re

file_path = r'packages\frontend\src\components\ClientPortal\PortalTab.tsx'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add import for FormSubmissionViewer after existing imports
import_pattern = r"(import \* as portalApi from '../../lib/portalApi';)"
import_replacement = r"\1\nimport FormSubmissionViewer from './FormSubmissionViewer';"

if "import FormSubmissionViewer" not in content:
    content = re.sub(import_pattern, import_replacement, content)
    print("[+] Added FormSubmissionViewer import")
else:
    print("[-] FormSubmissionViewer import already exists")

# Step 2: Add state for viewing submissions after document sharing state
state_pattern = r"(const \[uploadedFile, setUploadedFile\] = useState<File \| null>\(null\);)"
state_addition = r"""\1

  // Form submission viewer state
  const [viewingSubmission, setViewingSubmission] = useState<{ clientId: string; assignmentId: string } | null>(null);"""

if "viewingSubmission" not in content:
    content = re.sub(state_pattern, state_addition, content)
    print("[+] Added viewingSubmission state")
else:
    print("[-] viewingSubmission state already exists")

# Step 3: Replace the "View Submission" button onClick handler
button_pattern = r"""(\{assignment\.status === 'COMPLETED' && \(
                        <button
                          onClick=\{\(\) => \{
                            // View submission logic
                            toast\('View submission feature coming soon!', \{
                              duration: 3000,
                              position: 'top-center',
                              icon: 'ℹ️',
                            \}\);
                          \}\})"""

button_replacement = r"""{assignment.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setViewingSubmission({
                              clientId: clientId,
                              assignmentId: assignment.id,
                            });
                          }}"""

if "setViewingSubmission" not in content or "View submission feature coming soon" in content:
    content = re.sub(
        r'\{assignment\.status === \'COMPLETED\' && \(\s+<button\s+onClick=\{\(\) => \{\s+// View submission logic\s+toast\(\'View submission feature coming soon!\',.*?\}\);\s+\}\}',
        r"""{assignment.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setViewingSubmission({
                              clientId: clientId,
                              assignmentId: assignment.id,
                            });
                          }}""",
        content,
        flags=re.DOTALL
    )
    print("[+] Updated View Submission button onClick handler")
else:
    print("[-] View Submission button already updated")

# Step 4: Add FormSubmissionViewer component before the closing </div> of the main return
# Find the last closing tag before the function ends
viewer_component = """
      {/* Form Submission Viewer Modal */}
      {viewingSubmission && (
        <FormSubmissionViewer
          clientId={viewingSubmission.clientId}
          assignmentId={viewingSubmission.assignmentId}
          onClose={() => setViewingSubmission(null)}
        />
      )}
    </div>
  );
}"""

# Replace the final closing tags
final_pattern = r"(\s+</div>\s+</div>\s+\);\s+\})"
if "FormSubmissionViewer" not in content or "viewingSubmission &&" not in content:
    content = re.sub(final_pattern, viewer_component, content)
    print("[+] Added FormSubmissionViewer component to render")
else:
    print("[-] FormSubmissionViewer component already in render")

# Write the modified content back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Integration complete!")
print(f"[SUCCESS] Updated: {file_path}")
print("\nChanges made:")
print("  1. Added FormSubmissionViewer import")
print("  2. Added viewingSubmission state variable")
print("  3. Updated 'View Submission' button to open viewer")
print("  4. Added FormSubmissionViewer modal component to render")
