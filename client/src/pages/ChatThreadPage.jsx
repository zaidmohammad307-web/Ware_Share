import { useParams, useLocation } from 'react-router-dom';
import AccountNav from '@/components/ui/AccountNav';
import ChatBox from '@/components/ui/ChatBox';

const ChatThreadPage = () => {
  const { bookingId, placeId, renterId } = useParams();
  const location = useLocation();

  const isBooking = Boolean(bookingId);

  return (
    <div className="mt-20 px-4 pb-10">
      <AccountNav />

      <div className="mx-auto max-w-4xl">
        <h1 className="mt-4 text-2xl font-semibold">
          {isBooking ? 'Booking Chat' : 'Inquiry Chat'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isBooking
            ? 'Chat related to a specific booking.'
            : 'Chat about a listing before booking.'}
        </p>

        <div className="mt-6">
          {isBooking ? (
            <ChatBox bookingId={bookingId} />
          ) : (
            // Host needs renterId to open thread; renterId is ignored for renter side
            <ChatBox placeId={placeId} otherUserId={renterId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatThreadPage;
