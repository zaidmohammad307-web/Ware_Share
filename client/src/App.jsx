// client/src/App.jsx
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/ui/Layout';
import IndexPage from './pages/IndexPage';
import LaunchPage from './pages/LaunchPage';
import { PreferencesProvider } from './providers/PreferencesProvider';
import axiosInstance from './utils/axios';
import { UserProvider } from './providers/UserProvider';
import { PlaceProvider } from './providers/PlaceProvider';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getItemFromLocalStorage } from './utils';
import Spinner from './components/ui/Spinner';

// Pages are code-split so each one downloads only when first visited.
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PlacesPage = lazy(() => import('./pages/PlacesPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const PlacesFormPage = lazy(() => import('./pages/PlacesFormPage'));
const ManageAvailabilityPage = lazy(() => import('./pages/ManageAvailabilityPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage'));
const WaitlistAdminPage = lazy(() => import('./pages/WaitlistAdminPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage'));
const PlacePage = lazy(() => import('./pages/PlacePage'));
const SingleBookedPlace = lazy(() => import('./pages/SingleBookedPlace'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const OwnerBookingsPage = lazy(() => import('./pages/OwnerBookingsPage'));
const HostProfilePage = lazy(() => import('./pages/HostProfilePage'));
const RenterProfilePage = lazy(() => import('./pages/RenterProfilePage'));
const AdminHostVerificationPage = lazy(() => import('./pages/AdminHostVerificationPage'));
const ChatInboxPage = lazy(() => import('./pages/ChatInboxPage'));
const PlaceChatPage = lazy(() => import('./pages/PlaceChatPage'));
const BookingChatPage = lazy(() => import('./pages/BookingChatPage'));

function App() {
  useEffect(() => {
    const token = getItemFromLocalStorage('token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <PreferencesProvider>
      <UserProvider>
        <PlaceProvider>
          <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/launch" element={<LaunchPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<IndexPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/account" element={<ProfilePage />} />
              <Route path="/account/places" element={<PlacesPage />} />
              <Route path="/account/places/new" element={<PlacesFormPage />} />
              <Route path="/account/places/:id" element={<PlacesFormPage />} />
              <Route path="/account/places/:id/availability" element={<ManageAvailabilityPage />} />

              <Route path="/place/:id" element={<PlacePage />} />

              {/* Footer content + support */}
              <Route path="/info/:slug" element={<InfoPage />} />
              <Route path="/support/report" element={<ReportIssuePage />} />
              <Route path="/sitemap" element={<SitemapPage />} />
              <Route path="/admin/waitlist" element={<WaitlistAdminPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />

              <Route path="/account/bookings" element={<BookingsPage />} />
              <Route path="/account/bookings/:id" element={<SingleBookedPlace />} />

              {/* ✅ Legacy booking chat route (fixes 404 from booking details button) */}
              <Route path="/account/bookings/:id/chat" element={<BookingChatPage />} />

              {/* Owner requests */}
              <Route path="/account/owner/bookings" element={<OwnerBookingsPage />} />

              {/* ✅ Chats Inbox + Place/Booking chats */}
              <Route path="/account/chats" element={<ChatInboxPage />} />
              <Route path="/account/chats/place/:placeId" element={<PlaceChatPage />} />
              <Route path="/account/chats/booking/:bookingId" element={<BookingChatPage />} />
              <Route path="/place/:placeId/chat" element={<PlaceChatPage />} />

              {/* ✅ Dashboards */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

              {/* Admin */}
              <Route path="/account/admin/hosts" element={<AdminHostVerificationPage />} />

              {/* Public profiles */}
              <Route path="/host/:hostId" element={<HostProfilePage />} />
              <Route path="/renter/:renterId" element={<RenterProfilePage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </Suspense>

          <ToastContainer autoClose={2000} transition={Slide} />
        </PlaceProvider>
      </UserProvider>
      </PreferencesProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
