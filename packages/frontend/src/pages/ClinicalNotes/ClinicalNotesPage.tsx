import { useParams } from 'react-router-dom';
import ClinicalNotesList from '../../components/ClinicalNotes/ClinicalNotesList';

export default function ClinicalNotesPage() {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Client ID is required</p>
        </div>
      </div>
    );
  }

  return <ClinicalNotesList clientId={clientId} />;
}
