import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import IntakeAssessmentForm from './Forms/IntakeAssessmentForm';
import ProgressNoteForm from './Forms/ProgressNoteForm';
import TreatmentPlanForm from './Forms/TreatmentPlanForm';
import CancellationNoteForm from './Forms/CancellationNoteForm';
import ConsultationNoteForm from './Forms/ConsultationNoteForm';
import ContactNoteForm from './Forms/ContactNoteForm';
import TerminationNoteForm from './Forms/TerminationNoteForm';
import MiscellaneousNoteForm from './Forms/MiscellaneousNoteForm';
import RevisionBanner from '../../components/ClinicalNotes/RevisionBanner';

export default function EditNoteRouter() {
  const { clientId, noteId } = useParams();

  // Fetch note to determine type
  const { data: noteData, isLoading, error } = useQuery({
    queryKey: ['clinical-note', noteId],
    queryFn: async () => {
      const response = await api.get(`/clinical-notes/${noteId}`);
      return response.data.data;
    },
    enabled: !!noteId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Note...</p>
        </div>
      </div>
    );
  }

  if (error || !noteData) {
    return <Navigate to={`/clients/${clientId}`} />;
  }

  // Route to correct form based on note type
  const noteType = noteData.noteType;
  const showRevisionBanner = noteData.status === 'RETURNED_FOR_REVISION';

  let FormComponent;

  switch (noteType) {
    case 'Intake Assessment':
      FormComponent = IntakeAssessmentForm;
      break;
    case 'Progress Note':
      FormComponent = ProgressNoteForm;
      break;
    case 'Treatment Plan':
      FormComponent = TreatmentPlanForm;
      break;
    case 'Cancellation Note':
      FormComponent = CancellationNoteForm;
      break;
    case 'Consultation Note':
      FormComponent = ConsultationNoteForm;
      break;
    case 'Contact Note':
      FormComponent = ContactNoteForm;
      break;
    case 'Termination Note':
      FormComponent = TerminationNoteForm;
      break;
    case 'Miscellaneous Note':
      FormComponent = MiscellaneousNoteForm;
      break;
    default:
      return <Navigate to={`/clients/${clientId}/notes/${noteId}`} />;
  }

  return (
    <div>
      {showRevisionBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
          <div className="max-w-7xl mx-auto">
            <RevisionBanner
              noteId={noteData.id}
              currentRevisionComments={noteData.currentRevisionComments || ''}
              currentRevisionRequiredChanges={noteData.currentRevisionRequiredChanges || []}
              revisionCount={noteData.revisionCount || 0}
              revisionHistory={noteData.revisionHistory || []}
              onResubmitSuccess={() => {
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
      <div className={showRevisionBanner ? 'mt-64' : ''}>
        <FormComponent />
      </div>
    </div>
  );
}
