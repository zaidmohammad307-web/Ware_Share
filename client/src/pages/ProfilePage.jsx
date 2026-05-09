// client/src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Navigate, useParams } from 'react-router-dom';

import AccountNav from '@/components/ui/AccountNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import PlacesPage from './PlacesPage';
import { useAuth } from '../hooks';
import {
  LogOut,
  Mail,
  Text,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';
import EditProfileDialog from '@/components/ui/EditProfileDialog';
import axiosInstance from '@/utils/axios';

const ProfilePage = () => {
  const auth = useAuth();
  const { user, logout } = auth;
  const [redirect, setRedirect] = useState(null);

  const { subpage: rawSubpage } = useParams();
  const subpage = rawSubpage || 'profile';

  // hosting state (synced from user)
  const [hostForm, setHostForm] = useState({
    isHost: false, // maps to wantsToHost
    companyName: '',
    phone: '',
  });
  const [hostSaving, setHostSaving] = useState(false);

  // verification upload state
  const [idFile, setIdFile] = useState(null);
  const [companyFile, setCompanyFile] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const hp = user.hostProfile || {};

    setHostForm({
      isHost: !!user.wantsToHost,
      companyName: hp.companyName || '',
      phone: hp.phone || '',
    });

  }, [user]);

  const handleLogout = async () => {
    const response = await logout();
    if (response.success) {
      toast.success(response.message);
      setRedirect('/');
    } else {
      toast.error(response.message);
    }
  };

  if (!user && !redirect) {
    return <Navigate to="/login" />;
  }

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  // ---------- HOST STATUS BADGE ----------
  const hvStatus = user?.hostVerificationStatus || 'not_submitted';
  const isHostVerified = !!user?.isHostVerified;
  const wantsToHost = !!user?.wantsToHost;

  let statusLabel = 'Not a host yet';
  let statusClasses = 'bg-gray-100 text-gray-700';
  let statusValueForDebug = hvStatus;

  if (hvStatus === 'pending') {
    statusLabel = 'Verification pending';
    statusClasses = 'bg-amber-100 text-amber-800';
  } else if (hvStatus === 'rejected') {
    statusLabel = 'Verification rejected';
    statusClasses = 'bg-red-100 text-red-800';
  } else if (hvStatus === 'approved' || isHostVerified) {
    statusLabel = 'Verified host';
    statusClasses = 'bg-emerald-100 text-emerald-800';
    statusValueForDebug = 'approved';
  } else if (wantsToHost && hvStatus === 'not_submitted') {
    statusLabel = 'Host (verification not submitted)';
    statusClasses = 'bg-gray-100 text-gray-700';
  }

  const hostVerificationFiles = user?.hostVerificationFiles || [];

  // ---------- HOST SETTINGS ----------
  const handleHostFormChange = (field, value) => {
    setHostForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveHostSettings = async () => {
    try {
      setHostSaving(true);
      const payload = {
        phone: hostForm.phone,
        companyName: hostForm.companyName,
        isHost: hostForm.isHost, // backend maps this to wantsToHost
      };

      const { data } = await axiosInstance.put('/users/host/settings', payload);

      if (data.user && typeof auth.setUser === 'function') {
        auth.setUser(data.user);
      }

      toast.success('Host settings updated');
    } catch (err) {
      console.error('Error updating host settings:', err);
      toast.error(
        err?.response?.data?.message ||
          'Failed to update host settings. Please try again.'
      );
    } finally {
      setHostSaving(false);
    }
  };

  // ---------- HOST VERIFICATION SUBMIT ----------
  const handleSubmitVerification = async (e) => {
    e.preventDefault();

    if (!idFile && !companyFile) {
      toast.error('Please upload at least one document (ID or company doc).');
      return;
    }

    try {
      setVerifyLoading(true);
      const formData = new FormData();
      if (idFile) formData.append('idDocument', idFile);
      if (companyFile) formData.append('companyDocument', companyFile);

      // also send basic info so backend can fill hostProfile if needed
      formData.append('companyName', hostForm.companyName);
      formData.append('phone', hostForm.phone);

      const { data } = await axiosInstance.post(
        '/users/host/verify',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (data.user && typeof auth.setUser === 'function') {
        auth.setUser(data.user);
      }

      toast.success(
        data.message || 'Verification submitted. We will review your documents.'
      );
      setIdFile(null);
      setCompanyFile(null);
    } catch (err) {
      console.error('Error submitting verification:', err);
      toast.error(
        err?.response?.data?.message ||
          'Failed to submit verification. Please try again.'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div>
      <AccountNav />
      {subpage === 'profile' && (
        <div className="m-4 flex flex-col gap-8 rounded-[10px] p-4 sm:h-1/5 sm:flex-row sm:items-stretch lg:gap-28 lg:pl-32 lg:pr-20">
          {/* Avatar */}
          <div className="flex h-40 w-40 justify-center rounded-full bg-gray-200 p-4 sm:h-72 sm:w-72 md:h-96 md:w-96">
            <Avatar>
              {user.picture && <AvatarImage src={user.picture} />}
              <AvatarFallback>{user?.name?.slice(0, 1)?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex grow flex-col gap-6 sm:justify-between">
            {/* User details + host status */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <div className="flex items-center gap-2">
                  <Text height="18" width="18" />
                  <div className="text-xl">
                    <span>Name: </span>
                    <span className="text-gray-600">{user.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail height="18" width="18" />
                  <div className="text-xl">
                    <span>Email: </span>
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                </div>
              </div>

              {/* Host status badge */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
                >
                  {statusValueForDebug === 'pending' && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {(statusValueForDebug === 'approved' || isHostVerified) && (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {statusLabel}
                </span>

                {(statusValueForDebug === 'approved' || isHostVerified) && (
                  <span className="text-xs text-gray-500">
                    Your profile will show a ✅ Verified host badge.
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex w-full justify-around sm:justify-end sm:gap-5 md:gap-10">
              <EditProfileDialog />

              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* HOSTING SECTION */}
            <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Host settings
                  </h2>
                  <p className="text-xs text-gray-500">
                    Become a warehouse host and list your storage on Wareshare.
                  </p>
                </div>
              </div>

              {/* Toggle + basic host info */}
              <div className="space-y-3 border-b pb-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">
                      I want to host warehouses
                    </span>
                    <p className="text-xs text-gray-500">
                      Turn this on if you plan to list your own warehouse
                      spaces.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={hostForm.isHost}
                    onChange={(e) =>
                      handleHostFormChange('isHost', e.target.checked)
                    }
                  />
                </label>

                {hostForm.isHost && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Company / warehouse name
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="e.g. Amman Logistics Hub"
                        value={hostForm.companyName}
                        onChange={(e) =>
                          handleHostFormChange('companyName', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Host contact phone
                      </label>
                      <input
                        type="tel"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="+962 7x xxx xxxx"
                        value={hostForm.phone}
                        onChange={(e) =>
                          handleHostFormChange('phone', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveHostSettings}
                    disabled={hostSaving}
                  >
                    {hostSaving ? 'Saving...' : 'Save host settings'}
                  </Button>
                </div>
              </div>

              {/* Verification upload */}
              {hostForm.isHost && (
                <form
                  className="mt-3 space-y-3"
                  onSubmit={handleSubmitVerification}
                >
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-gray-700" />
                    <h3 className="text-sm font-semibold text-gray-800">
                      Host verification
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload at least one document. We recommend both your ID and
                    company / warehouse registration.
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Government ID (photo or scan)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="mt-1 w-full text-xs"
                        onChange={(e) =>
                          setIdFile(e.target.files?.[0] || null)
                        }
                      />
                      {hostVerificationFiles.length > 0 && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          {hostVerificationFiles.length} document(s) already on
                          file.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        Company / warehouse registration
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="mt-1 w-full text-xs"
                        onChange={(e) =>
                          setCompanyFile(e.target.files?.[0] || null)
                        }
                      />
                    </div>
                  </div>

                  {user.hostVerificationNotes && (
                    <div className="rounded-xl bg-gray-50 p-2 text-[11px] text-gray-600">
                      <span className="font-semibold">Last review note: </span>
                      {user.hostVerificationNotes}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={verifyLoading}
                    className="mt-1"
                  >
                    {verifyLoading ? 'Submitting…' : 'Submit for verification'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {subpage === 'places' && <PlacesPage />}
    </div>
  );
};

export default ProfilePage;
