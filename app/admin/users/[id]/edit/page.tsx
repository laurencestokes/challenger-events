'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@lib/api-client';
import { queryKeys } from '@lib/queryKeys';
import ProtectedRoute from '@components/ProtectedRoute';
import { useAuth } from '@contexts/AuthContext';

interface AdminUser {
  id: string;
  uid: string;
  name?: string;
  email?: string;
  role: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  bodyweight?: number;
  dateOfBirth?: unknown;
  sex?: 'M' | 'F';
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION';
  verificationNotes?: string;
  profileName?: string;
  publicProfileEnabled?: boolean;
  publicProfileShowAge?: boolean;
  publicProfileShowBodyweight?: boolean;
  publicProfileShowSex?: boolean;
  isGuest?: boolean;
}

function toDateInputValue(raw: unknown): string {
  if (!raw) return '';
  let d: Date | null = null;
  if (raw instanceof Date) {
    d = raw;
  } else if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) d = parsed;
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof obj.toDate === 'function') {
      d = obj.toDate();
    } else if (typeof obj.seconds === 'number') {
      d = new Date(obj.seconds * 1000);
    } else if (typeof obj._seconds === 'number') {
      d = new Date(obj._seconds * 1000);
    }
  }
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EditUserPage() {
  const params = useParams();
  const userId = params.id as string;

  const userQuery = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get(`/api/admin/users/${userId}`),
    enabled: !!userId,
  });

  const target: AdminUser | null = userQuery.data?.user || null;

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-6 flex items-center space-x-3 text-sm">
            <Link href="/admin/users" className="text-muted hover:text-text-secondary">
              Users
            </Link>
            <span className="text-muted">/</span>
            <span className="text-text-primary font-medium">
              {target?.name || target?.email || 'Edit user'}
            </span>
            <span className="text-muted">/</span>
            <span className="text-text-primary">Edit</span>
          </div>

          {userQuery.isLoading ? (
            <p className="text-muted">Loading user...</p>
          ) : userQuery.isError ? (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-400">Failed to load user.</p>
            </div>
          ) : !target ? (
            <p className="text-muted">User not found.</p>
          ) : (
            // Child remounts whenever the loaded user changes — keeps form state in sync
            // with server data without setState-in-effect.
            <EditUserForm key={target.id} target={target} userId={userId} />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

interface EditUserFormProps {
  target: AdminUser;
  userId: string;
}

function EditUserForm({ target, userId }: EditUserFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [name, setName] = useState(target.name || '');
  const [role, setRole] = useState(target.role || 'COMPETITOR');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>(target.status || 'ACTIVE');
  const [bodyweight, setBodyweight] = useState(target.bodyweight ? String(target.bodyweight) : '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(target.dateOfBirth));
  const [sex, setSex] = useState<'' | 'M' | 'F'>(target.sex || '');
  const [verificationStatus, setVerificationStatus] = useState(
    target.verificationStatus || 'PENDING',
  );
  const [verificationNotes, setVerificationNotes] = useState(target.verificationNotes || '');
  const [profileName, setProfileName] = useState(target.profileName || '');
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(!!target.publicProfileEnabled);
  const [publicProfileShowAge, setPublicProfileShowAge] = useState(!!target.publicProfileShowAge);
  const [publicProfileShowBodyweight, setPublicProfileShowBodyweight] = useState(
    !!target.publicProfileShowBodyweight,
  );
  const [publicProfileShowSex, setPublicProfileShowSex] = useState(!!target.publicProfileShowSex);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isSelfEdit = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.id === target.id || currentUser.uid === target.uid;
  }, [currentUser, target]);

  const viewerIsSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const targetIsSuperAdmin = target.role === 'SUPER_ADMIN';
  const roleEditDisabled = isSelfEdit || (targetIsSuperAdmin && !viewerIsSuperAdmin);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name,
        status,
        verificationStatus,
        verificationNotes,
        publicProfileEnabled,
        publicProfileShowAge,
        publicProfileShowBodyweight,
        publicProfileShowSex,
      };
      if (!roleEditDisabled) {
        payload.role = role;
      }
      if (bodyweight !== '') {
        payload.bodyweight = Number(bodyweight);
      }
      if (dateOfBirth !== '') {
        payload.dateOfBirth = new Date(`${dateOfBirth}T00:00:00.000Z`).toISOString();
      }
      if (sex !== '') {
        payload.sex = sex;
      }
      if (profileName !== '') {
        payload.profileName = profileName;
      }
      return api.put(`/api/admin/users/${userId}`, payload);
    },
    onSuccess: (data: { reverificationFlagged?: boolean }) => {
      setError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] });
      if (data?.reverificationFlagged) {
        setSuccessMessage(
          'Saved. Bodyweight changed significantly — user has been flagged for re-verification.',
        );
      } else {
        setSuccessMessage('Saved.');
        setTimeout(() => router.push('/admin/users'), 600);
      }
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to save user');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    saveMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Identity */}
      <section className="panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Identity</h2>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            readOnly
            value={target.email || ''}
            title="Email is managed by the auth provider and cannot be changed here."
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-muted cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-muted">
            Email is managed by the auth provider and cannot be edited here.
          </p>
        </div>
        <div>
          <label
            htmlFor="profileName"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Profile name (URL slug)
          </label>
          <input
            id="profileName"
            type="text"
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="(none)"
          />
        </div>
      </section>

      {/* Account */}
      <section className="panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Account</h2>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={roleEditDisabled}
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="ADMIN">Admin</option>
            <option value="COMPETITOR">Competitor</option>
            <option value="VIEWER">Viewer</option>
            {viewerIsSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
          </select>
          {roleEditDisabled && (
            <p className="mt-1 text-xs text-muted">
              {isSelfEdit
                ? 'You cannot change your own role.'
                : 'Only a Super Admin can change another Super Admin role.'}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-text-secondary mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </section>

      {/* Scoring */}
      <section className="panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Scoring details</h2>
        <div>
          <label
            htmlFor="bodyweight"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Bodyweight (kg)
          </label>
          <input
            id="bodyweight"
            type="number"
            min="0"
            max="500"
            step="0.1"
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            Changing this by more than 2&nbsp;kg from a verified value will flag the user for
            re-verification.
          </p>
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-text-secondary mb-1">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sex" className="block text-sm font-medium text-text-secondary mb-1">
            Sex
          </label>
          <select
            id="sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as '' | 'M' | 'F')}
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">(unset)</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
      </section>

      {/* Verification */}
      <section className="panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Verification</h2>
        <div>
          <label
            htmlFor="verificationStatus"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Verification status
          </label>
          <select
            id="verificationStatus"
            value={verificationStatus}
            onChange={(e) =>
              setVerificationStatus(
                e.target.value as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVERIFICATION',
              )
            }
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="NEEDS_REVERIFICATION">Needs re-verification</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="verificationNotes"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Verification notes
          </label>
          <textarea
            id="verificationNotes"
            rows={3}
            maxLength={1000}
            className="w-full px-4 py-2 bg-surface-high border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
          />
        </div>
      </section>

      {/* Public profile */}
      <section className="panel rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-white">Public profile</h2>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={publicProfileEnabled}
            onChange={(e) => setPublicProfileEnabled(e.target.checked)}
          />
          Public profile enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={publicProfileShowAge}
            onChange={(e) => setPublicProfileShowAge(e.target.checked)}
          />
          Show age publicly
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={publicProfileShowBodyweight}
            onChange={(e) => setPublicProfileShowBodyweight(e.target.checked)}
          />
          Show bodyweight publicly
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={publicProfileShowSex}
            onChange={(e) => setPublicProfileShowSex(e.target.checked)}
          />
          Show sex publicly
        </label>
      </section>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 bg-surface-high text-text-secondary rounded-lg hover:bg-surface-high transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
