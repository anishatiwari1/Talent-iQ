import React, { useEffect, useState } from 'react';
import {
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Github,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  MessageSquareText,
  RefreshCw,
  X,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { employeeService } from '../../services/employeeService';
import { documentService } from '../../services/documentService';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const formatStatus = (status) => (status || 'Unknown').replaceAll('_', ' ');

const statusVariant = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE': return 'success';
    case 'PARTIALLY_AVAILABLE': return 'warning';
    case 'UNAVAILABLE': return 'danger';
    case 'COMPLETED': return 'success';
    case 'ACTIVE': return 'primary';
    default: return 'default';
  }
};

export const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const Section = ({ title, subtitle, children, action }) => (
  <section className="rounded-lg border border-[#DCE5DF] bg-white p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#10221E]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[#687A73]">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ProfileLink = ({ href, icon: Icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE5DF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#063C32] hover:border-[#13816D] hover:bg-[#F4FAF7]"
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
    <ExternalLink className="h-3 w-3 text-[#9BB0A6]" />
  </a>
);

export const openCertificateDocument = async (documentId) => {
  const response = await documentService.downloadDocument(documentId);
  const url = URL.createObjectURL(response.data);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// Full capability profile shown to managers wherever an employee's name
// appears: photo, bio, links, delivered projects, experience, skills and
// verified credentials.
export const EmployeeProfileDrawer = ({ employeeId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setHistoryError('');

    Promise.allSettled([
      employeeService.getEmployeeById(employeeId),
      employeeService.getEmployeeProjectHistory(employeeId),
    ]).then(([profileResult, historyResult]) => {
      if (cancelled) return;
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      else setError(errorMessage(profileResult.reason, 'Employee profile could not be loaded.'));
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
      else setHistoryError(errorMessage(historyResult.reason, 'Project history could not be loaded.'));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [employeeId, reloadCount]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const viewCertificate = async (documentId) => {
    setDocumentError('');
    try {
      await openCertificateDocument(documentId);
    } catch (requestError) {
      setDocumentError(errorMessage(requestError, 'The certificate file could not be opened.'));
    }
  };

  const [capacityAction, setCapacityAction] = useState('');
  const [capacityError, setCapacityError] = useState('');

  const decideCapacity = async (action) => {
    setCapacityAction(action);
    setCapacityError('');
    try {
      const availability = await employeeService.decideCapacityRequest(employeeId, action);
      setProfile((current) => ({ ...current, availabilityDetails: availability }));
    } catch (requestError) {
      setCapacityError(errorMessage(requestError, 'The capacity request could not be updated.'));
    } finally {
      setCapacityAction('');
    }
  };

  const hasLinks = profile &&(profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl || profile.email);
  const otherHistory = history.filter((item) => item.status !== 'COMPLETED');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Close employee profile" onClick={onClose} className="absolute inset-0 bg-[#10221E]/45" />
      <aside role="dialog" aria-modal="true" aria-labelledby="employee-profile-title" className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[#DCE5DF] bg-[#F9FBF8] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#DCE5DF] bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={profile?.name} src={profile?.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-[#687A73]">Employee profile</p>
              <h2 id="employee-profile-title" className="mt-0.5 truncate text-lg font-bold text-[#10221E]">{profile?.name || 'Loading profile...'}</h2>
              {profile && (
                <p className="mt-0.5 truncate text-xs text-[#687A73]">
                  {[profile.role, profile.department, profile.id].filter(Boolean).join(' · ')}
                </p>
              )}
              {profile?.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#687A73]"><MapPin className="h-3 w-3" />{profile.location}</p>
              )}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#42544E] hover:bg-[#F1F5F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
          {loading ? (
            <div className="space-y-3" aria-live="polite" aria-busy="true">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-[#EEF3EF]" />)}
              <p className="text-sm text-[#687A73]">Loading employee profile...</p>
            </div>
          ) : error ? (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-rose-700">{error}</p>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
            </div>
          ) : profile && (
            <>
              <section aria-label="Profile highlights" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Delivered projects', value: profile.deliveredProjectsCount, highlight: true },
                  { label: 'Experience', value: `${profile.experience} yrs` },
                  { label: 'Active projects', value: profile.activeProjectsCount },
                  { label: 'Utilization', value: `${profile.workload}%` },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-lg border p-3 ${stat.highlight ? 'border-[#C3E7D8] bg-[#DFF2EA]/50' : 'border-[#DCE5DF] bg-white'}`}>
                    <p className="text-[11px] font-medium text-[#687A73]">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-[#10221E]">{stat.value}</p>
                  </div>
                ))}
              </section>

              <Section
                title="Profile summary"
                action={<Badge variant={statusVariant(profile.availabilityStatus)}>{formatStatus(profile.availabilityStatus)}</Badge>}
              >
                {profile.bio
                  ? <p className="whitespace-pre-wrap text-sm leading-6 text-[#42544E]">{profile.bio}</p>
                  : <p className="text-sm text-[#687A73]">No bio added yet.</p>}
                {profile.expertiseAreas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profile.expertiseAreas.map((area) => <Badge key={area} variant="info">{area}</Badge>)}
                  </div>
                )}
                {hasLinks && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8EFEA] pt-4">
                    {profile.linkedinUrl && <ProfileLink href={profile.linkedinUrl} icon={Linkedin} label="LinkedIn" />}
                    {profile.githubUrl && <ProfileLink href={profile.githubUrl} icon={Github} label="GitHub" />}
                    {profile.portfolioUrl && <ProfileLink href={profile.portfolioUrl} icon={Globe} label="Portfolio" />}
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE5DF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#063C32] hover:border-[#13816D] hover:bg-[#F4FAF7]">
                        <Mail className="h-3.5 w-3.5" />{profile.email}
                      </a>
                    )}
                  </div>
                )}
              </Section>

              {profile.availabilityDetails?.requested_capacity_hours && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4" aria-label="Pending capacity request">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]">
                    <Clock className="h-4 w-4 text-amber-700" />Capacity change requested
                  </p>
                  <p className="mt-2 text-sm text-[#42544E]">
                    {profile.name.split(' ')[0]} asks to go from <span className="font-semibold tabular-nums">{profile.availabilityDetails.weekly_capacity_hours} h</span> to <span className="font-semibold tabular-nums">{profile.availabilityDetails.requested_capacity_hours} h</span> per week.
                  </p>
                  {profile.availabilityDetails.capacity_request_reason && (
                    <p className="mt-1 text-xs text-[#687A73]">Reason: “{profile.availabilityDetails.capacity_request_reason}”</p>
                  )}
                  {capacityError && <p role="alert" className="mt-2 text-xs text-rose-700">{capacityError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" icon={Check} loading={capacityAction === 'APPROVE'} disabled={Boolean(capacityAction)} onClick={() => decideCapacity('APPROVE')}>Approve</Button>
                    <Button size="sm" variant="outline" icon={X} loading={capacityAction === 'REJECT'} disabled={Boolean(capacityAction)} onClick={() => decideCapacity('REJECT')}>Decline</Button>
                  </div>
                </section>
              )}

              {(profile.availabilityDetails?.notes || profile.availabilityDetails?.available_from) && (
                <section className="rounded-lg border border-[#C9DDEA] bg-[#E9F2F7] p-4" aria-label="Availability note from employee">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]">
                    <MessageSquareText className="h-4 w-4 text-[#497B9B]" />Availability note from {profile.name.split(' ')[0]}
                  </p>
                  {profile.availabilityDetails.available_from && (
                    <p className="mt-2 text-xs text-[#42544E]">Available from <span className="font-semibold">{formatDate(profile.availabilityDetails.available_from)}</span></p>
                  )}
                  {profile.availabilityDetails.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#42544E]">“{profile.availabilityDetails.notes}”</p>
                  )}
                  <p className="mt-2 text-xs text-[#687A73]">
                    Weekly capacity {profile.availabilityDetails.weekly_capacity_hours} h · {profile.availabilityDetails.allocated_hours} h allocated
                  </p>
                </section>
              )}

              <Section title="Successfully delivered projects" subtitle={`${profile.deliveredProjectsCount} completed project${profile.deliveredProjectsCount === 1 ? '' : 's'}`}>
                {profile.deliveredProjects.length === 0 ? (
                  <p className="text-sm text-[#687A73]">No completed projects on record yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {profile.deliveredProjects.map((project) => (
                      <li key={project.projectId} className="rounded-md border border-[#E8EFEA] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]">
                            <CheckCircle2 className="h-4 w-4 text-[#13816D]" />{project.name}
                          </p>
                          <span className="text-xs text-[#687A73]">{formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#687A73]">{[project.role, project.department, `${project.allocation}% allocation`].filter(Boolean).join(' · ')}</p>
                        {project.description && <p className="mt-2 text-xs leading-5 text-[#42544E]">{project.description}</p>}
                        {project.technologies.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {project.technologies.map((tech) => <Badge key={tech} size="sm" variant="primary">{tech}</Badge>)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Skills" subtitle={`${profile.skills.length} recorded`}>
                {profile.skills.length ? (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {profile.skills.map((skill) => (
                      <li key={skill.skillId}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#10221E]">{skill.name}</span>
                          <span className="tabular-nums text-[#687A73]">{skill.proficiencyLevel}/5 · {skill.yearsOfExperience}y</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8EFEA]" aria-hidden="true">
                          <div className="h-full rounded-full bg-[#13816D]" style={{ width: `${skill.score}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-[#687A73]">No skills recorded.</p>}
              </Section>

              <Section title="Experience" subtitle="Project assignments and résumé projects">
                {historyError && <p role="alert" className="mb-2 text-sm text-rose-700">{historyError}</p>}
                {otherHistory.length === 0 && profile.resumeProjects.length === 0 ? (
                  <p className="text-sm text-[#687A73]">No other project experience recorded.</p>
                ) : (
                  <ul className="divide-y divide-[#E8EFEA]">
                    {otherHistory.map((project) => (
                      <li key={`ep-${project.id}`} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]"><Briefcase className="h-3.5 w-3.5 text-[#687A73]" />{project.project_name}</p>
                          <Badge variant={statusVariant(project.status)}>{formatStatus(project.status)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#687A73]">
                          {[project.role_on_project, `${project.allocation_percentage}% allocation`, `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`].filter(Boolean).join(' · ')}
                        </p>
                      </li>
                    ))}
                    {profile.resumeProjects.map((project) => (
                      <li key={`rp-${project.id}`} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]"><FileText className="h-3.5 w-3.5 text-[#687A73]" />{project.name}</p>
                          <Badge variant="default">From résumé</Badge>
                        </div>
                        {project.description && <p className="mt-1 text-xs leading-5 text-[#42544E]">{project.description}</p>}
                        {project.technologies.length > 0 && <p className="mt-1 text-xs text-[#687A73]">{project.technologies.join(', ')}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Certifications" subtitle={`${profile.certifications.length} recorded`}>
                {documentError && <p role="alert" className="mb-2 text-sm text-rose-700">{documentError}</p>}
                {profile.certifications.length ? (
                  <ul className="divide-y divide-[#E8EFEA]">
                    {profile.certifications.map((certification) => (
                      <li key={certification.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]"><Award className="h-3.5 w-3.5 text-[#C27A42]" />{certification.name}</p>
                          <p className="mt-1 text-xs text-[#687A73]">
                            {[certification.issuer, certification.issueDate && `Issued ${formatDate(certification.issueDate)}`, certification.expiryDate && `Expires ${formatDate(certification.expiryDate)}`].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {certification.credentialUrl && <ProfileLink href={certification.credentialUrl} icon={CheckCircle2} label="Verify" />}
                          {certification.documentId && (
                            <Button variant="outline" size="sm" icon={FileText} onClick={() => viewCertificate(certification.documentId)}>Certificate</Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-[#687A73]">No certifications recorded.</p>}
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default EmployeeProfileDrawer;
