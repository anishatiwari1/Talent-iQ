import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { ProjectStageBar, ProjectStageTracker } from '../../components/common/ProjectStages';
import { projectService } from '../../services/projectService';
import { skillService } from '../../services/skillService';
import { EmployeeLink } from '../../context/EmployeeProfileContext';

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ProjectTeamCard = ({ projectId, projectStatus }) => {
  const [staffing, setStaffing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    projectService.getProjectStaffing(projectId)
      .then((data) => { if (!cancelled) setStaffing(data); })
      .catch(() => { if (!cancelled) setError('The project team could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, projectStatus]);

  return (
    <Card className="lg:col-span-3" title="Project team" subtitle="Click a name to view the full profile">
      {loading ? (
        <p className="text-sm text-[#687A73]" aria-busy="true">Loading team...</p>
      ) : error ? (
        <p role="alert" className="text-sm text-rose-700">{error}</p>
      ) : staffing.length === 0 ? (
        <p className="text-sm text-[#687A73]">{projectStatus?.toUpperCase() === 'COMPLETED' ? 'This project has been delivered; its team has been released.' : 'Nobody is staffed on this project yet.'}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staffing.map((member) => (
            <li key={member.employeeId} className="rounded-md border border-[#E8EFEA] p-3">
              <EmployeeLink employeeId={member.employeeId} className="text-sm font-semibold text-[#10221E]">{member.name}</EmployeeLink>
              <p className="mt-1 text-xs text-[#687A73]">{[member.role, `${member.allocation}% allocation`].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const inputClassName = 'mt-1 w-full rounded-md border border-[#DCE5DF] bg-white px-3 py-2 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA]';

const displayLabel = (value) => (value || '').replaceAll('_', ' ');

const getBadgeVariant = (value, kind) => {
  const normalized = (value || '').toLowerCase();
  if (kind === 'priority') {
    if (normalized === 'critical') return 'danger';
    if (normalized === 'high') return 'warning';
    return 'default';
  }
  if (normalized === 'active') return 'success';
  if (normalized === 'planning') return 'primary';
  if (normalized === 'archived' || normalized === 'completed') return 'default';
  return 'info';
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

function ProjectForm({ project, onSubmit, onCancel, submitting, submitLabel }) {
  const [values, setValues] = useState(() => ({
    name: project?.name || '',
    description: project?.description || '',
    department: project?.department || '',
    status: project?.status?.toUpperCase() || 'PLANNING',
    priority: project?.priority?.toUpperCase() || 'MEDIUM',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    teamSize: project?.teamSize ?? '',
    requiredSkills: project?.requiredSkills || [],
  }));
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [importance, setImportance] = useState('IMPORTANT');
  const [requiredProficiency, setRequiredProficiency] = useState(3);

  useEffect(() => {
    let cancelled = false;
    skillService.listSkills()
      .then((items) => {
        if (!cancelled) {
          setSkills(items);
          setSelectedSkillId(items[0] ? String(items[0].id) : '');
        }
      })
      .catch((error) => {
        if (!cancelled) setSkillsError(errorMessage(error, 'The skill catalog could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setSkillsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const setField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const addRequiredSkill = () => {
    const skillId = Number(selectedSkillId);
    if (!skillId || values.requiredSkills.some((skill) => skill.skillId === skillId)) return;
    setValues((current) => ({
      ...current,
      requiredSkills: [...current.requiredSkills, {
        skillId,
        requiredProficiency: Number(requiredProficiency),
        importance,
      }],
    }));
  };

  const removeRequiredSkill = (skillId) => {
    setValues((current) => ({
      ...current,
      requiredSkills: current.requiredSkills.filter((skill) => skill.skillId !== skillId),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      ...values,
      name: values.name.trim(),
      department: values.department.trim(),
      description: values.description.trim(),
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      teamSize: values.teamSize === '' ? null : Number(values.teamSize),
      requiredSkills: values.requiredSkills,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-[#42544E]">
          Project name
          <input className={inputClassName} name="name" value={values.name} onChange={setField} maxLength={150} required />
        </label>
        <label className="text-sm font-medium text-[#42544E]">
          Department
          <input className={inputClassName} name="department" value={values.department} onChange={setField} maxLength={100} required />
        </label>
        <label className="text-sm font-medium text-[#42544E]">
          Status
          <select className={inputClassName} name="status" value={values.status} onChange={setField} required>
            {[...new Set([...PROJECT_STATUSES, values.status])].filter(Boolean).map((status) => (
              <option key={status} value={status}>{displayLabel(status)}</option>
            ))}
          </select>
          {values.status === 'COMPLETED' && (
            <span className="mt-1 block text-xs font-normal text-[#687A73]">Completing a project frees its team and counts it as delivered on each member's profile.</span>
          )}
        </label>
        <label className="text-sm font-medium text-[#42544E]">
          Priority
          <select className={inputClassName} name="priority" value={values.priority} onChange={setField} required>
            {[...new Set([...PROJECT_PRIORITIES, values.priority])].filter(Boolean).map((priority) => (
              <option key={priority} value={priority}>{displayLabel(priority)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-[#42544E]">
          Required team size
          <input className={inputClassName} name="teamSize" type="number" step="1" value={values.teamSize} onChange={setField} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[#42544E]">
            Start date
            <input className={inputClassName} name="startDate" type="date" value={values.startDate} onChange={setField} />
          </label>
          <label className="text-sm font-medium text-[#42544E]">
            End date
            <input className={inputClassName} name="endDate" type="date" value={values.endDate} onChange={setField} />
          </label>
        </div>
      </div>
      <label className="block text-sm font-medium text-[#42544E]">
        Description
        <textarea className={`${inputClassName} min-h-28 resize-y`} name="description" value={values.description} onChange={setField} rows={4} />
      </label>
      <section className="space-y-4 border-t border-[#E8EFEA] pt-5" aria-labelledby="required-skills-title">
        <div>
          <h2 id="required-skills-title" className="text-sm font-semibold text-[#10221E]">Required Skills</h2>
          <p className="mt-1 text-xs text-[#687A73]">Choose the skills and proficiency levels needed for this project.</p>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(160px,0.8fr)_minmax(170px,0.8fr)_auto]">
          <label className="text-xs font-medium text-[#42544E]">
            Skill
            <select className={inputClassName} value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} disabled={skillsLoading || Boolean(skillsError) || skills.length === 0}>
              {skills.length === 0 && <option value="">{skillsLoading ? 'Loading skills...' : 'No skills available'}</option>}
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id} disabled={values.requiredSkills.some((requiredSkill) => requiredSkill.skillId === skill.id)}>
                  {skill.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#42544E]">
            Importance
            <select className={inputClassName} value={importance} onChange={(event) => setImportance(event.target.value)}>
              <option value="MUST_HAVE">Must have</option>
              <option value="IMPORTANT">Important</option>
              <option value="NICE_TO_HAVE">Nice to have</option>
            </select>
          </label>
          <label className="text-xs font-medium text-[#42544E]">
            Required proficiency
            <select className={inputClassName} value={requiredProficiency} onChange={(event) => setRequiredProficiency(Number(event.target.value))}>
              <option value={1}>1 · Basic</option>
              <option value={2}>2 · Beginner</option>
              <option value={3}>3 · Intermediate</option>
              <option value={4}>4 · Advanced</option>
              <option value={5}>5 · Expert</option>
            </select>
          </label>
          <Button type="button" icon={Plus} onClick={addRequiredSkill} disabled={!selectedSkillId || skillsLoading || Boolean(skillsError) || values.requiredSkills.some((skill) => skill.skillId === Number(selectedSkillId))}>
            Add skill
          </Button>
        </div>
        {skillsError && <p role="alert" className="text-sm text-rose-700">{skillsError}</p>}
        {values.requiredSkills.length > 0 ? (
          <ul className="divide-y divide-[#E8EFEA] rounded-md border border-[#DCE5DF] bg-white px-4">
            {values.requiredSkills.map((requiredSkill) => {
              const skill = skills.find((item) => item.id === requiredSkill.skillId);
              return (
                <li key={requiredSkill.skillId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#10221E]">{skill?.name || requiredSkill.name}</p>
                    <p className="mt-1 text-xs text-[#687A73]">
                      {requiredSkill.importance.replaceAll('_', ' ')} · Level {requiredSkill.requiredProficiency} · {['Basic', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][requiredSkill.requiredProficiency - 1]}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" icon={Trash2} onClick={() => removeRequiredSkill(requiredSkill.skillId)} aria-label={`Remove ${skill?.name || 'required skill'}`}>
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[#687A73]">No required skills added.</p>
        )}
      </section>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8EFEA] pt-4">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await projectService.getProjects();
        if (!cancelled) setProjects(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const departments = [...new Set(projects.map((project) => project.department).filter(Boolean))].sort();
  const statuses = [...new Set(projects.map((project) => project.status).filter(Boolean))].sort();
  const priorities = [...new Set(projects.map((project) => project.priority).filter(Boolean))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    const searchable = `${project.name} ${project.department} ${project.description || ''}`.toLowerCase();
    return (!normalizedSearch || searchable.includes(normalizedSearch))
      && (departmentFilter === 'All' || project.department === departmentFilter)
      && (statusFilter === 'All' || project.status === statusFilter)
      && (priorityFilter === 'All' || project.priority === priorityFilter);
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Manage project details, timelines, and staffing targets."
        actions={<Button icon={Plus} onClick={() => navigate('/admin/projects/create')}>Create project</Button>}
      />

      <Card bodyClassName="p-0">
        <div className="grid grid-cols-1 gap-3 border-b border-[#E8EFEA] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(140px,180px))]">
          <label className="relative block">
            <span className="sr-only">Search projects</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687A73]" />
            <input
              className={`${inputClassName} mt-0 pl-9`}
              placeholder="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#687A73]">
            Department
            <select className={inputClassName} value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="All">All departments</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[#687A73]">
            Status
            <select className={inputClassName} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[#687A73]">
            Priority
            <select className={inputClassName} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="All">All priorities</option>
              {priorities.map((priority) => <option key={priority} value={priority}>{displayLabel(priority)}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse border-b border-[#E8EFEA] py-4 last:border-0">
                <div className="h-4 w-48 rounded bg-[#E8EFEA]" />
                <div className="mt-3 h-3 w-64 rounded bg-[#F1F5F2]" />
              </div>
            ))}
            <p className="text-sm text-[#687A73]">Loading projects...</p>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[#10221E]">Projects could not be loaded</p>
            <p className="mt-1 text-sm text-[#687A73]">Check your connection and try again.</p>
            <Button className="mt-5" variant="outline" icon={RotateCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DFF2EA] text-[#075E4F]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#10221E]">No projects yet</p>
            <p className="mt-1 text-sm text-[#687A73]">Create a project to begin managing its timeline and staffing target.</p>
            <Button className="mt-5" icon={Plus} onClick={() => navigate('/admin/projects/create')}>Create project</Button>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[#10221E]">No matching projects</p>
            <p className="mt-1 text-sm text-[#687A73]">Adjust the search or filters to see projects.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8EFEA] px-4 sm:px-5">
            {visibleProjects.map((project) => {
              const staffedCount = project.assignedTeam?.length ?? 0;
              const staffing = project.teamSize == null
                ? `${staffedCount} staffed`
                : `${staffedCount} / ${project.teamSize} staffed`;
              const startDate = formatDate(project.startDate);
              const endDate = formatDate(project.endDate);

              return (
                <div key={project.id} className="grid grid-cols-1 gap-4 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(150px,0.7fr)_minmax(130px,0.7fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-[#10221E]">{project.name}</h2>
                    <p className="mt-1 text-xs text-[#687A73]">{project.department}</p>
                    <ProjectStageBar project={project} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getBadgeVariant(project.status, 'status')}>{displayLabel(project.status)}</Badge>
                    <Badge variant={getBadgeVariant(project.priority, 'priority')}>{displayLabel(project.priority)}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-[#42544E]">
                    <p className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#687A73]" />{staffing}</p>
                    <p className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#687A73]" />{startDate || endDate ? `${startDate || 'Not set'} – ${endDate || 'Not set'}` : 'Dates not set'}</p>
                  </div>
                  <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right" onClick={() => navigate(`/admin/projects/${project.id}`)}>
                    Details
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {!loading && !error && projects.length > 0 && (
        <p className="mt-3 text-right text-xs text-[#687A73]">
          Showing {visibleProjects.length} of {projects.length} projects
        </p>
      )}
    </div>
  );
};

export const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createProject = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      await projectService.createProject(values);
      navigate('/admin/projects');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Project could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create project"
        subtitle="Set project details, timeline, and staffing target."
        actions={<Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/projects')}>Back to projects</Button>}
      />
      <Card className="max-w-4xl" title="Project details">
        {error && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <ProjectForm
          onSubmit={createProject}
          onCancel={() => navigate('/admin/projects')}
          submitting={submitting}
          submitLabel="Create project"
        />
      </Card>
    </div>
  );
};

export const ProjectDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await projectService.getProjectById(id);
        if (!cancelled) setProject(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [id, reloadCount]);

  const updateProject = async (values) => {
    setSubmitting(true);
    setActionError('');
    try {
      const updated = await projectService.updateProject(id, values);
      setProject(updated);
      setEditing(false);
    } catch (requestError) {
      setActionError(errorMessage(requestError, 'Project could not be updated.'));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStage = async (stage) => {
    setStageSaving(true);
    setStageError('');
    try {
      setProject(await projectService.updateStage(id, stage));
    } catch (requestError) {
      setStageError(errorMessage(requestError, 'The stage could not be updated.'));
    } finally {
      setStageSaving(false);
    }
  };

  const archiveProject = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      const archived = await projectService.archiveProject(id);
      setProject(archived);
      setConfirmArchive(false);
    } catch (requestError) {
      setActionError(errorMessage(requestError, 'Project could not be archived.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-[#687A73]" aria-live="polite">Loading project details...</div>;
  }

  if (error || !project) {
    return (
      <div role="alert" className="rounded-xl border border-[#DCE5DF] bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-[#10221E]">Project details could not be loaded</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/projects')}>Back to projects</Button>
          <Button icon={RotateCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
        </div>
      </div>
    );
  }

  const archived = project.status?.toLowerCase() === 'archived';
  const staffedCount = project.assignedTeam?.length ?? 0;

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={project.department}
        actions={(
          <>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/projects')}>All projects</Button>
            <Button variant="secondary" icon={Sparkles} onClick={() => navigate(`/admin/projects/${project.id}/recommendations`)}>AI recommendations</Button>
            {!editing && <Button variant="outline" onClick={() => { setActionError(''); setEditing(true); }}>Edit</Button>}
            {!editing && !archived && <Button variant="danger" icon={Archive} onClick={() => { setActionError(''); setConfirmArchive(true); }}>Archive</Button>}
          </>
        )}
      />

      {actionError && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}

      {editing ? (
        <Card className="max-w-4xl" title="Edit project" subtitle="Update fields supported by the Projects API.">
          <ProjectForm
            project={project}
            onSubmit={updateProject}
            onCancel={() => setEditing(false)}
            submitting={submitting}
            submitLabel="Save changes"
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {confirmArchive && (
            <div role="alertdialog" aria-modal="true" aria-labelledby="archive-title" className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="archive-title" className="text-sm font-semibold text-[#10221E]">Archive this project?</h2>
                <p className="mt-1 text-sm text-[#687A73]">The Projects API will change its status to Archived.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmArchive(false)} disabled={submitting}>Cancel</Button>
                <Button variant="danger" icon={Archive} onClick={archiveProject} loading={submitting}>Confirm archive</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ProjectStageTracker project={project} onStageChange={changeStage} saving={stageSaving} error={stageError} />

            <Card className="lg:col-span-2" title="Project overview">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getBadgeVariant(project.status, 'status')}>{displayLabel(project.status)}</Badge>
                <Badge variant={getBadgeVariant(project.priority, 'priority')}>{displayLabel(project.priority)}</Badge>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#42544E]">
                {project.description || 'No description provided.'}
              </p>
              <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E8EFEA] pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[#687A73]">Required team size</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{project.teamSize ?? 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[#687A73]">Staffed</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{staffedCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[#687A73]">Start date</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{formatDate(project.startDate) || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[#687A73]">End date</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#10221E]">{formatDate(project.endDate) || 'Not specified'}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Required skills" subtitle="Project capability requirements">
              {project.requiredSkills.length === 0 ? (
                <p className="text-sm text-[#687A73]">No required skills are listed.</p>
              ) : (
                <ul className="divide-y divide-[#E8EFEA]">
                  {project.requiredSkills.map((skill) => (
                    <li key={skill.skillId} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm font-semibold text-[#10221E]">{skill.name}</p>
                      <p className="mt-1 text-xs text-[#687A73]">
                        {displayLabel(skill.importance)} · Proficiency {skill.requiredProficiency}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <ProjectTeamCard projectId={id} projectStatus={project.status} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;