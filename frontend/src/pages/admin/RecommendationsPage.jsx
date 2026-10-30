import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Check, ListChecks, RefreshCw, Sparkles, UsersRound, X } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { projectService } from '../../services/projectService';
import { recommendationService } from '../../services/recommendationService';
import { teamService } from '../../services/teamService';
import { settingsService } from '../../services/settingsService';
import { EmployeeLink } from '../../context/EmployeeProfileContext';

const messageFromError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const formatPercent = (value) => `${value}%`;

const ProjectPicker = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

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

  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle="Choose a project to review its latest ranked employee recommendations."
      />
      <Card title="Select a project" subtitle="Recommendations are generated for one project at a time.">
        {loading ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse border-b border-[#E8EFEA] pb-4 last:border-0">
                <div className="h-4 w-44 rounded bg-[#E8EFEA]" />
                <div className="mt-2 h-3 w-28 rounded bg-[#F1F5F2]" />
              </div>
            ))}
            <p className="text-sm text-[#687A73]">Loading projects...</p>
          </div>
        ) : error ? (
          <div role="alert" className="py-8 text-center">
            <p className="text-sm font-semibold text-[#10221E]">Projects could not be loaded</p>
            <p className="mt-1 text-sm text-[#687A73]">Check your connection and try again.</p>
            <Button className="mt-4" variant="outline" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-[#9BB0A6]" />
            <p className="mt-3 text-sm font-semibold text-[#10221E]">No projects available</p>
            <p className="mt-1 text-sm text-[#687A73]">Create a project before generating recommendations.</p>
          </div>
        ) : (
          <div className="-my-2 divide-y divide-[#E8EFEA]">
            {projects.map((project) => {
              const staffedCount = project.assignedTeam?.length ?? 0;
              // Staffed once the required team size is met (or anyone is
              // staffed when no size is set).
              const staffed = staffedCount > 0 && (!project.teamSize || staffedCount >= project.teamSize);
              return (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/admin/projects/${project.id}/recommendations`)}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <Badge variant={staffed ? 'success' : 'warning'} dot>
                    {staffed ? 'Staffed' : 'Unstaffed'}
                  </Badge>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#10221E] group-hover:text-[#075E4F]">{project.name}</span>
                    <span className="mt-1 block truncate text-xs text-[#687A73]">
                      {project.department} · {project.status} · {project.priority} · {project.teamSize ? `${staffedCount}/${project.teamSize} staffed` : `${staffedCount} staffed`}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-[#075E4F]">View recommendations <span aria-hidden="true">→</span></span>
              </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

function RecommendationCard({ recommendation, onExplain, selected, onToggle, selectDisabled }) {
  const hasSkills = Array.isArray(recommendation.matchedSkills) || Array.isArray(recommendation.missingSkills);
  const matchedSkills = Array.isArray(recommendation.matchedSkills) ? recommendation.matchedSkills : [];
  const missingSkills = Array.isArray(recommendation.missingSkills) ? recommendation.missingSkills : [];
  const capacityUnknown = recommendation.contributingFactors?.capacity_unknown === true;
  const currentlyUnavailable = !capacityUnknown && recommendation.availability !== null && recommendation.availability <= 0;
  const hasAvailability = recommendation.availability !== undefined && recommendation.availability !== null;
  const hasUtilization = recommendation.currentWorkload !== undefined && recommendation.currentWorkload !== null;

  return (
    <article className={`border-b border-[#E8EFEA] py-5 last:border-0 ${selected ? '-mx-3 rounded-lg bg-[#DFF2EA]/40 px-3' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <label className="mt-2.5 flex shrink-0 cursor-pointer items-center" title={currentlyUnavailable ? 'No free capacity for this project' : 'Select for the team'}>
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border-[#9BB0A6] accent-[#13816D] disabled:cursor-not-allowed"
              checked={selected}
              disabled={selectDisabled || (currentlyUnavailable && !selected)}
              onChange={() => onToggle(recommendation.employeeId)}
              aria-label={`Select ${recommendation.name} for the team`}
            />
          </label>
          <Avatar name={recommendation.name} src={recommendation.avatarUrl} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#10221E]">
                <EmployeeLink employeeId={recommendation.employeeId}>{recommendation.name}</EmployeeLink>
              </h2>
              <Badge variant="primary">Rank #{recommendation.rank}</Badge>
              {capacityUnknown && <Badge variant="warning">Capacity data unknown</Badge>}
              {currentlyUnavailable && <Badge variant="warning">No capacity · not staffable now</Badge>}
              {recommendation.staffedOnProject && <Badge variant="success" dot>On the staffed team</Badge>}
              {recommendation.onPendingTeam && <Badge variant="info">In pending proposal</Badge>}
            </div>
            <p className="mt-1 text-xs text-[#687A73]">
              {[recommendation.role, recommendation.department].filter(Boolean).join(' · ')}
            </p>
            {recommendation.experienceYears !== undefined && recommendation.experienceYears !== null && (
              <p className="mt-1 text-xs text-[#687A73]">{recommendation.experienceYears} years of experience</p>
            )}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-[11px] font-medium uppercase text-[#687A73]">Recommendation score</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#075E4F]">{formatPercent(recommendation.matchScore)}</p>
        </div>
      </div>

      {(hasSkills && (matchedSkills.length > 0 || missingSkills.length > 0)) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {matchedSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#42544E]">Matched skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => <Badge key={skill} variant="success">{skill}</Badge>)}
              </div>
            </div>
          )}
          {missingSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#42544E]">Skills to develop</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missingSkills.map((skill) => <Badge key={skill} variant="warning">{skill}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )}

      {(hasAvailability || hasUtilization || recommendation.semanticSimilarity !== undefined && recommendation.semanticSimilarity !== null) && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E8EFEA] pt-3 sm:grid-cols-3">
          {hasAvailability && (
            <div>
              <dt className="text-[11px] text-[#687A73]">Available capacity</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#10221E]">{formatPercent(recommendation.availability)}</dd>
            </div>
          )}
          {hasUtilization && (
            <div>
              <dt className="text-[11px] text-[#687A73]">Current utilization</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#10221E]">{formatPercent(recommendation.currentWorkload)}</dd>
            </div>
          )}
          {recommendation.semanticSimilarity !== undefined && recommendation.semanticSimilarity !== null && (
            <div>
              <dt className="text-[11px] text-[#687A73]">Semantic similarity</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-[#10221E]">{formatPercent(recommendation.semanticSimilarity)}</dd>
            </div>
          )}
        </dl>
      )}

      {recommendation.reason && <p className="mt-3 text-xs leading-5 text-[#687A73]">{recommendation.reason}</p>}

      <button
        type="button"
        onClick={() => onExplain(recommendation)}
        aria-haspopup="dialog"
        className="mt-4 text-sm font-semibold text-[#075E4F] underline decoration-[#9BB0A6] underline-offset-4 hover:text-[#063C32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]"
      >
        Why This Match?
      </button>
    </article>
  );
}

function ExplanationDrawer({ recommendation, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const factors = recommendation.contributingFactors || {};
  const factorRows = [
    { label: 'Skill match', value: factors.skill_match_percentage },
    { label: 'Proficiency', value: factors.proficiency_match_percentage },
    { label: 'Experience', value: factors.experience_match_percentage },
    { label: 'Semantic similarity', value: factors.semantic_similarity_percentage },
    { label: 'Available capacity when ranked', value: factors.available_capacity_percentage },
    { label: 'Utilization when ranked', value: factors.current_utilization_percentage },
  ].filter(({ value }) => typeof value === 'number' && Number.isFinite(value));
  const matchedSkills = Array.isArray(recommendation.matchedSkills) ? recommendation.matchedSkills : null;
  const missingSkills = Array.isArray(recommendation.missingSkills) ? recommendation.missingSkills : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close recommendation explanation"
        onClick={onClose}
        className="absolute inset-0 bg-[#10221E]/45"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-explanation-title"
        className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#DCE5DF] bg-[#F9FBF8] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#DCE5DF] bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-[#687A73]">Recommendation explanation</p>
            <h2 id="recommendation-explanation-title" className="mt-1 truncate text-lg font-bold text-[#10221E]">
              <EmployeeLink employeeId={recommendation.employeeId}>{recommendation.name}</EmployeeLink>
            </h2>
            <p className="mt-1 text-xs text-[#687A73]">
              {[recommendation.role, recommendation.department].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#42544E] hover:bg-[#F1F5F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <section className="rounded-lg border border-[#DCE5DF] bg-white p-4" aria-label="Recommendation score">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#687A73]">Recommendation score</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-[#075E4F]">{formatPercent(recommendation.matchScore)}</p>
              </div>
              <Badge variant="primary">Rank #{recommendation.rank}</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8EFEA]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#13816D]" style={{ width: `${recommendation.matchScore}%` }} />
            </div>
          </section>

          {factorRows.length > 0 && (
            <section className="rounded-lg border border-[#DCE5DF] bg-white p-4" aria-labelledby="factor-title">
              <h3 id="factor-title" className="text-sm font-semibold text-[#10221E]">Scoring factors</h3>
              <div className="mt-4 space-y-4">
                {factorRows.map(({ label, value }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-[#42544E]">{label}</span>
                      <span className="tabular-nums text-[#10221E]">{formatPercent(value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EFEA]" aria-hidden="true">
                      <div className="h-full rounded-full bg-[#5B9B74]" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {matchedSkills && (
            <section className="rounded-lg border border-[#DCE5DF] bg-white p-4" aria-labelledby="matched-title">
              <h3 id="matched-title" className="text-sm font-semibold text-[#10221E]">Matched skills</h3>
              {matchedSkills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {matchedSkills.map((skill, index) => <Badge key={`${skill}-${index}`} variant="success">{skill}</Badge>)}
                </div>
              ) : <p className="mt-2 text-xs text-[#687A73]">No matched skills returned.</p>}
            </section>
          )}

          {missingSkills && (
            <section className="rounded-lg border border-[#DCE5DF] bg-white p-4" aria-labelledby="missing-title">
              <h3 id="missing-title" className="text-sm font-semibold text-[#10221E]">Missing skills</h3>
              {missingSkills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingSkills.map((skill, index) => <Badge key={`${skill}-${index}`} variant="warning">{skill}</Badge>)}
                </div>
              ) : <p className="mt-2 text-xs text-[#687A73]">No missing skills returned.</p>}
            </section>
          )}

          {recommendation.reason && (
            <section className="rounded-lg border border-[#DCE5DF] bg-white p-4" aria-labelledby="reason-title">
              <h3 id="reason-title" className="text-sm font-semibold text-[#10221E]">Explanation</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#42544E]">{recommendation.reason}</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

export const RecommendationsPage = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [projectError, setProjectError] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [explanation, setExplanation] = useState(null);
  const [teams, setTeams] = useState({ approved: null, pending: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [teamAction, setTeamAction] = useState('');
  const [teamError, setTeamError] = useState('');
  const [teamMessage, setTeamMessage] = useState('');

  useEffect(() => {
    // The project list (no id) is rendered by ProjectPicker instead.
    if (!projectId) return undefined;
    let cancelled = false;

    const loadPageData = async () => {
      setProjectLoading(true);
      setRecommendationsLoading(true);
      setProjectError(false);
      setRecommendationsError('');

      const [projectResult, recommendationsResult, teamsResult] = await Promise.allSettled([
        projectService.getProjectById(projectId),
        recommendationService.getRecommendations(projectId),
        teamService.getCurrentTeams(projectId),
      ]);

      if (cancelled) return;

      if (teamsResult.status === 'fulfilled') setTeams(teamsResult.value);

      if (projectResult.status === 'fulfilled') setProject(projectResult.value);
      else setProjectError(true);

      if (recommendationsResult.status === 'fulfilled') setRecommendations(recommendationsResult.value);
      else setRecommendationsError(messageFromError(recommendationsResult.reason, 'Recommendations could not be loaded.'));

      setProjectLoading(false);
      setRecommendationsLoading(false);
    };

    loadPageData();
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadCount]);

  // Re-read staffing after any team change so this page, the Teams tab,
  // and the project page all show the same people.
  const refreshTeamState = async () => {
    const [currentTeams, latest] = await Promise.all([
      teamService.getCurrentTeams(projectId),
      recommendationService.getRecommendations(projectId),
    ]);
    setTeams(currentTeams);
    setRecommendations(latest);
  };

  const requiredSize = project?.teamSize > 0 ? project.teamSize : null;
  const selectionFull = requiredSize !== null && selectedIds.length >= requiredSize;

  const toggleSelected = (employeeId) => {
    setTeamMessage('');
    setSelectedIds((current) => (current.includes(employeeId)
      ? current.filter((id) => id !== employeeId)
      : [...current, employeeId]));
  };

  const selectTop = () => {
    const staffable = recommendations.filter((item) => (
      item.contributingFactors?.capacity_unknown === true || item.availability === null || item.availability > 0
    ));
    setSelectedIds(staffable.slice(0, requiredSize || 5).map((item) => item.employeeId));
    setTeamMessage('');
  };

  const selectCurrentTeam = () => {
    const team = teams.pending || teams.approved;
    if (team) setSelectedIds(team.members.map((member) => member.employeeId));
  };

  const buildTeam = async (approve) => {
    if (selectedIds.length === 0) return;
    if (approve && teams.approved && !window.confirm(
      `This will replace the current staffed team (${teams.approved.members.length} people) with your ${selectedIds.length} selected employees. Continue?`,
    )) return;
    setTeamAction(approve ? 'staff' : 'propose');
    setTeamError('');
    setTeamMessage('');
    try {
      await teamService.createTeam(projectId, selectedIds, approve);
      await refreshTeamState();
      setSelectedIds([]);
      setTeamMessage(approve
        ? 'Team staffed. The Teams tab and project page now show these members.'
        : 'Team proposal saved. Review or approve it on the Teams tab.');
    } catch (error) {
      setTeamError(messageFromError(error, 'The team could not be created.'));
    } finally {
      setTeamAction('');
    }
  };

  const generate = async () => {
    setGenerating(true);
    setRecommendationsError('');
    try {
      // Candidate count comes from the manager's Settings page.
      const topN = await settingsService.getPreferences()
        .then((preferences) => preferences.recommendation_top_n)
        .catch(() => 10);
      const generatedRecommendations = await recommendationService.generateRecommendations(projectId, topN);
      setRecommendations(generatedRecommendations);
      setSelectedIds([]);
    } catch (error) {
      setRecommendationsError(messageFromError(error, 'Recommendations could not be generated. Try again.'));
    } finally {
      setGenerating(false);
    }
  };

  if (!projectId) return <ProjectPicker />;

  if (projectLoading) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-[#687A73]" aria-live="polite">Loading project recommendations...</div>;
  }

  if (projectError || !project) {
    return (
      <div role="alert" className="rounded-xl border border-[#DCE5DF] bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-[#10221E]">Project could not be loaded</p>
        <p className="mt-1 text-sm text-[#687A73]">Return to the project list and choose a project again.</p>
        <Button className="mt-5" variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/recommendations')}>Select a project</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle={`${project.name} · ${project.department}`}
        actions={(
          <>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/recommendations')}>Choose project</Button>
            <Button icon={Sparkles} loading={generating} onClick={generate}>Generate recommendations</Button>
          </>
        )}
      />

      {recommendationsError && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rose-700">{recommendationsError}</p>
          {!recommendationsLoading && <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry loading</Button>}
        </div>
      )}

      <Card
        className="mb-5"
        title="Project team"
        subtitle={requiredSize ? `Needs ${requiredSize} people` : 'No required team size set'}
        action={(
          <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right" onClick={() => navigate(`/admin/teams?project=${projectId}`)}>
            Open in Teams
          </Button>
        )}
      >
        {[
          { key: 'approved', label: 'Staffed team', team: teams.approved, empty: 'Nobody is staffed on this project yet.' },
          { key: 'pending', label: 'Pending proposal', team: teams.pending, empty: null },
        ].filter(({ team, empty }) => team || empty).map(({ key, label, team, empty }) => (
          <div key={key} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-[#42544E]">{label}</p>
              {team && <Badge size="sm" variant={key === 'approved' ? 'success' : 'info'}>{team.members.length} member{team.members.length === 1 ? '' : 's'} · {team.skillCoverage}% skill coverage</Badge>}
            </div>
            {team ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {team.members.map((member) => (
                  <li key={member.employeeId} className="inline-flex items-center gap-2 rounded-full border border-[#DCE5DF] bg-white py-1 pl-1 pr-3">
                    <Avatar name={member.name} src={member.avatarUrl} size="sm" className="!h-6 !w-6 !text-[10px]" />
                    <EmployeeLink employeeId={member.employeeId} className="text-xs font-medium text-[#10221E]">{member.name}</EmployeeLink>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-sm text-[#687A73]">{empty}</p>}
          </div>
        ))}
      </Card>

      {teamError && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{teamError}</p>}
      {teamMessage && <p role="status" className="mb-4 rounded-md border border-[#C3E7D8] bg-[#DFF2EA]/50 px-3 py-2 text-sm text-[#075E4F]">{teamMessage}</p>}

      <Card
        action={recommendations.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" icon={ListChecks} onClick={selectTop}>Select top {requiredSize || 5}</Button>
            {(teams.pending || teams.approved) && <Button variant="ghost" size="sm" onClick={selectCurrentTeam}>Select current team</Button>}
          </div>
        )}
        title="Ranked candidates"
        subtitle={project.requiredSkills?.length ? `${project.requiredSkills.length} project skill requirements` : 'Recommendations for this project'}
      >
        {recommendationsLoading ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse border-b border-[#E8EFEA] pb-5 last:border-0">
                <div className="h-4 w-48 rounded bg-[#E8EFEA]" />
                <div className="mt-3 h-3 w-72 rounded bg-[#F1F5F2]" />
              </div>
            ))}
            <p className="text-sm text-[#687A73]">Loading latest recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF0D8] text-[#075E4F]">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#10221E]">No recommendations yet</p>
            <p className="mt-1 text-sm text-[#687A73]">Generate a ranked candidate list for this project.</p>
            <Button className="mt-5" icon={Sparkles} loading={generating} onClick={generate}>Generate recommendations</Button>
          </div>
        ) : (
          <div className="-my-2 divide-y divide-[#E8EFEA]">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={`${recommendation.employeeId}-${recommendation.rank}`}
                recommendation={recommendation}
                onExplain={setExplanation}
                selected={selectedIds.includes(recommendation.employeeId)}
                selectDisabled={Boolean(teamAction) || (selectionFull && !selectedIds.includes(recommendation.employeeId))}
                onToggle={toggleSelected}
              />
            ))}
          </div>
        )}
        {generating && (
          <p className="mt-4 border-t border-[#E8EFEA] pt-4 text-center text-sm text-[#687A73]" aria-live="polite">
            Generating and saving a fresh ranked shortlist...
          </p>
        )}
      </Card>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-xl border border-[#13816D] bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DFF2EA] text-[#075E4F]"><UsersRound className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-[#10221E]">
                {selectedIds.length}{requiredSize ? ` of ${requiredSize}` : ''} selected for the team
              </p>
              <p className="text-xs text-[#687A73]">
                {requiredSize && selectedIds.length < requiredSize
                  ? `Pick ${requiredSize - selectedIds.length} more to fill the team, or staff a smaller team now.`
                  : 'Save as a proposal to review on the Teams tab, or staff the team right away.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" icon={X} disabled={Boolean(teamAction)} onClick={() => setSelectedIds([])}>Clear</Button>
            <Button variant="outline" size="sm" icon={ListChecks} loading={teamAction === 'propose'} disabled={Boolean(teamAction)} onClick={() => buildTeam(false)}>Save as proposal</Button>
            <Button size="sm" icon={Check} loading={teamAction === 'staff'} disabled={Boolean(teamAction)} onClick={() => buildTeam(true)}>Form & staff team</Button>
          </div>
        </div>
      )}
      {explanation && <ExplanationDrawer recommendation={explanation} onClose={() => setExplanation(null)} />}
    </div>
  );
};

export default RecommendationsPage;