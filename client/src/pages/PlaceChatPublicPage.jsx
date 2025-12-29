// client/src/pages/PlaceChatPublicPage.jsx
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

import ChatBox from '../components/ui/ChatBox';
import { useAuth } from '@/hooks';

// Public entry-point for starting a pre-booking inquiry chat from a listing page.
// If not logged in, redirect to /login.
const PlaceChatPublicPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mt-20 px-4 pb-10">
      <div className="mx-auto max-w-4xl">
        <ChatBox placeId={id} />
      </div>
    </div>
  );
};

export default PlaceChatPublicPage;
