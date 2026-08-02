// client/src/pages/AdminHostVerificationPage.jsx
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import axiosInstance from '@/utils/axios';
import { useAuth } from '@/hooks';
import { ShieldCheck, AlertTriangle, Mail, Phone, Check, X } from 'lucide-react';
import AccountNav from '@/components/ui/AccountNav';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    loadFailed: 'Failed to load pending host verifications.',
    decisionSaved: 'Decision saved',
    updateFailed: 'Failed to update host verification status.',
    notAuthorized: 'You are not authorized to view this page.',
    title: 'Host verification requests',
    subtitle: 'Review pending host applications and approve or reject them.',
    loadingHosts: 'Loading pending hosts...',
    noRequests: 'No pending host verification requests.',
    pending: 'Pending',
    company: 'Company:',
    submittedAt: 'Submitted at:',
    lastNote: 'Last note:',
    document: 'Document',
    approve: 'Approve',
    reject: 'Reject',
  },
  AR: {
    loadFailed: 'تعذّر تحميل طلبات التحقق المعلّقة.',
    decisionSaved: 'تم حفظ القرار',
    updateFailed: 'تعذّر تحديث حالة التحقق من المضيف.',
    notAuthorized: 'لا تملك صلاحية لعرض هذه الصفحة.',
    title: 'طلبات التحقق من المضيفين',
    subtitle: 'راجع طلبات المضيفين المعلّقة ثم اقبلها أو ارفضها.',
    loadingHosts: 'جارٍ تحميل المضيفين المعلّقين...',
    noRequests: 'لا توجد طلبات تحقق معلّقة.',
    pending: 'معلّق',
    company: 'الشركة:',
    submittedAt: 'تاريخ التقديم:',
    lastNote: 'آخر ملاحظة:',
    document: 'مستند',
    approve: 'قبول',
    reject: 'رفض',
  },
};

const AdminHostVerificationPage = () => {
  const { user, setUser } = useAuth();
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;
  const [loading, setLoading] = useState(true);
  const [hosts, setHosts] = useState([]);

  // load pending hosts from backend
  const loadPendingHosts = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/users/admin/hosts/pending');
      setHosts(data.hosts || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || L.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingHosts();
  }, []);

  // Approve / Reject handler
  const handleDecision = async (hostId, decision) => {
    try {
      const { data } = await axiosInstance.put(
        `/users/admin/hosts/${hostId}/verify`,
        {
          status: decision, // 'approved' or 'rejected'
        }
      );

      toast.success(data.message || L.decisionSaved);

      // If the host we just updated is the currently logged-in user, sync it
      if (data.user && user && user._id === data.user._id && typeof setUser === 'function') {
        setUser(data.user);
      }

      // Remove this host from the list after decision
      setHosts((prev) => prev.filter((h) => h._id !== hostId));
    } catch (err) {
      toast.error(err?.response?.data?.message || L.updateFailed);
    }
  };

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@123456';

  // If not logged in or not admin email, show nothing / simple message
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div>
        <AccountNav />
        <div className="mt-24 text-center text-sm text-gray-500">
          {L.notAuthorized}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AccountNav />

      <div className="mx-auto mt-4 max-w-4xl rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {L.title}
            </h1>
            <p className="text-xs text-gray-500">{L.subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            {L.loadingHosts}
          </div>
        ) : hosts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-500">
            <AlertTriangle className="h-6 w-6 text-gray-400" />
            <span>{L.noRequests}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {hosts.map((h) => {
              const hp = h.hostProfile || {};
              const files = h.hostVerificationFiles || [];
              const submittedAt =
                (files[0] && files[0].uploadedAt) || h.updatedAt || h.createdAt;

              return (
                <div
                  key={h._id}
                  className="flex flex-col gap-3 rounded-xl border bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-gray-800">
                      {h.name}{' '}
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">
                        {L.pending}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {h.email}
                      </span>
                      {hp.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {hp.phone}
                        </span>
                      )}
                      {hp.companyName && (
                        <span className="inline-flex items-center gap-1">
                          {L.company} {hp.companyName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {L.submittedAt}{' '}
                      {submittedAt
                        ? new Date(submittedAt).toLocaleString()
                        : '—'}
                    </div>
                    {h.hostVerificationNotes && (
                      <div className="text-[11px] text-red-500">
                        {L.lastNote} {h.hostVerificationNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Files */}
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {files.map((f) => (
                          <a
                            key={f._id || f.url}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white px-2 py-1 text-blue-600 underline"
                          >
                            {f.label || L.document}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(h._id, 'approved')}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3 w-3" />
                        {L.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(h._id, 'rejected')}
                        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        <X className="h-3 w-3" />
                        {L.reject}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHostVerificationPage;
