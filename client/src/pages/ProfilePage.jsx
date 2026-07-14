// client/src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Navigate, useParams } from 'react-router-dom';

import AccountNav from '@/components/ui/AccountNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import PlacesPage from './PlacesPage';
import { useAuth, usePageTitle } from '../hooks';
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
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    notHost: 'Not a host yet',
    pending: 'Verification pending',
    rejected: 'Verification rejected',
    verified: 'Verified host',
    hostNotSubmitted: 'Host (verification not submitted)',
    name: 'Name: ',
    email: 'Email: ',
    verifiedNote: 'Your profile will show a ✅ Verified host badge.',
    logout: 'Logout',
    hostSettings: 'Host settings',
    hostSettingsSub: 'Become a warehouse host and list your storage on Wareshare.',
    wantToHost: 'I want to host warehouses',
    wantToHostSub: 'Turn this on if you plan to list your own warehouse spaces.',
    companyName: 'Company / warehouse name',
    companyPlaceholder: 'e.g. Amman Logistics Hub',
    phone: 'Host contact phone',
    saving: 'Saving...',
    saveHostSettings: 'Save host settings',
    hostVerification: 'Host verification',
    uploadHint:
      'Upload at least one document. We recommend both your ID and company / warehouse registration.',
    govId: 'Government ID (photo or scan)',
    companyReg: 'Company / warehouse registration',
    docsOnFile: 'document(s) already on file.',
    lastReviewNote: 'Last review note: ',
    submitting: 'Submitting…',
    submitVerification: 'Submit for verification',
    settingsUpdated: 'Host settings updated',
    settingsFailed: 'Failed to update host settings. Please try again.',
    uploadAtLeastOne: 'Please upload at least one document (ID or company doc).',
    verificationSubmitted: 'Verification submitted. We will review your documents.',
    verificationFailed: 'Failed to submit verification. Please try again.',
  },
  AR: {
    notHost: 'لست مضيفًا بعد',
    pending: 'التحقق قيد الانتظار',
    rejected: 'تم رفض التحقق',
    verified: 'مضيف موثّق',
    hostNotSubmitted: 'مضيف (لم يتم إرسال التحقق)',
    name: 'الاسم: ',
    email: 'البريد الإلكتروني: ',
    verifiedNote: 'سيظهر في ملفك الشخصي شارة ✅ مضيف موثّق.',
    logout: 'تسجيل الخروج',
    hostSettings: 'إعدادات المضيف',
    hostSettingsSub: 'كن مضيف مستودعات واعرض مساحتك التخزينية على وير شير.',
    wantToHost: 'أريد استضافة مستودعات',
    wantToHostSub: 'فعّل هذا الخيار إذا كنت تخطط لعرض مساحات مستودعاتك الخاصة.',
    companyName: 'اسم الشركة / المستودع',
    companyPlaceholder: 'مثال: مركز عمّان اللوجستي',
    phone: 'هاتف التواصل للمضيف',
    saving: 'جارٍ الحفظ...',
    saveHostSettings: 'حفظ إعدادات المضيف',
    hostVerification: 'توثيق المضيف',
    uploadHint:
      'ارفع مستندًا واحدًا على الأقل. ننصح برفع هويتك وسجل الشركة / المستودع معًا.',
    govId: 'هوية حكومية (صورة أو نسخة ممسوحة)',
    companyReg: 'سجل الشركة / المستودع',
    docsOnFile: 'مستند/مستندات موجودة بالفعل في الملف.',
    lastReviewNote: 'ملاحظة المراجعة الأخيرة: ',
    submitting: 'جارٍ الإرسال…',
    submitVerification: 'إرسال للتوثيق',
    settingsUpdated: 'تم تحديث إعدادات المضيف',
    settingsFailed: 'تعذر تحديث إعدادات المضيف. حاول مرة أخرى.',
    uploadAtLeastOne: 'يرجى رفع مستند واحد على الأقل (الهوية أو مستند الشركة).',
    verificationSubmitted: 'تم إرسال طلب التوثيق. سنراجع مستنداتك.',
    verificationFailed: 'تعذر إرسال طلب التوثيق. حاول مرة أخرى.',
  },
};

const ProfilePage = () => {
  usePageTitle('My profile');

  const auth = useAuth();
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;
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

  let statusLabel = L.notHost;
  let statusClasses = 'bg-gray-100 text-gray-700';
  let statusValueForDebug = hvStatus;

  if (hvStatus === 'pending') {
    statusLabel = L.pending;
    statusClasses = 'bg-amber-100 text-amber-800';
  } else if (hvStatus === 'rejected') {
    statusLabel = L.rejected;
    statusClasses = 'bg-red-100 text-red-800';
  } else if (hvStatus === 'approved' || isHostVerified) {
    statusLabel = L.verified;
    statusClasses = 'bg-emerald-100 text-emerald-800';
    statusValueForDebug = 'approved';
  } else if (wantsToHost && hvStatus === 'not_submitted') {
    statusLabel = L.hostNotSubmitted;
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

      toast.success(L.settingsUpdated);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          L.settingsFailed
      );
    } finally {
      setHostSaving(false);
    }
  };

  // ---------- HOST VERIFICATION SUBMIT ----------
  const handleSubmitVerification = async (e) => {
    e.preventDefault();

    if (!idFile && !companyFile) {
      toast.error(L.uploadAtLeastOne);
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
        data.message || L.verificationSubmitted
      );
      setIdFile(null);
      setCompanyFile(null);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          L.verificationFailed
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
                    <span>{L.name}</span>
                    <span className="text-gray-600">{user.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail height="18" width="18" />
                  <div className="text-xl">
                    <span>{L.email}</span>
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
                    {L.verifiedNote}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex w-full justify-around sm:justify-end sm:gap-5 md:gap-10">
              <EditProfileDialog />

              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {L.logout}
              </Button>
            </div>

            {/* HOSTING SECTION */}
            <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    {L.hostSettings}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {L.hostSettingsSub}
                  </p>
                </div>
              </div>

              {/* Toggle + basic host info */}
              <div className="space-y-3 border-b pb-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">
                      {L.wantToHost}
                    </span>
                    <p className="text-xs text-gray-500">
                      {L.wantToHostSub}
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
                        {L.companyName}
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder={L.companyPlaceholder}
                        value={hostForm.companyName}
                        onChange={(e) =>
                          handleHostFormChange('companyName', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {L.phone}
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
                    {hostSaving ? L.saving : L.saveHostSettings}
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
                      {L.hostVerification}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    {L.uploadHint}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {L.govId}
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
                          {hostVerificationFiles.length} {L.docsOnFile}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {L.companyReg}
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
                      <span className="font-semibold">{L.lastReviewNote}</span>
                      {user.hostVerificationNotes}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={verifyLoading}
                    className="mt-1"
                  >
                    {verifyLoading ? L.submitting : L.submitVerification}
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
