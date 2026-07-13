// client/src/App.jsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/ui/Layout';
import IndexPage from './pages/IndexPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PlacesPage from './pages/PlacesPage';
import BookingsPage from './pages/BookingsPage';
import PlacesFormPage from './pages/PlacesFormPage';
import ManageAvailabilityPage from './pages/ManageAvailabilityPage';
import PlacePage from './pages/PlacePage';
import SingleBookedPlace from './pages/SingleBookedPlace';
import NotFoundPage from './pages/NotFoundPage';

// ✅ Dashboards
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import OwnerBookingsPage from './pages/OwnerBookingsPage';
import HostProfilePage from './pages/HostProfilePage';
import RenterProfilePage from './pages/RenterProfilePage';
import AdminHostVerificationPage from './pages/AdminHostVerificationPage';

// ✅ Chats
import ChatInboxPage from './pages/ChatInboxPage';
import PlaceChatPage from './pages/PlaceChatPage';
import BookingChatPage from './pages/BookingChatPage';

import axiosInstance from './utils/axios';
import { UserProvider } from './providers/UserProvider';
import { PlaceProvider } from './providers/PlaceProvider';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getItemFromLocalStorage } from './utils';

function App() {
  useEffect(() => {
    const token = getItemFromLocalStorage('token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <UserProvider>
        <PlaceProvider>
          <Routes>
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

          <ToastContainer autoClose={2000} transition={Slide} />
        </PlaceProvider>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
