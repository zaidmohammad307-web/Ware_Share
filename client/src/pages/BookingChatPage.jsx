import React from 'react';
import { useParams } from 'react-router-dom';
import AccountNav from '../components/ui/AccountNav';
import ChatBox from '../components/ui/ChatBox';

const BookingChatPage = () => {
  const params = useParams();
  const bookingId = params.bookingId || params.id;

  return (
    <div>
      <AccountNav />
      <div className="mx-auto max-w-4xl px-4 pb-10">
        <ChatBox bookingId={bookingId} />
      </div>
    </div>
  );
};

export default BookingChatPage;
