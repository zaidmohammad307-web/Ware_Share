import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AccountNav from '../components/ui/AccountNav';
import ChatBox from '../components/ui/ChatBox';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    headerTitle: 'Place chat',
    headerSubtitle: 'Chat with the other party before booking.',
  },
  AR: {
    headerTitle: 'محادثة المستودع',
    headerSubtitle: 'تحدّث مع الطرف الآخر قبل الحجز.',
  },
};

const PlaceChatPage = () => {
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  const { placeId } = useParams();
  const [sp] = useSearchParams();
  const renterId = sp.get('renterId');

  return (
    <div>
      <AccountNav />
      <div className="mx-auto max-w-4xl px-4 pb-10">
        <ChatBox
          mode="place"
          placeId={placeId}
          renterId={renterId && renterId !== 'undefined' ? renterId : null}
          headerTitle={L.headerTitle}
          headerSubtitle={L.headerSubtitle}
        />
      </div>
    </div>
  );
};

export default PlaceChatPage;
