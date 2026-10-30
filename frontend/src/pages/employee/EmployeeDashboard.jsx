import React, { useEffect, useState } from 'react';
import { Award, Bell, Briefcase, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { employeeService } from '../../services/employeeService';
import { notificationService } from '../../services/notificationService';
import { NOTIFICATIONS_CHANGED_EVENT } from '../../hooks/useNotifications';

const initialLoading = {
  profile: true,
  availability: true,
  projects: true,
  notifications: true,
  unreadCount: true,
};

const initialErrors = {
  profile: '',
  availability: '',
  projects: '',
  notifications: '',
  unreadCount: '',
};

const messageFromError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const formatDate = (value, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, options);
};

const labelForStatus = (value) => (value || '').replaceAll('_', ' ');

const LoadingState = ({ label }) => (
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

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [projectHistory, setProjectHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(null);
  const [loading, setLoading] = useState(initialLoading);
  const [errors, setErrors] = useState(initialErrors);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(initialLoading);
      setErrors(initialErrors);
      const results = await Promise.allSettled([
        employeeService.getMyProfile(),
        employeeService.getMyAvailability(),
        employeeService.getMyProjectHistory(),
        notificationService.listNotifications(),
        notificationService.getUnreadCount(),
      ]);

      if (cancelled) return;

      const [profileResult, availabilityResult, projectsResult, notificationsResult, unreadResult] = results;
      const nextErrors = { ...initialErrors };

      if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
      else nextErrors.profile = messageFromError(profileResult.reason, 'Profile details could not be loaded.');

      if (availabilityResult.status === 'fulfilled') setAvailability(availabilityResult.value);
      else nextErrors.availability = messageFromError(availabilityResult.reason, 'Availability details could not be loaded.');

      if (projectsResult.status === 'fulfilled') setProjectHistory(projectsResult.value);
      else nextErrors.projects = messageFromError(projectsResult.reason, 'Project history could not be loaded.');

      if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value);
      else nextErrors.notifications = messageFromError(notificationsResult.reason, 'Notifications could not be loaded.');

      if (unreadResult.status === 'fulfilled') setUnreadCount(unreadResult.value);
      else nextErrors.unreadCount = messageFromError(unreadResult.reason, 'Unread notification count could not be loaded.');

      setErrors(nextErrors);
      setLoading({ profile: false, availability: false, projects: false, notifications: false, unreadCount: false });
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  useEffect(() => {
    const refreshDashboard = () => setReloadCount((count) => count + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshDashboard);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshDashboard);
  }, []);

  const retry = () => setReloadCount((count) => count + 1);
  const currentProjects = projectHistory.filter((project) => ['ACTIVE', 'PLANNED'].includes((project.status || '').toUpperCase()));
  const skills = profile?.skills || [];
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile ? `Welcome, ${profile.name}` : 'Employee Dashboard'}
        subtitle={profile ? [profile.role, profile.department].filter(Boolean).join(' · ') : 'Your profile, capacity, projects, and notifications'}
        badge={profile?.status && <Badge variant={profile.status === 'Active' ? 'success' : 'default'} dot>{profile.status}</Badge>}
      />

      {loading.profile ? (
        <div className="rounded-lg border border-[#DCE5DF] bg-white p-4"><LoadingState label="Loading your profile..." /></div>
      ) : errors.profile ? (
        <div className="rounded-lg border border-rose-200 bg-white p-4"><SectionError message={errors.profile} onRetry={retry} /></div>
      ) : profile && (
        <section aria-label="Profile summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border border-[#DCE5DF] bg-white p-4">
            <Avatar name={profile.name} src={profile.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#687A73]">Employee</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#10221E]">{profile.name}</p>
              <p className="mt-0.5 text-xs text-[#687A73]">{profile.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('delivered-projects')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-lg border border-[#C3E7D8] bg-[#DFF2EA]/50 p-4 text-left hover:border-[#13816D]"
          >
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#075E4F]"><CheckCircle2 className="h-3.5 w-3.5" />Successfully delivered</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#10221E]">{profile.deliveredProjectsCount}</p>
            <p className="text-xs text-[#687A73]">completed project{profile.deliveredProjectsCount === 1 ? '' : 's'}</p>
          </button>
          <div className="rounded-lg border border-[#DCE5DF] bg-white p-4">
            <p className="text-xs font-medium text-[#687A73]">Job title</p>
            <p className="mt-1 text-sm font-semibold text-[#10221E]">{profile.role}</p>
          </div>
          <div className="rounded-lg border border-[#DCE5DF] bg-white p-4">
            <p className="text-xs font-medium text-[#687A73]">Department</p>
            <p className="mt-1 text-sm font-semibold text-[#10221E]">{profile.department}</p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Skills" subtitle={loading.profile ? 'Loading profile skills...' : `${skills.length} skill${skills.length === 1 ? '' : 's'} in your profile`}>
          {loading.profile ? (
            <LoadingState label="Loading skills..." />
          ) : errors.profile ? (
            <SectionError message={errors.profile} onRetry={retry} />
          ) : skills.length === 0 ? (
            <div className="py-8 text-center">
              <Award className="mx-auto h-8 w-8 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">No skills listed</p>
              <p className="mt-1 text-xs text-[#687A73]">No skills were returned for your profile.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8EFEA]">
              {skills.slice(0, 8).map((skill) => (
                <li key={skill.skillId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#10221E]">{skill.name}</p>
                    <p className="mt-0.5 text-xs text-[#687A73]">{skill.category}</p>
                  </div>
                  <p className="text-xs text-[#42544E]">Level {skill.proficiencyLevel}/5 · {skill.yearsOfExperience} years experience</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Availability & capacity" subtitle="Values returned by your availability record">
          {loading.availability ? (
            <LoadingState label="Loading availability..." />
          ) : errors.availability ? (
            <SectionError message={errors.availability} onRetry={retry} />
          ) : availability ? (
            <div className="space-y-4">
              {typeof availability.utilization_percentage === 'number' && (
                <div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#42544E]">Utilization</span>
                    <span className="font-semibold tabular-nums text-[#10221E]">{availability.utilization_percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EFEA]" aria-label={`Utilization ${availability.utilization_percentage}%`}>
                    <div className="h-full rounded-full bg-[#13816D]" style={{ width: `${availability.utilization_percentage}%` }} />
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-4 border-t border-[#E8EFEA] pt-4">
                <div>
                  <dt className="text-xs text-[#687A73]">Allocated hours</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{availability.allocated_hours} h</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#687A73]">Weekly capacity</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{availability.weekly_capacity_hours} h</dd>
                </div>
                {availability.status && (
                  <div>
                    <dt className="text-xs text-[#687A73]">Availability status</dt>
                    <dd className="mt-1"><Badge variant="primary">{labelForStatus(availability.status)}</Badge></dd>
                  </div>
                )}
                {availability.available_from && (
                  <div>
                    <dt className="text-xs text-[#687A73]">Available from</dt>
                    <dd className="mt-1 text-sm font-medium text-[#10221E]">{formatDate(availability.available_from)}</dd>
                  </div>
                )}
              </dl>
              {availability.notes && <p className="border-t border-[#E8EFEA] pt-3 text-xs leading-5 text-[#687A73]">{availability.notes}</p>}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#687A73]">No availability record was returned.</p>
          )}
        </Card>

        <Card
          title="Current projects"
          subtitle="Active and planned assignments from your project history"
          className="xl:col-span-2"
          action={<Badge variant="primary">{currentProjects.length}</Badge>}
        >
          {loading.projects ? (
            <LoadingState label="Loading project history..." />
          ) : errors.projects ? (
            <SectionError message={errors.projects} onRetry={retry} />
          ) : currentProjects.length === 0 ? (
            <div className="py-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">No current projects</p>
              <p className="mt-1 text-xs text-[#687A73]">No active or planned projects were returned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {currentProjects.map((project) => (
                <article key={project.id} className="rounded-lg border border-[#DCE5DF] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#10221E]">{project.name}</h3>
                    <Badge variant={project.status === 'ACTIVE' ? 'success' : 'primary'}>{labelForStatus(project.status)}</Badge>
                  </div>
                  {project.role && <p className="mt-1 text-xs text-[#687A73]">{project.role}</p>}
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E8EFEA] pt-3">
                    <div>
                      <dt className="text-[11px] text-[#687A73]">Allocation</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-[#10221E]">{project.allocation}%</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[#687A73]">Timeline</dt>
                      <dd className="mt-1 text-xs text-[#42544E]">
                        {formatDate(project.startDate, { month: 'short', day: 'numeric' }) || 'Not set'} – {formatDate(project.endDate, { month: 'short', day: 'numeric' }) || 'Not set'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Successfully delivered projects"
          subtitle="Projects you saw through to completion — managers see this on your profile"
          className="xl:col-span-2"
          action={<Badge variant="success">{profile?.deliveredProjectsCount ?? 0}</Badge>}
        >
          <div id="delivered-projects" className="scroll-mt-24" />
          {loading.profile ? (
            <LoadingState label="Loading delivered projects..." />
          ) : errors.profile ? (
            <SectionError message={errors.profile} onRetry={retry} />
          ) : !profile?.deliveredProjects.length ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">No delivered projects yet</p>
              <p className="mt-1 text-xs text-[#687A73]">When a manager marks a project you worked on as completed, it will be listed here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {profile.deliveredProjects.map((project) => (
                <article key={project.projectId} className="rounded-lg border border-[#DCE5DF] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10221E]"><CheckCircle2 className="h-4 w-4 text-[#13816D]" />{project.name}</h3>
                    <Badge variant="success">Delivered</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#687A73]">{[project.role, project.department].filter(Boolean).join(' · ')}</p>
                  {project.description && <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#42544E]">{project.description}</p>}
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#E8EFEA] pt-3">
                    <div>
                      <dt className="text-[11px] text-[#687A73]">Allocation</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-[#10221E]">{project.allocation}%</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[#687A73]">Timeline</dt>
                      <dd className="mt-1 text-xs text-[#42544E]">
                        {formatDate(project.startDate, { month: 'short', year: 'numeric' }) || 'Not set'} – {formatDate(project.endDate, { month: 'short', year: 'numeric' }) || 'Not set'}
                      </dd>
                    </div>
                  </dl>
                  {project.technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech) => <Badge key={tech} size="sm" variant="primary">{tech}</Badge>)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Notifications"
          subtitle="Recent messages for your account"
          className="xl:col-span-2"
          action={(
            <div className="flex items-center gap-3">
              {loading.unreadCount
                ? <span className="text-xs text-[#687A73]">Loading count...</span>
                : errors.unreadCount
                  ? <Badge variant="warning">Count unavailable</Badge>
                  : <Badge variant={unreadCount > 0 ? 'warning' : 'success'}>{unreadCount} unread</Badge>}
              <button type="button" onClick={() => navigate('/employee/notifications')} className="text-xs font-semibold text-[#075E4F] hover:underline">View all</button>
            </div>
          )}
        >
          {loading.notifications ? (
            <LoadingState label="Loading notifications..." />
          ) : errors.notifications ? (
            <SectionError message={errors.notifications} onRetry={retry} />
          ) : recentNotifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">No notifications</p>
              <p className="mt-1 text-xs text-[#687A73]">There are no notifications for your account.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E8EFEA]">
              {recentNotifications.map((notification) => (
                <li key={notification.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-[#C3E7D8]' : 'bg-[#13816D]'}`} aria-label={notification.is_read ? 'Read' : 'Unread'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#10221E]">{notification.title}</h3>
                      <time className="text-xs text-[#687A73]" dateTime={notification.created_at}>
                        {formatDate(notification.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#687A73]">{notification.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;