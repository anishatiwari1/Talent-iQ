import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, KeyRound, LogOut, Save, SlidersHorizontal, UserRound } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PageHeader from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/settingsService';

const inputClass = 'mt-1 w-full rounded-md border border-[#CAD8D0] bg-white px-3 py-2 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA] read-only:bg-[#F3F5EF] read-only:text-[#687A73]';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
  return typeof detail === 'string' ? detail : fallback;
};

const NOTIFICATION_OPTIONS = {
  manager: [
    { key: 'workload', label: 'Workload & availability', description: 'When an assignment pushes someone past your utilization threshold, or an employee updates their availability note.' },
    { key: 'documents', label: 'Certifications added', description: 'When an employee adds a new certification to their profile.' },
    { key: 'assignments', label: 'Assignment updates', description: 'Staffing changes on your projects.' },
    { key: 'projects', label: 'Project activity', description: 'Team and project lifecycle updates.' },
  ],
  employee: [
    { key: 'assignments', label: 'Project assignments', description: 'When you are assigned to a project or a project you worked on is delivered.' },
    { key: 'workload', label: 'Workload warnings', description: 'When your allocation goes above your weekly capacity threshold.' },
    { key: 'documents', label: 'Document processing', description: 'When your résumé has been processed and skills were added.' },
    { key: 'development', label: 'Development suggestions', description: 'New skill-growth suggestions for your roadmap.' },
  ],
};

const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
    <span>
      <span className="block text-sm font-medium text-[#10221E]">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-[#687A73]">{description}</span>}
    </span>
    <span className="relative mt-0.5 inline-flex shrink-0">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span className="h-5 w-9 rounded-full bg-[#CAD8D0] transition-colors peer-checked:bg-[#13816D] peer-focus-visible:ring-2 peer-focus-visible:ring-[#A8D85A] peer-disabled:opacity-50" />
      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
    </span>
  </label>
);

const Status = ({ state }) => {
  if (!state?.message) return null;
  return (
    <p role={state.error ? 'alert' : 'status'} className={`text-sm ${state.error ? 'text-rose-700' : 'text-[#075E4F]'}`}>
      {state.message}
    </p>
  );
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, refreshUser, logout } = useAuth();
  const roleKey = isAdmin ? 'manager' : 'employee';

  const [fullName, setFullName] = useState(user?.name || '');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null);

  const [preferences, setPreferences] = useState(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesStatus, setPreferencesStatus] = useState(null);

  useEffect(() => { setFullName(user?.name || ''); }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    settingsService.getPreferences()
      .then((data) => { if (!cancelled) setPreferences(data); })
      .catch((error) => { if (!cancelled) setPreferencesStatus({ error: true, message: errorMessage(error, 'Preferences could not be loaded.') }); })
      .finally(() => { if (!cancelled) setPreferencesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const saveAccount = async (event) => {
    event.preventDefault();
    setAccountSaving(true);
    setAccountStatus(null);
    try {
      await settingsService.updateAccount({ fullName });
      await refreshUser();
      setAccountStatus({ message: 'Account details saved.' });
    } catch (error) {
      setAccountStatus({ error: true, message: errorMessage(error, 'Account details could not be saved.') });
    } finally {
      setAccountSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordStatus(null);
    if (passwords.next.length < 8) {
      setPasswordStatus({ error: true, message: 'New password must be at least 8 characters.' });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordStatus({ error: true, message: 'The new passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await settingsService.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordStatus({ message: 'Password changed.' });
    } catch (error) {
      setPasswordStatus({ error: true, message: errorMessage(error, 'The password could not be changed.') });
    } finally {
      setPasswordSaving(false);
    }
  };

  const savePreferences = async (updates) => {
    const previous = preferences;
    // Optimistic so toggles feel instant; reverted if the save fails.
    setPreferences((current) => ({
      ...current,
      ...updates,
      notifications: { ...current.notifications, ...(updates.notifications || {}) },
    }));
    setPreferencesSaving(true);
    setPreferencesStatus(null);
    try {
      const saved = await settingsService.updatePreferences(updates);
      setPreferences(saved);
      setPreferencesStatus({ message: 'Preferences saved.' });
    } catch (error) {
      setPreferences(previous);
      setPreferencesStatus({ error: true, message: errorMessage(error, 'Preferences could not be saved.') });
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={isAdmin ? 'Your account, notification alerts, and staffing defaults.' : 'Your account, notification alerts, and profile privacy.'}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Account" subtitle="How you appear across TalentIQ" action={<UserRound className="h-5 w-5 text-[#687A73]" />}>
          <form onSubmit={saveAccount} className="space-y-4">
            <label className="block text-xs font-medium text-[#42544E]">
              Full name
              <input className={inputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} required />
            </label>
            <label className="block text-xs font-medium text-[#42544E]">
              Email
              <input className={inputClass} value={user?.email || ''} readOnly />
            </label>
            <label className="block text-xs font-medium text-[#42544E]">
              Role
              <input className={inputClass} value={user?.roleLabel || ''} readOnly />
            </label>
            {!isAdmin && (
              <p className="text-xs text-[#687A73]">
                Job title, bio, photo, and LinkedIn/GitHub links are edited on <button type="button" onClick={() => navigate('/employee/profile')} className="font-semibold text-[#075E4F] hover:underline">My Profile</button>.
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <Status state={accountStatus} />
              <Button type="submit" icon={Save} loading={accountSaving} disabled={!fullName.trim() || fullName.trim() === user?.name} className="ml-auto">Save</Button>
            </div>
          </form>
        </Card>

        <Card title="Password" subtitle="Use at least 8 characters" action={<KeyRound className="h-5 w-5 text-[#687A73]" />}>
          <form onSubmit={changePassword} className="space-y-4">
            <label className="block text-xs font-medium text-[#42544E]">
              Current password
              <input className={inputClass} type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required />
            </label>
            <label className="block text-xs font-medium text-[#42544E]">
              New password
              <input className={inputClass} type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required />
            </label>
            <label className="block text-xs font-medium text-[#42544E]">
              Confirm new password
              <input className={inputClass} type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required />
            </label>
            <div className="flex items-center justify-between gap-3">
              <Status state={passwordStatus} />
              <Button type="submit" icon={KeyRound} loading={passwordSaving} className="ml-auto">Change password</Button>
            </div>
          </form>
        </Card>

        <Card title="Notifications" subtitle="Choose which alerts reach your inbox" action={<Bell className="h-5 w-5 text-[#687A73]" />}>
          {preferencesLoading ? (
            <p className="text-sm text-[#687A73]" aria-busy="true">Loading preferences...</p>
          ) : preferences ? (
            <div className="divide-y divide-[#E8EFEA]">
              {NOTIFICATION_OPTIONS[roleKey].map((option) => (
                <Toggle
                  key={option.key}
                  label={option.label}
                  description={option.description}
                  checked={Boolean(preferences.notifications?.[option.key])}
                  disabled={preferencesSaving}
                  onChange={(checked) => savePreferences({ notifications: { [option.key]: checked } })}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-4"><Status state={preferencesStatus} /></div>
        </Card>

        {preferences && (isAdmin ? (
          <Card title="Staffing defaults" subtitle="Used by recommendations and workload alerts" action={<SlidersHorizontal className="h-5 w-5 text-[#687A73]" />}>
            <div className="space-y-5">
              <label className="block text-xs font-medium text-[#42544E]">
                Candidates per recommendation run
                <select className={inputClass} value={preferences.recommendation_top_n} disabled={preferencesSaving} onChange={(event) => savePreferences({ recommendation_top_n: Number(event.target.value) })}>
                  {[5, 10, 15, 20, 30].map((value) => <option key={value} value={value}>{value} candidates</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#42544E]">
                Workload warning threshold
                <span className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={preferences.workload_warning_threshold}
                    onChange={(event) => setPreferences({ ...preferences, workload_warning_threshold: Number(event.target.value) })}
                    onMouseUp={(event) => savePreferences({ workload_warning_threshold: Number(event.target.value) })}
                    onKeyUp={(event) => savePreferences({ workload_warning_threshold: Number(event.target.value) })}
                    onTouchEnd={(event) => savePreferences({ workload_warning_threshold: Number(event.target.value) })}
                    className="w-full accent-[#13816D]"
                  />
                  <span className="w-12 text-right text-sm font-semibold tabular-nums text-[#10221E]">{preferences.workload_warning_threshold}%</span>
                </span>
                <span className="mt-1 block font-normal text-[#687A73]">You and the employee are alerted when an approved assignment takes them to this utilization or above.</span>
              </label>
            </div>
          </Card>
        ) : (
          <Card title="Profile privacy" subtitle="What managers see on your profile" action={<SlidersHorizontal className="h-5 w-5 text-[#687A73]" />}>
            <Toggle
              label="Show my LinkedIn, GitHub, and portfolio links"
              description="Managers see these links when they open your profile from recommendations or team views."
              checked={Boolean(preferences.show_profile_links)}
              disabled={preferencesSaving}
              onChange={(checked) => savePreferences({ show_profile_links: checked })}
            />
          </Card>
        ))}

        <Card title="Session" subtitle={`Signed in as ${user?.email || ''}`} action={<LogOut className="h-5 w-5 text-[#687A73]" />}>
          <p className="text-sm text-[#687A73]">Sign out of TalentIQ on this device.</p>
          <Button className="mt-4" variant="danger" icon={LogOut} onClick={handleLogout}>Sign out</Button>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
