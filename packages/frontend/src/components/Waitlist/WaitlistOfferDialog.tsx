import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../ConfirmModal';

/**
 * Module 3 Phase 2.2: Waitlist Offer Dialog
 * Send slot offers manually with notification preferences
 */

interface WaitlistOfferDialogProps {
  entry: {
    id: string;
    client: {
      firstName: string;
      lastName: string;
      email: string;
      primaryPhone: string;
    };
    offerCount: number;
    declinedOffers: number;
    lastOfferDate?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WaitlistOfferDialog({
  entry,
  isOpen,
  onClose,
}: WaitlistOfferDialogProps) {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [notificationMethod, setNotificationMethod] = useState<'Email' | 'SMS' | 'Portal'>('Email');
  const [bookConfirm, setBookConfirm] = useState(false);

  // Fetch available slots
  const { data: availableSlots, isLoading } = useQuery({
    queryKey: ['available-slots', entry?.id],
    queryFn: async () => {
      if (!entry?.id) return [];
      const response = await api.get(`/waitlist-matching/${entry.id}/matches?daysAhead=14`);
      return response.data.data;
    },
    enabled: isOpen && !!entry?.id,
  });

  // Send offer mutation
  const sendOfferMutation = useMutation({
    mutationFn: async (data: {
      clinicianId: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      notificationMethod: string;
    }) => {
      const response = await api.post(`/waitlist-matching/${entry?.id}/send-offer`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Offer sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to send offer');
    },
  });

  // Book directly mutation
  const bookDirectMutation = useMutation({
    mutationFn: async (slot: any) => {
      const response = await api.post(`/waitlist/${entry?.id}/book`, {
        clinicianId: slot.clinicianId,
        appointmentDate: slot.appointmentDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: 60,
        serviceLocation: 'Office',
        serviceCodeId: 'placeholder-uuid',
        timezone: 'America/New_York',
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to book appointment');
    },
  });

  const handleSendOffer = () => {
    if (!selectedSlot) {
      toast.error('Please select a slot');
      return;
    }

    sendOfferMutation.mutate({
      clinicianId: selectedSlot.clinicianId,
      appointmentDate: new Date(selectedSlot.appointmentDate).toISOString(),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      notificationMethod,
    });
  };

  const handleBookDirectClick = () => {
    if (!selectedSlot) {
      toast.error('Please select a slot');
      return;
    }
    setBookConfirm(true);
  };

  const confirmBookDirect = () => {
    if (selectedSlot) {
      bookDirectMutation.mutate(selectedSlot);
    }
    setBookConfirm(false);
  };

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-2xl font-bold text-gray-900">Send Slot Offer</h2>
          <p className="text-gray-600 mt-1">
            {entry.client.firstName} {entry.client.lastName}
          </p>
          <div className="mt-3 flex items-center space-x-4 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
              {entry.offerCount} offers sent
            </span>
            {entry.declinedOffers > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                {entry.declinedOffers} declined
              </span>
            )}
            {entry.lastOfferDate && (
              <span className="text-gray-500">
                Last offer: {new Date(entry.lastOfferDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Notification Method */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notification Method
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setNotificationMethod('Email')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  notificationMethod === 'Email'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setNotificationMethod('SMS')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  notificationMethod === 'SMS'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SMS
              </button>
              <button
                onClick={() => setNotificationMethod('Portal')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  notificationMethod === 'Portal'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Portal
              </button>
            </div>
          </div>

          {/* Available Slots */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Available Slots (Smart Matched)
            </h3>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading matching slots...
              </div>
            ) : availableSlots?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No matching slots found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availableSlots?.map((slot: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedSlot === slot
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">
                        {slot.clinicianName}
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-green-600 to-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${slot.matchScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-green-600">
                          {(slot.matchScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium">
                        {new Date(slot.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div>
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                    {slot.matchReasons && slot.matchReasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {slot.matchReasons.map((reason: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            <button
              onClick={handleBookDirectClick}
              disabled={!selectedSlot || bookDirectMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bookDirectMutation.isPending ? 'Booking...' : 'Book Direct'}
            </button>
            <button
              onClick={handleSendOffer}
              disabled={!selectedSlot || sendOfferMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendOfferMutation.isPending ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </div>
      </div>

      {/* Book Direct Confirmation Modal */}
      <ConfirmModal
        isOpen={bookConfirm}
        onClose={() => setBookConfirm(false)}
        onConfirm={confirmBookDirect}
        title="Confirm Direct Booking"
        message="Book this appointment directly without sending an offer?"
        confirmText="Book Direct"
        confirmVariant="primary"
      />
    </div>
  );
}
