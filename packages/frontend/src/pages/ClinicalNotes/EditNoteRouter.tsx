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

  switch (noteType) {
    case 'Intake Assessment':
      return <IntakeAssessmentForm />;
    case 'Progress Note':
      return <ProgressNoteForm />;
    case 'Treatment Plan':
      return <TreatmentPlanForm />;
    case 'Cancellation Note':
      return <CancellationNoteForm />;
    case 'Consultation Note':
      return <ConsultationNoteForm />;
    case 'Contact Note':
      return <ContactNoteForm />;
    case 'Termination Note':
      return <TerminationNoteForm />;
    case 'Miscellaneous Note':
      return <MiscellaneousNoteForm />;
    default:
      return <Navigate to={`/clients/${clientId}/notes/${noteId}`} />;
  }
}
