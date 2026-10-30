import React, { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, ListChecks, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { ProjectStageBar, ProjectStageTracker } from '../../components/common/ProjectStages';
import { employeeService } from '../../services/employeeService';
import { projectService } from '../../services/projectService';

const messageFromError = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Your project allocations could not be loaded.';
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatStatus = (status) => (status || 'Unknown').replaceAll('_', ' ');

// Only current staffing can report progress; history is read-only.
const isCurrent = (status) => ['ACTIVE', 'PLANNED'].includes((status || '').toUpperCase());

const statusVariant = (status) => {
  const normalizedStatus = (status || '').toUpperCase();
  if (normalizedStatus === 'ACTIVE') return 'success';
  if (normalizedStatus === 'PLANNED') return 'primary';
  if (normalizedStatus === 'CANCELLED') return 'danger';
  return 'default';
};

export const EmployeeProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  // Project details (stage + history) for current allocations, by id.
  const [details, setDetails] = useState({});
  const [teams, setTeams] = useState({});
  const [trackedId, setTrackedId] = useState(null);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    employeeService.getMyProjectHistory()
      .then(async (history) => {
        const current = history.filter((project) => isCurrent(project.status));
        const [loaded, staffing] = await Promise.all([
          Promise.all(current.map((project) => projectService.getProjectById(project.id).catch(() => null))),
          Promise.all(current.map((project) => projectService.getProjectStaffing(project.id).catch(() => null))),
        ]);
        if (cancelled) return;
        setProjects(history);
        setDetails(Object.fromEntries(loaded.filter(Boolean).map((project) => [project.id, project])));
        setTeams(Object.fromEntries(current.map((project, index) => [project.id, staffing[index]]).filter(([, team]) => team)));
        setTrackedId((id) => id ?? current[0]?.id ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(messageFromError(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadCount]);

  const changeStage = async (stage) => {
    setStageSaving(true);
    setStageError('');
    try {
      const updated = await projectService.updateStage(trackedId, stage);
      setDetails((current) => ({ ...current, [updated.id]: updated }));
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setStageError(typeof detail === 'string' ? detail : 'The project stage could not be updated.');
    } finally {
      setStageSaving(false);
    }
  };

  const tracked = details[trackedId];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Project Allocations"
        subtitle="Your project assignments. Move a current project through its delivery stages as work progresses; your manager is notified."
        actions={(
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Go Back
          </Button>
        )}
      />

      {loading ? (
        <div className="rounded-lg border border-[#DCE5DF] bg-white p-5" aria-live="polite" aria-busy="true">
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EFEA]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#F1F5F2]" />
            <p className="text-xs text-[#687A73]">Loading your project allocations...</p>
          </div>
        </div>
      ) : error ? (
        <Card>
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{error}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="py-8 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-[#9BB0A6]" />
          <h2 className="mt-3 text-sm font-semibold text-[#10221E]">No project allocations</h2>
          <p className="mt-1 text-xs text-[#687A73]">No projects were returned for your employee profile.</p>
        </Card>
      ) : (
        <>
        {tracked && (
          <ProjectStageTracker
            className=""
            title={`Project tracking · ${tracked.name}`}
            project={tracked}
            onStageChange={changeStage}
            saving={stageSaving}
            error={stageError}
          />
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="h-full" bodyClassName="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 text-base font-semibold text-[#10221E]">{project.name}</h2>
                <Badge variant={statusVariant(project.status)}>{formatStatus(project.status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-[#687A73]">{project.role || 'Role not specified'}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#E8EFEA] pt-4">
                <div>
                  <dt className="text-xs text-[#687A73]">Allocation</dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-[#10221E]">
                    {typeof project.allocation === 'number' ? `${project.allocation}%` : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#687A73]">Start date</dt>
                  <dd className="mt-1 text-sm text-[#10221E]">{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#687A73]">End date</dt>
                  <dd className="mt-1 text-sm text-[#10221E]">{formatDate(project.endDate)}</dd>
                </div>
              </dl>
              {teams[project.id]?.length > 0 && (
                <div className="mt-4 border-t border-[#E8EFEA] pt-3">
                  <p className="text-xs text-[#687A73]">Team ({teams[project.id].length})</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {teams[project.id].map((member) => (
                      <li key={member.employeeId}><Badge variant="default">{member.name}</Badge></li>
                    ))}
                  </ul>
                </div>
              )}
              {details[project.id] && (
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#E8EFEA] pt-3">
                  <ProjectStageBar project={details[project.id]} />
                  <Button
                    variant={trackedId === project.id ? 'secondary' : 'outline'}
                    size="sm"
                    icon={ListChecks}
                    onClick={() => { setTrackedId(project.id); setStageError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={trackedId === project.id}
                  >
                    {trackedId === project.id ? 'Tracking' : 'Update progress'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default EmployeeProjects;