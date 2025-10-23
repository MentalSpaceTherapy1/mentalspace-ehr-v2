#!/usr/bin/env python3
"""
Integrate TransferDataButton into FormSubmissionViewer.tsx

This script:
1. Adds imports for transfer functionality
2. Adds state for current client data
3. Detects if form is transferable
4. Shows transfer button when applicable
5. Fetches current data for comparison
"""

import re

file_path = r'packages\frontend\src\components\ClientPortal\FormSubmissionViewer.tsx'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add imports at the top
imports_to_add = """import { getTransferConfig, isTransferableForm } from '../../config/formFieldMappings';
import TransferDataButton from '../Forms/TransferDataButton';
import api from '../../lib/api';"""

import_pattern = r"(import \{ SignatureDisplay \} from '../Forms/SignatureDisplay';)"
if "getTransferConfig" not in content:
    content = re.sub(import_pattern, r"\1\n" + imports_to_add, content)
    print("[+] Added transfer-related imports")
else:
    print("[-] Transfer imports already exist")

# Step 2: Add state variables for transfer functionality
state_pattern = r"(const \[isReviewing, setIsReviewing\] = useState\(false\);)"
state_additions = r"""\1
  const [currentClientData, setCurrentClientData] = useState<any>(null);
  const [loadingClientData, setLoadingClientData] = useState(false);"""

if "currentClientData" not in content:
    content = re.sub(state_pattern, state_additions, content)
    print("[+] Added state variables for client data")
else:
    print("[-] Client data state already exists")

# Step 3: Add function to fetch current client data for comparison
fetch_function = '''
  // Fetch current client data for comparison (when form is transferable)
  const fetchCurrentClientData = async () => {
    if (!submission) return;

    const config = getTransferConfig(submission.form.name);
    if (!config) return;

    try {
      setLoadingClientData(true);

      if (config.targetModel === 'Client') {
        // Fetch client demographics
        const response = await api.get(`/clients/${clientId}`);
        setCurrentClientData(response.data.data);
      } else if (config.targetModel === 'ClinicalIntake') {
        // Fetch clinical intake assessments (get most recent draft or create new)
        const response = await api.get(`/clients/${clientId}/assessments`);
        const assessments = response.data.data || [];
        const draftIntake = assessments.find((a: any) => a.status === 'Draft');
        setCurrentClientData(draftIntake || {});
      }
    } catch (error) {
      console.error('Error fetching current data:', error);
      setCurrentClientData({});
    } finally {
      setLoadingClientData(false);
    }
  };

  // Fetch client data when submission loads
  useEffect(() => {
    if (submission && isTransferableForm(submission.form.name)) {
      fetchCurrentClientData();
    }
  }, [submission]);
'''

# Find the loadSubmission function and add fetchCurrentClientData after it
load_submission_pattern = r"(const loadSubmission = async \(\) => \{[^}]+\};\s+\};)"
if "fetchCurrentClientData" not in content:
    content = re.sub(load_submission_pattern, r"\1" + fetch_function, content, flags=re.DOTALL)
    print("[+] Added fetchCurrentClientData function")
else:
    print("[-] fetchCurrentClientData already exists")

# Step 4: Add transfer button section right after Assignment Information section
transfer_button_section = '''
          {/* Data Transfer Section */}
          {submission && isTransferableForm(submission.form.name) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Quick Data Transfer Available
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    {getTransferConfig(submission.form.name)?.targetModel === 'Client'
                      ? 'Transfer client-submitted information directly to their demographics record. Review and select which fields to transfer.'
                      : 'Transfer client history directly to a new or existing clinical intake assessment. Save time by auto-populating client-provided information.'}
                  </p>
                  {loadingClientData ? (
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Loading current data for comparison...
                    </div>
                  ) : currentClientData ? (
                    <TransferDataButton
                      clientId={clientId}
                      assignmentId={assignmentId}
                      submissionData={submission.submission.responsesJson}
                      currentData={currentClientData}
                      config={getTransferConfig(submission.form.name)!}
                      onTransferComplete={(data) => {
                        toast.success('Data transferred successfully!');
                        // Optionally refresh or navigate
                      }}
                    />
                  ) : (
                    <div className="text-sm text-yellow-700">
                      Unable to load current data for comparison
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

'''

# Add transfer section after the messageFromAssigner div closes
message_pattern = r"(              \{submission\.assignment\.messageFromAssigner && \(\s+<div[^>]+>\s+<label[^>]+>Message from Assigner:<\/label>\s+<p[^>]+>\s+\{submission\.assignment\.messageFromAssigner\}\s+<\/p>\s+<\/div>\s+\)\}\s+<\/div>\s+<\/div>\s+<\/div>)"

if "Quick Data Transfer Available" not in content:
    content = re.sub(message_pattern, r"\1\n" + transfer_button_section, content, flags=re.DOTALL)
    print("[+] Added transfer button section")
else:
    print("[-] Transfer button section already exists")

# Write the modified content back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Integration complete!")
print(f"[SUCCESS] Updated: {file_path}")
print("\nChanges made:")
print("  1. Added transfer-related imports")
print("  2. Added state for current client data")
print("  3. Added fetchCurrentClientData function")
print("  4. Added transfer button section in UI")
print("  5. Auto-detects transferable forms and shows transfer option")
