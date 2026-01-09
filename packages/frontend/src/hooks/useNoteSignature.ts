import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface UseNoteSignatureOptions {
  noteType: string;
  clientId?: string;
  onSignSuccess?: (noteId: string) => void;
  onSignError?: (error: Error) => void;
}

interface SignatureAuthData {
  pin?: string;
  password?: string;
}

interface SaveNoteData {
  [key: string]: unknown;
}

interface SaveNoteResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    requiresCosign?: boolean;
    [key: string]: unknown;
  };
}

interface SignNoteResponse {
  success: boolean;
  data: {
    id: string;
    signatureType: string;
    signedAt: string;
    [key: string]: unknown;
  };
}

/**
 * Custom hook to handle the clinical note sign-and-submit workflow.
 *
 * Flow:
 * 1. Save note as DRAFT (POST /clinical-notes or PUT /clinical-notes/:id)
 * 2. On save success, open SignatureModal
 * 3. User enters PIN/password
 * 4. Sign note (POST /clinical-notes/:id/sign)
 * 5. Handle success (redirect, toast) or error
 */
export function useNoteSignature(options: UseNoteSignatureOptions) {
  const { noteType, clientId, onSignSuccess, onSignError } = options;
  const queryClient = useQueryClient();

  // State for the signature modal
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for saving the note
  const saveMutation = useMutation({
    mutationFn: async (data: { noteData: SaveNoteData; existingNoteId?: string }) => {
      const { noteData, existingNoteId } = data;

      if (existingNoteId) {
        // Update existing note
        const response = await api.put<SaveNoteResponse>(
          `/clinical-notes/${existingNoteId}`,
          noteData
        );
        return response.data;
      } else {
        // Create new note
        const response = await api.post<SaveNoteResponse>(
          '/clinical-notes',
          noteData
        );
        return response.data;
      }
    },
  });

  // Mutation for signing the note
  const signMutation = useMutation({
    mutationFn: async (data: { noteId: string; authData: SignatureAuthData }) => {
      const { noteId, authData } = data;

      const payload = {
        method: authData.pin ? 'PIN' : 'PASSWORD',
        credential: authData.pin || authData.password,
        signatureType: 'AUTHOR',
      };

      const response = await api.post<SignNoteResponse>(
        `/clinical-notes/${noteId}/sign`,
        payload
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['clinical-notes'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-note', variables.noteId] });
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['clinical-notes', 'client', clientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['my-notes'] });

      toast.success('Note signed successfully!');

      // Close modal and reset state
      setIsSignatureModalOpen(false);
      setPendingNoteId(null);

      // Call success callback
      if (onSignSuccess) {
        onSignSuccess(variables.noteId);
      }
    },
    onError: (error: Error) => {
      // Keep modal open to allow retry
      if (onSignError) {
        onSignError(error);
      }
    },
  });

  /**
   * Start the sign-and-submit process.
   * Saves the note first, then opens the signature modal.
   */
  const initiateSignAndSubmit = useCallback(async (
    noteData: SaveNoteData,
    existingNoteId?: string
  ): Promise<boolean> => {
    setIsSaving(true);

    try {
      // Ensure note is saved as DRAFT first (signing will update status)
      const dataToSave = {
        ...noteData,
        status: 'DRAFT',
      };

      const result = await saveMutation.mutateAsync({
        noteData: dataToSave,
        existingNoteId,
      });

      if (result.success && result.data?.id) {
        // Store the note ID and open signature modal
        setPendingNoteId(result.data.id);
        setIsSignatureModalOpen(true);
        setIsSaving(false);
        return true;
      } else {
        toast.error('Failed to save note');
        setIsSaving(false);
        return false;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save note';
      toast.error(errorMessage);
      setIsSaving(false);
      return false;
    }
  }, [saveMutation]);

  /**
   * Handle the signature submission from the modal.
   * Called when user enters PIN/password and clicks "Sign Document".
   */
  const handleSign = useCallback(async (authData: SignatureAuthData): Promise<void> => {
    if (!pendingNoteId) {
      throw new Error('No note ID available for signing');
    }

    await signMutation.mutateAsync({
      noteId: pendingNoteId,
      authData,
    });
  }, [pendingNoteId, signMutation]);

  /**
   * Close the signature modal without signing.
   */
  const closeSignatureModal = useCallback(() => {
    setIsSignatureModalOpen(false);
    // Note: We keep pendingNoteId in case user wants to try again
    // The note is already saved as DRAFT
  }, []);

  /**
   * Cancel the entire sign process and optionally delete the draft.
   */
  const cancelSignProcess = useCallback(() => {
    setIsSignatureModalOpen(false);
    setPendingNoteId(null);
  }, []);

  return {
    // State
    isSignatureModalOpen,
    pendingNoteId,
    isSaving,
    isSigning: signMutation.isPending,
    isSignAndSubmitting: isSaving || signMutation.isPending,
    signError: signMutation.error,

    // Actions
    initiateSignAndSubmit,
    handleSign,
    closeSignatureModal,
    cancelSignProcess,

    // For the SignatureModal component
    signatureModalProps: {
      open: isSignatureModalOpen,
      onClose: closeSignatureModal,
      onSign: handleSign,
      noteType,
      signatureType: 'AUTHOR' as const,
    },
  };
}

export default useNoteSignature;
