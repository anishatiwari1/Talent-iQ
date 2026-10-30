import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Camera, ExternalLink, FileText, Github, Globe, Link2, Linkedin, MapPin, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { openCertificateDocument } from '../../components/employee/EmployeeProfileDrawer';
import { useAuth } from '../../context/AuthContext';
import { searchCertifications } from '../../data/popularCertifications';
import { employeeService } from '../../services/employeeService';
import { skillService } from '../../services/skillService';
import EmployeeResumeSection, { EmployeeCertificateSection } from './EmployeeResume';

const inputClass = 'mt-1 w-full rounded-md border border-[#CAD8D0] bg-white px-3 py-2 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA] read-only:bg-[#F3F5EF] read-only:text-[#687A73]';

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
  return typeof detail === 'string' ? detail : fallback;
};

const Field = ({ label, icon: Icon, ...props }) => (
  <label className="block text-xs font-medium text-[#42544E]">
    <span className="inline-flex items-center gap-1.5">{Icon && <Icon className="h-3.5 w-3.5 text-[#687A73]" />}{label}</span>
    <input className={inputClass} {...props} />
  </label>
);

const Notice = ({ children, error = false }) => (
  <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-rose-700' : 'text-[#075E4F]'}`}>
    {children}
  </p>
);

const Loading = ({ label }) => (
  <div className="space-y-3" aria-live="polite" aria-busy="true">
    <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EFEA]" />
    <div className="h-3 w-full animate-pulse rounded bg-[#F1F5F2]" />
    <p className="text-xs text-[#687A73]">{label}</p>
  </div>
);

const SectionError = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-rose-700">{message}</p>
    <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>Retry</Button>
  </div>
);

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// Certification name input with suggestions from popular certifications;
// choosing one also fills in the issuer.
const CertificationNameInput = ({ value, onChange, onPick }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = useMemo(() => searchCertifications(value), [value]);
  const showList = open && suggestions.length > 0 && !suggestions.some((item) => item.name === value);

  const pick = (item) => {
    onPick(item);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (!showList) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(suggestions[highlight]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <label className="relative block text-xs font-medium text-[#42544E]">
      Certification name
      <input
        className={inputClass}
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Start typing, e.g. AWS, Azure, PMP, Kubernetes"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        autoComplete="off"
        required
      />
      {showList && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-[#DCE5DF] bg-white py-1 shadow-lg">
          {suggestions.map((item, index) => (
            <li key={item.name} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(item)}
                onMouseEnter={() => setHighlight(index)}
                className={`block w-full px-3 py-2 text-left ${index === highlight ? 'bg-[#DFF2EA]' : ''}`}
              >
                <span className="block text-sm font-medium text-[#10221E]">{item.name}</span>
                <span className="block text-xs font-normal text-[#687A73]">{item.issuer}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="mt-1 block text-[11px] font-normal text-[#687A73]">Pick a popular certification or type your own.</span>
    </label>
  );
};

const EMPTY_CERT = { name: '', issuer: '', credentialId: '', credentialUrl: '', issueDate: '', expiryDate: '', documentId: '' };

export const EmployeeProfile = () => {
  const { refreshUser } = useAuth();
  const photoInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ jobTitle: '', department: '', bio: '', experience: '', location: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [certForm, setCertForm] = useState(EMPTY_CERT);
  const [certSaving, setCertSaving] = useState(false);
  const [certBusyId, setCertBusyId] = useState(null);
  const [certificateDocuments, setCertificateDocuments] = useState([]);

  const fillForm = (data) => setForm({
    jobTitle: data.role || '',
    department: data.department || '',
    bio: data.bio || '',
    experience: data.experience ?? '',
    location: data.location || '',
    linkedinUrl: data.linkedinUrl || '',
    githubUrl: data.githubUrl || '',
    portfolioUrl: data.portfolioUrl || '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    employeeService.getMyProfile().then((data) => {
      if (cancelled) return;
      setProfile(data);
      fillForm(data);
    }).catch((requestError) => {
      if (!cancelled) setLoadError(getErrorMessage(requestError, 'Your profile could not be loaded.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadCount]);

  const flash = (text) => { setError(''); setMessage(text); };
  const fail = (requestError, fallback) => { setMessage(''); setError(getErrorMessage(requestError, fallback)); };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await employeeService.updateMyProfile({
        role: form.jobTitle,
        department: form.department,
        bio: form.bio,
        experience: Number(form.experience),
        location: form.location,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        portfolioUrl: form.portfolioUrl,
      });
      setProfile(updated);
      fillForm(updated);
      refreshUser().catch(() => {});
      flash('Profile updated.');
    } catch (saveError) {
      fail(saveError, 'Your profile could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const updated = await employeeService.uploadMyAvatar(file);
      setProfile(updated);
      refreshUser().catch(() => {});
      flash('Profile photo updated.');
    } catch (uploadError) {
      fail(uploadError, 'The photo could not be uploaded.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const addCertification = async (event) => {
    event.preventDefault();
    setCertSaving(true);
    try {
      const added = await employeeService.addMyCertification(certForm);
      setProfile((current) => ({ ...current, certifications: [...current.certifications, added] }));
      setCertForm(EMPTY_CERT);
      flash('Certification added.');
    } catch (saveError) {
      fail(saveError, 'The certification could not be added.');
    } finally {
      setCertSaving(false);
    }
  };

  const linkDocument = async (certification, documentId) => {
    setCertBusyId(certification.id);
    try {
      const updated = await employeeService.linkCertificationDocument(certification.id, documentId);
      setProfile((current) => ({
        ...current,
        certifications: current.certifications.map((item) => (item.id === updated.id ? updated : item)),
      }));
      flash(documentId ? 'Certificate file linked.' : 'Certificate file unlinked.');
    } catch (linkError) {
      fail(linkError, 'The certificate file could not be linked.');
    } finally {
      setCertBusyId(null);
    }
  };

  const removeCertification = async (certification) => {
    if (!window.confirm(`Remove "${certification.name}" from your profile?`)) return;
    setCertBusyId(certification.id);
    try {
      await employeeService.removeMyCertification(certification.id);
      setProfile((current) => ({ ...current, certifications: current.certifications.filter((item) => item.id !== certification.id) }));
      flash('Certification removed.');
    } catch (removeError) {
      fail(removeError, 'The certification could not be removed.');
    } finally {
      setCertBusyId(null);
    }
  };

  const viewDocument = async (documentId) => {
    try {
      await openCertificateDocument(documentId);
    } catch (viewError) {
      fail(viewError, 'The certificate file could not be opened.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="This is what managers see when they open your profile from recommendations and teams." />
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {loading ? (
        <Card><Loading label="Loading your profile..." /></Card>
      ) : loadError ? (
        <Card><SectionError message={loadError} onRetry={() => setReloadCount((count) => count + 1)} /></Card>
      ) : profile ? (
        <>
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative self-start">
                <Avatar name={profile.name} src={profile.avatarUrl} size="xl" />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#063C32] text-white shadow hover:bg-[#075E4F] disabled:opacity-60"
                >
                  {photoUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={photoInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={uploadPhoto} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[#10221E]">{profile.name}</h2>
                <p className="text-sm text-[#687A73]">{[profile.role, profile.department, profile.id].filter(Boolean).join(' · ')}</p>
                {profile.location && <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#687A73]"><MapPin className="h-3 w-3" />{profile.location}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="success">{profile.deliveredProjectsCount} delivered project{profile.deliveredProjectsCount === 1 ? '' : 's'}</Badge>
                  <Badge variant="primary">{profile.skills.length} skills</Badge>
                  <Badge variant="default">{profile.certifications.length} certifications</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Profile details" subtitle="Name comes from your account (change it in Settings).">
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Name" value={profile.name || ''} readOnly />
                <Field label="Job title" value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} required />
                <Field label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required />
                <Field label="Years of experience" type="number" min="0" max="60" step="1" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} required />
                <Field label="Location" icon={MapPin} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Bengaluru, India" />
              </div>
              <label className="block text-xs font-medium text-[#42544E]">
                Bio / profile summary
                <textarea className={`${inputClass} min-h-28 resize-y`} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="What you work on, what you are good at, and what you want to do next." />
              </label>
              <div className="border-t border-[#E8EFEA] pt-5">
                <h3 className="text-sm font-semibold text-[#10221E]">Links</h3>
                <p className="mt-0.5 text-xs text-[#687A73]">Shown on your profile to managers. You can hide them in Settings.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="LinkedIn" icon={Linkedin} value={form.linkedinUrl} onChange={(event) => setForm({ ...form, linkedinUrl: event.target.value })} placeholder="linkedin.com/in/your-name" />
                  <Field label="GitHub" icon={Github} value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} placeholder="github.com/your-handle" />
                  <Field label="Portfolio / website" icon={Globe} value={form.portfolioUrl} onChange={(event) => setForm({ ...form, portfolioUrl: event.target.value })} placeholder="your-site.dev" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" icon={Save} loading={saving}>Save profile</Button>
              </div>
            </form>
          </Card>

          <Card title="Certifications" subtitle={`${profile.certifications.length} recorded`}>
            {profile.certifications.length ? (
              <ul className="mb-6 divide-y divide-[#E8EFEA]">
                {profile.certifications.map((certification) => (
                  <li key={certification.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]"><Award className="h-4 w-4 text-[#C27A42]" />{certification.name}</p>
                      <p className="mt-1 text-xs text-[#687A73]">
                        {[certification.issuer, certification.credentialId && `Credential ${certification.credentialId}`, certification.issueDate && `Issued ${formatDate(certification.issueDate)}`, certification.expiryDate && `Expires ${formatDate(certification.expiryDate)}`].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {certification.documentId
                          ? <Badge variant="success" dot>Certificate file attached</Badge>
                          : <Badge variant="warning">No certificate file</Badge>}
                        {certification.credentialUrl && (
                          <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#075E4F] hover:underline">
                            Verify credential <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <select
                        aria-label={`Certificate file for ${certification.name}`}
                        className="rounded-md border border-[#CAD8D0] bg-white px-2 py-1.5 text-xs text-[#10221E] outline-none focus:border-[#13816D]"
                        value={certification.documentId || ''}
                        disabled={certBusyId === certification.id}
                        onChange={(event) => linkDocument(certification, event.target.value)}
                      >
                        <option value="">{certificateDocuments.length ? 'Attach uploaded file…' : 'Upload a file below to attach'}</option>
                        {certificateDocuments.map((document) => <option key={document.id} value={document.id}>{document.file_name}</option>)}
                      </select>
                      {certification.documentId && <Button variant="outline" size="sm" icon={FileText} onClick={() => viewDocument(certification.documentId)}>View</Button>}
                      <Button variant="outline" size="sm" icon={Trash2} loading={certBusyId === certification.id} onClick={() => removeCertification(certification)} aria-label={`Remove ${certification.name}`}>Remove</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="mb-6 text-sm text-[#687A73]">No certifications recorded.</p>}
            <form onSubmit={addCertification} className="space-y-4 border-t border-[#E8EFEA] pt-5">
              <h3 className="text-sm font-semibold text-[#10221E]">Add certification</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CertificationNameInput
                  value={certForm.name}
                  onChange={(name) => setCertForm((current) => ({ ...current, name }))}
                  onPick={(item) => setCertForm((current) => ({ ...current, name: item.name, issuer: item.issuer }))}
                />
                <Field label="Issuer" value={certForm.issuer} onChange={(event) => setCertForm({ ...certForm, issuer: event.target.value })} required />
                <Field label="Credential ID" value={certForm.credentialId} onChange={(event) => setCertForm({ ...certForm, credentialId: event.target.value })} />
                <Field label="Verification link" icon={Link2} value={certForm.credentialUrl} onChange={(event) => setCertForm({ ...certForm, credentialUrl: event.target.value })} placeholder="credly.com/badges/..." />
                <Field label="Issue date" type="date" value={certForm.issueDate} onChange={(event) => setCertForm({ ...certForm, issueDate: event.target.value })} />
                <Field label="Expiry date" type="date" value={certForm.expiryDate} onChange={(event) => setCertForm({ ...certForm, expiryDate: event.target.value })} />
                <label className="block text-xs font-medium text-[#42544E] md:col-span-2">
                  Certificate file (optional)
                  <select className={inputClass} value={certForm.documentId} onChange={(event) => setCertForm({ ...certForm, documentId: event.target.value })}>
                    <option value="">{certificateDocuments.length ? 'None' : 'No certificate files uploaded yet — use the upload section below'}</option>
                    {certificateDocuments.map((document) => <option key={document.id} value={document.id}>{document.file_name}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" icon={Plus} loading={certSaving}>Add certification</Button>
              </div>
            </form>
          </Card>
        </>
      ) : (
        <Card><p className="text-sm text-[#687A73]">Profile details are unavailable.</p></Card>
      )}
      <EmployeeResumeSection />
      <EmployeeCertificateSection
        certifications={profile?.certifications || []}
        onDocumentsChange={setCertificateDocuments}
      />
    </div>
  );
};

export const EmployeeSkills = () => {
  const [profile, setProfile] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({ skillId: '', proficiencyLevel: 1, yearsOfExperience: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, skillData] = await Promise.all([employeeService.getMyProfile(), skillService.listSkills()]);
      setProfile(profileData);
      setCatalog(skillData);
      setForm((current) => ({ ...current, skillId: current.skillId || String(skillData[0]?.id || '') }));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Skills could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const addSkill = async (event) => {
    event.preventDefault();
    if (!form.skillId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const addedSkill = await employeeService.addMySkill({
        skillId: Number(form.skillId),
        proficiencyLevel: Number(form.proficiencyLevel),
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      setProfile((current) => ({
        ...current,
        skills: [...current.skills.filter((skill) => skill.skillId !== addedSkill.skillId), addedSkill],
      }));
      setMessage('Skill added or updated.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'The skill could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (skillId) => {
    setRemovingId(skillId);
    setError('');
    setMessage('');
    try {
      await employeeService.removeMySkill(skillId);
      setProfile((current) => ({ ...current, skills: current.skills.filter((skill) => skill.skillId !== skillId) }));
      setMessage('Skill removed.');
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'The skill could not be removed.'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Skills" subtitle="Manage the skills and experience recorded on your profile" />
      {error && profile && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Card title="Add a skill" subtitle="Choose a skill from the available catalog.">
        <form onSubmit={addSkill} className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-medium text-[#42544E]">
            Skill name
            <select className={inputClass} value={form.skillId} onChange={(event) => setForm({ ...form, skillId: event.target.value })} required disabled={loading || catalog.length === 0}>
              {catalog.length === 0 && <option value="">No skills available</option>}
              {catalog.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Proficiency (1-5)
            <input className={inputClass} type="number" min="1" max="5" step="1" value={form.proficiencyLevel} onChange={(event) => setForm({ ...form, proficiencyLevel: event.target.value })} required />
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Years of experience
            <input className={inputClass} type="number" min="0" step="1" value={form.yearsOfExperience} onChange={(event) => setForm({ ...form, yearsOfExperience: event.target.value })} required />
          </label>
          <Button type="submit" icon={Plus} loading={saving} disabled={loading || catalog.length === 0}>Add skill</Button>
        </form>
      </Card>

      <Card title="Recorded skills" subtitle={profile ? `${profile.skills.length} skill${profile.skills.length === 1 ? '' : 's'}` : undefined}>
        {loading ? <Loading label="Loading your skills..." /> : error && !profile ? (
          <SectionError message={error} onRetry={loadData} />
        ) : profile?.skills.length ? (
          <ul className="divide-y divide-[#E8EFEA]">
            {profile.skills.map((skill) => (
              <li key={skill.skillId} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#10221E]">{skill.name}</p>
                  <p className="mt-1 text-xs text-[#687A73]">{skill.category} · Proficiency {skill.proficiencyLevel}/5 · {skill.yearsOfExperience} years</p>
                </div>
                <Button variant="outline" size="sm" icon={Trash2} loading={removingId === skill.skillId} onClick={() => removeSkill(skill.skillId)} aria-label={`Remove ${skill.name}`} title={`Remove ${skill.name}`}>Remove</Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-7 text-center">
            <Award className="mx-auto h-8 w-8 text-[#9BB0A6]" />
            <p className="mt-2 text-sm font-medium text-[#10221E]">No skills recorded</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const statusLabel = (status) => (status || 'UNKNOWN').replaceAll('_', ' ');

export const EmployeeAvailability = () => {
  const [availability, setAvailability] = useState(null);
  const [form, setForm] = useState(null);
  const [request, setRequest] = useState({ hours: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fill = (data) => {
    setAvailability(data);
    setForm({
      available_from: data.available_from || '',
      notes: data.notes || '',
    });
  };

  useEffect(() => {
    let cancelled = false;
    employeeService.getMyAvailability().then((data) => {
      if (!cancelled) fill(data);
    }).catch((loadError) => {
      if (!cancelled) setError(getErrorMessage(loadError, 'Availability could not be loaded.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const saveAvailability = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await employeeService.updateMyAvailability({
        available_from: form.available_from || null,
        notes: form.notes,
      });
      fill(updated);
      setMessage('Availability updated. Your manager has been notified and can see your message on your profile.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Availability could not be updated.'));
    } finally {
      setSaving(false);
    }
  };

  const submitCapacityRequest = async (event) => {
    event.preventDefault();
    setRequesting(true);
    setError('');
    setMessage('');
    try {
      fill(await employeeService.requestCapacityChange(Number(request.hours), request.reason.trim()));
      setRequest({ hours: '', reason: '' });
      setMessage('Capacity change requested. It takes effect once your manager approves it.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'The capacity change could not be requested.'));
    } finally {
      setRequesting(false);
    }
  };

  const withdrawCapacityRequest = async () => {
    setRequesting(true);
    setError('');
    setMessage('');
    try {
      fill(await employeeService.withdrawCapacityRequest());
      setMessage('Capacity request withdrawn.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'The capacity request could not be withdrawn.'));
    } finally {
      setRequesting(false);
    }
  };

  const pending = availability?.requested_capacity_hours;

  return (
    <div className="space-y-6">
      <PageHeader title="Availability" subtitle="Tell your manager when you're available. Your weekly capacity is set by your manager; request a change if your hours change." />
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Card title="Capacity" subtitle="Allocated hours and status update automatically when you are assigned or released">
        {loading ? <Loading label="Loading availability..." /> : availability ? (
          <dl className="grid grid-cols-1 gap-4 rounded-lg border border-[#E8EFEA] bg-[#FAFBF8] p-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[#687A73]">Weekly capacity</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[#10221E]">{availability.weekly_capacity_hours} h</dd>
            </div>
            <div>
              <dt className="text-xs text-[#687A73]">Allocated</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[#10221E]">{availability.allocated_hours} h / week</dd>
            </div>
            <div>
              <dt className="text-xs text-[#687A73]">Utilization</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[#10221E]">{availability.utilization_percentage}%</dd>
            </div>
            <div>
              <dt className="text-xs text-[#687A73]">Status</dt>
              <dd className="mt-1"><Badge variant={availability.status === 'AVAILABLE' ? 'success' : availability.status === 'UNAVAILABLE' ? 'danger' : 'warning'}>{statusLabel(availability.status)}</Badge></dd>
            </div>
          </dl>
        ) : <p className="text-sm text-[#687A73]">Availability details are unavailable.</p>}
      </Card>

      {availability && (
        <Card
          title="Change weekly capacity"
          subtitle="Allocation, workload and project matching are all planned against this number, so a change needs your manager's approval."
          action={pending ? <Badge variant="warning" dot>Pending approval</Badge> : null}
        >
          {pending ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#42544E]">
                <p>You asked to change <span className="font-semibold tabular-nums">{availability.weekly_capacity_hours} h</span> to <span className="font-semibold tabular-nums">{pending} h</span> per week.</p>
                {availability.capacity_request_reason && <p className="mt-1 text-xs text-[#687A73]">Reason: “{availability.capacity_request_reason}”</p>}
              </div>
              <Button variant="outline" size="sm" icon={Trash2} loading={requesting} onClick={withdrawCapacityRequest}>Withdraw request</Button>
            </div>
          ) : (
            <form onSubmit={submitCapacityRequest} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="New weekly capacity (hours)" type="number" min="1" max="80" step="1" value={request.hours} onChange={(event) => setRequest({ ...request, hours: event.target.value })} required />
                <label className="block text-xs font-medium text-[#42544E] md:col-span-2">
                  Reason
                  <input className={inputClass} value={request.reason} minLength={3} maxLength={500} onChange={(event) => setRequest({ ...request, reason: event.target.value })} placeholder="e.g. Moving to a 4-day week from January" required />
                </label>
              </div>
              <div className="flex justify-end">
                <Button type="submit" icon={Save} loading={requesting}>Request change</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {form && (
        <Card title="Availability note" subtitle="Shown to your manager on your profile">
          <form onSubmit={saveAvailability} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Available from (optional)" type="date" value={form.available_from} onChange={(event) => setForm({ ...form, available_from: event.target.value })} />
            </div>
            <label className="block text-xs font-medium text-[#42544E]">
              Message for your manager / HR (optional)
              <textarea className={`${inputClass} min-h-20 resize-y`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="e.g. On leave 12–16 Dec, prefer backend work" />
            </label>
            <div className="flex justify-end">
              <Button type="submit" icon={Save} loading={saving}>Save availability</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default EmployeeProfile;
