import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Network, RefreshCw } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { skillGapService } from '../../services/skillGapService';

// Every figure on this page is read from the Neo4j knowledge graph:
// employee skills (HAS_SKILL), project requirements (REQUIRES_SKILL) and
// assignments (WORKED_ON). Status only -- no suggested actions.

const tabs = [
  { id: 'organization', label: 'Organization' },
  { id: 'project', label: 'Project' },
];

const LEVEL_NAMES = ['Basic', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

const urgencyStyles = {
  URGENT: { label: 'Urgent', variant: 'danger' },
  IMPORTANT: { label: 'Important', variant: 'warning' },
  MINOR: { label: 'Minor', variant: 'default' },
  NO_GAP: { label: 'No gap', variant: 'success' },
};

const resultStyles = {
  MET: { label: 'Met', variant: 'success' },
  BELOW_LEVEL: { label: 'Below level', variant: 'warning' },
  MISSING: { label: 'Missing', variant: 'danger' },
  NO_STAFF: { label: 'No staff', variant: 'danger' },
};

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const levelLabel = (level) => (
  LEVEL_NAMES[level - 1] ? `${LEVEL_NAMES[level - 1]} (${level})` : String(level)
);

const formatSyncTime = (syncedAt) => {
  if (!syncedAt) return null;
  const parsed = new Date(syncedAt);
  return Number.isNaN(parsed.getTime())
    ? syncedAt
    : parsed.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ styles, value }) => {
  const style = styles[value] || { label: value, variant: 'default' };
  return <Badge variant={style.variant}>{style.label}</Badge>;
};

const CoverageBar = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-sm text-[#9BB0A6]">—</span>;
  const color = value >= 100 ? 'bg-[#13816D]' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="min-w-[72px]">
      <span className="text-xs tabular-nums text-[#42544E]">{value}%</span>
      <div className="mt-1 h-1.5 rounded-full bg-[#F1F5F2]">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(value, 2)}%` }} />
      </div>
    </div>
  );
};

// Column header with an optional one-line hint under the name.
const Th = ({ children, hint, align = 'left' }) => (
  <th className={`pb-3 pr-4 align-bottom ${align === 'right' ? 'text-right' : 'text-left'}`}>
    <span className="block text-xs font-semibold text-[#10221E]">{children}</span>
    {hint && <span className="block text-[11px] font-normal text-[#9BB0A6]">{hint}</span>}
  </th>
);

const Td = ({ children, align = 'left', className = '' }) => (
  <td className={`py-3 pr-4 text-sm text-[#42544E] ${align === 'right' ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>
);

const Kpi = ({ label, value, hint, tone }) => (
  <div className="rounded-lg border border-[#E8EFEA] bg-white p-3">
    <p className="text-xs text-[#687A73]">{label}</p>
    <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === 'good' ? 'text-[#13816D]' : tone === 'bad' ? 'text-rose-700' : 'text-[#10221E]'}`}>{value}</p>
    {hint && <p className="text-[11px] text-[#9BB0A6]">{hint}</p>}
  </div>
);

const KpiRow = ({ children }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{children}</div>
);

const SourceLine = ({ syncedAt }) => {
  const time = formatSyncTime(syncedAt);
  return (
    <p className="flex items-center gap-1.5 text-xs text-[#687A73]">
      <Network className="h-3.5 w-3.5" aria-hidden="true" />
      {time
        ? `Source: knowledge graph · synced ${time}`
        : "Source: knowledge graph · sync time not recorded. Run the graph sync to refresh it."}
    </p>
  );
};

// Result and estimate lines describe the Project tab only.
const Legend = ({ projectDetails = false }) => (
  <Card title="How to read this">
    <div className="space-y-2 text-sm text-[#42544E]">
      <p className="flex flex-wrap items-center gap-2">
        <Badge variant="danger">Urgent</Badge> an essential skill is missing
        <Badge variant="warning">Important</Badge> an important skill is missing
        <Badge variant="default">Minor</Badge> only a nice-to-have is missing
        <Badge variant="success">No gap</Badge> everything needed is there
      </p>
      {projectDetails && (
      <p className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">Below level</Badge> someone has the skill, but not at the level needed
        <Badge variant="danger">Missing</Badge> nobody on the team has it recorded
      </p>
      )}
      {projectDetails && (
      <p className="flex flex-wrap items-center gap-2">
        <Badge variant="info">Likely met</Badge> not recorded, but the knowledge graph links it to a skill the team has.
        The estimate is one level below the related skill (two for skills that are only used together).
        Estimates are shown for information and don't change met, missing, or coverage figures.
      </p>
      )}
      <p className="text-xs text-[#687A73]">
        Levels: {LEVEL_NAMES.map((name, index) => `${name} (${index + 1})`).join(' · ')}.
        A skill that isn't recorded may still be known; it just isn't on the employee's profile.
      </p>
    </div>
  </Card>
);

const LoadingBlock = ({ text }) => (
  <div className="space-y-3" aria-live="polite" aria-busy="true">
    {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-[#F1F5F2]" />)}
    <p className="text-sm text-[#687A73]">{text}</p>
  </div>
);

const ErrorBlock = ({ message, onRetry }) => (
  <Card>
    <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-rose-700">{message}</p>
      <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>Retry</Button>
    </div>
  </Card>
);

const peopleAssigned = (assigned, planned) => (planned ? `${assigned} of ${planned}` : `${assigned}`);

const relationWords = {
  FRAMEWORK_OF: 'framework or language',
  SAME_FAMILY: 'same family',
  COMPLEMENTARY: 'used together',
};

// Estimated from a related skill in the knowledge graph. Shown beside the
// verified result and never changes it.
const EstimateCell = ({ estimate }) => {
  if (!estimate) return <span className="text-[#9BB0A6]">—</span>;
  return (
    <div>
      <span className="flex flex-wrap items-center gap-1.5">
        {levelLabel(estimate.level)}
        <Badge variant={estimate.likely_met ? 'info' : 'default'}>{estimate.likely_met ? 'Likely met' : 'Still below'}</Badge>
      </span>
      <span className="block text-[11px] text-[#9BB0A6]">
        {estimate.employee_name} has {estimate.related_skill} at {levelLabel(estimate.related_level)} ({relationWords[estimate.relation_type] || estimate.relation_type})
      </span>
    </div>
  );
};

const OrganizationView = ({ data, onOpenProject }) => {
  const { summary } = data;
  return (
    <div className="space-y-5">
      <SourceLine syncedAt={data.synced_at} />
      <KpiRow>
        <Kpi label="Skill needs" value={summary.skill_needs} hint="across planning and active projects" />
        <Kpi label="Needs met" value={summary.needs_met} hint={summary.coverage !== null ? `${summary.coverage}% of all needs` : undefined} tone="good" />
        <Kpi
          label="Needs not met"
          value={summary.needs_not_met}
          hint="skill gaps today"
          tone={summary.needs_not_met ? 'bad' : undefined}
        />
        <Kpi label="Urgent gaps" value={summary.urgent_gaps} hint="essential skills not met" tone={summary.urgent_gaps ? 'bad' : undefined} />
        <Kpi label="Projects fully skilled" value={`${summary.projects_fully_skilled} of ${summary.projects_with_needs}`} hint="every need met" />
      </KpiRow>

      <Card title="Skill gaps by skill" subtitle="Which skills the company is short of">
        {data.by_skill.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#687A73]">No planning or active project has skill requirements.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-[#E8EFEA]">
                  <Th>Skill</Th>
                  <Th hint="how important the unmet needs are">Urgency</Th>
                  <Th align="right">Projects needing it</Th>
                  <Th align="right" hint="team has the level">Projects with it</Th>
                  <Th align="right" hint="the gap">Projects without it</Th>
                  <Th hint="projects with it">Coverage</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EFEA]">
                {data.by_skill.map((row) => (
                  <tr key={row.skill_id}>
                    <Td className="font-medium text-[#10221E]">
                      {row.skill_name}
                      <span className="block text-[11px] font-normal text-[#9BB0A6]">needs up to {levelLabel(row.level_needed)}</span>
                    </Td>
                    <Td><StatusBadge styles={urgencyStyles} value={row.urgency} /></Td>
                    <Td align="right">{row.projects_needing}</Td>
                    <Td align="right">{row.projects_with}</Td>
                    <Td align="right" className={row.projects_without ? 'font-semibold text-rose-700' : ''}>{row.projects_without}</Td>
                    <Td><CoverageBar value={row.coverage} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Skill gaps by project" subtitle="Which projects are missing skills. Select a project to see its details.">
        {data.by_project.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#687A73]">No planning or active projects in the knowledge graph.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-[#E8EFEA]">
                  <Th>Project</Th>
                  <Th>Urgency</Th>
                  <Th align="right">Skills needed</Th>
                  <Th align="right">Skills met</Th>
                  <Th align="right">Skills missing</Th>
                  <Th align="right" hint="of planned team size">People assigned</Th>
                  <Th hint="skills met">Coverage</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EFEA]">
                {data.by_project.map((row) => (
                  <tr key={row.project_id}>
                    <Td>
                      <button type="button" onClick={() => onOpenProject(row.project_id)} className="text-left font-medium text-[#075E4F] hover:text-[#063C32] hover:underline">
                        {row.name}
                      </button>
                      {row.department && <span className="block text-[11px] text-[#9BB0A6]">{row.department}</span>}
                    </Td>
                    <Td><StatusBadge styles={urgencyStyles} value={row.urgency} /></Td>
                    <Td align="right">{row.skills_needed}</Td>
                    <Td align="right">{row.skills_met}</Td>
                    <Td align="right" className={row.skills_missing ? 'font-semibold text-rose-700' : ''}>{row.skills_missing}</Td>
                    <Td align="right">{peopleAssigned(row.people_assigned, row.planned_team_size)}</Td>
                    <Td><CoverageBar value={row.coverage} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Legend />
    </div>
  );
};

const ProjectView = ({ data }) => {
  const { summary } = data;
  return (
    <div className="space-y-5">
      <SourceLine syncedAt={data.synced_at} />
      <KpiRow>
        <Kpi label="Skills needed" value={summary.skills_needed} />
        <Kpi label="Skills met" value={summary.skills_met} hint={summary.coverage !== null ? `${summary.coverage}% coverage` : undefined} tone="good" />
        <Kpi
          label="Skills missing"
          value={summary.skills_missing}
          hint={summary.skills_likely_met ? `${summary.skills_likely_met} likely covered by related skills` : undefined}
          tone={summary.skills_missing ? 'bad' : undefined}
        />
        <Kpi label="Urgent gaps" value={summary.urgent_gaps} hint="essential skills" tone={summary.urgent_gaps ? 'bad' : undefined} />
        <Kpi
          label="People assigned"
          value={peopleAssigned(summary.people_assigned, summary.planned_team_size)}
          hint={summary.planned_team_size ? 'of planned team size' : 'no planned team size set'}
        />
      </KpiRow>

      <Card
        title="Required skills"
        subtitle={`${data.project.name} · ${data.project.department}`}
        action={<StatusBadge styles={urgencyStyles} value={summary.urgency} />}
      >
        {data.inactive_members.length > 0 && (
          <p className="mb-3 text-xs text-amber-700">
            Inactive and not counted: {data.inactive_members.map((member) => member.employee_name).join(', ')}
          </p>
        )}
        {data.requirements.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#687A73]">This project has no required skills defined.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E8EFEA]">
                  <Th>Skill</Th>
                  <Th>Urgency</Th>
                  <Th>Level needed</Th>
                  <Th hint="highest on the team">Team's best level</Th>
                  <Th>Result</Th>
                  <Th align="right">Levels short</Th>
                  <Th hint="not on profiles; from a related skill">Related-skill estimate</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EFEA]">
                {data.requirements.map((row) => (
                  <tr key={row.skill_id}>
                    <Td className="font-medium text-[#10221E]">{row.skill_name}</Td>
                    <Td><StatusBadge styles={urgencyStyles} value={row.urgency} /></Td>
                    <Td>{levelLabel(row.level_needed)}</Td>
                    <Td className={row.team_best_level === null ? 'text-[#9BB0A6]' : ''}>
                      {row.team_best_level !== null ? levelLabel(row.team_best_level) : row.result === 'NO_STAFF' ? 'No staff assigned' : 'Not recorded'}
                    </Td>
                    <Td><StatusBadge styles={resultStyles} value={row.result} /></Td>
                    <Td align="right" className={row.levels_short ? 'font-semibold text-rose-700' : ''}>{row.levels_short}</Td>
                    <Td><EstimateCell estimate={row.estimate} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Legend projectDetails />
    </div>
  );
};

const SkillGapsPage = () => {
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project_id') || '';
  // Older links used view=team with a project_id; they open that project.
  const initialView = ['project', 'team'].includes(searchParams.get('view')) ? 'project' : 'organization';

  const [view, setView] = useState(initialView);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [projectsReload, setProjectsReload] = useState(0);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectsError('');
      try {
        const list = await skillGapService.getGraphProjects();
        if (!cancelled) setProjects(list);
      } catch (requestError) {
        if (!cancelled) setProjectsError(errorMessage(requestError, 'Projects could not be loaded from the knowledge graph.'));
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [projectsReload]);

  useEffect(() => {
    setData(null);
    setError('');
    if (view === 'project' && !projectId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = view === 'organization'
          ? await skillGapService.getGraphOrganization()
          : await skillGapService.getGraphProject(projectId);
        if (!cancelled) setData(result);
      } catch (requestError) {
        if (!cancelled) setError(errorMessage(requestError, 'Skill gaps could not be loaded.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [view, projectId, reload]);

  const openProject = (id) => {
    setProjectId(String(id));
    setView('project');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Skill Gaps"
        subtitle="Current skill requirements, what's met, and where the gaps are, across the organization and each project."
      />

      <div role="tablist" aria-label="Skill gap scope" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-[#DCE5DF] bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === tab.id ? 'bg-[#063C32] text-white' : 'text-[#42544E] hover:bg-[#F1F5F2]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'project' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="w-full max-w-md text-sm font-medium text-[#42544E]">
            Project
            <select
              className="mt-1 w-full rounded-md border border-[#DCE5DF] bg-white px-3 py-2 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA]"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={projectsLoading || Boolean(projectsError)}
            >
              <option value="">
                {projectsLoading ? 'Loading projects...' : projectsError ? 'Projects unavailable' : projects.length === 0 ? 'No projects in the knowledge graph' : 'Select a project'}
              </option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.department}</option>)}
            </select>
          </label>
          {projectsError && <Button variant="outline" icon={RefreshCw} onClick={() => setProjectsReload((count) => count + 1)}>Retry projects</Button>}
        </div>
      )}

      {view === 'project' && !projectId ? (
        <Card>
          <p className="py-6 text-center text-sm font-semibold text-[#10221E]">Select a project to see its skill status</p>
        </Card>
      ) : loading ? (
        <Card><LoadingBlock text={`Reading ${view} skill gaps from the knowledge graph...`} /></Card>
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setReload((count) => count + 1)} />
      ) : data ? (
        view === 'organization'
          ? <OrganizationView data={data} onOpenProject={openProject} />
          : <ProjectView data={data} />
      ) : null}
    </div>
  );
};

export default SkillGapsPage;
