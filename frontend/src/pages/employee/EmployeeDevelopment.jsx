import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  PlayCircle,
  RefreshCw,
  Search,
  Target,
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { LEVEL_MILESTONES, resourcesForSkill } from '../../data/learningResources';
import { employeeService } from '../../services/employeeService';

const messageFromError = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Your development roadmap could not be loaded.';
};

const PHASES = [
  { key: 'NOW', title: 'Now', window: 'Next 4–6 weeks', description: 'Highest-impact gaps for open projects.' },
  { key: 'NEXT', title: 'Next', window: '1–3 months', description: 'Further skills current projects ask for.' },
  { key: 'LATER', title: 'Later', window: '3–6 months', description: 'Longer-term and adjacent skills to round out your profile.' },
];

const RESOURCE_TYPES = {
  book: { label: 'Free textbooks', icon: BookOpen },
  paper: { label: 'Research papers', icon: FileText },
  video: { label: 'Videos', icon: PlayCircle },
  course: { label: 'Courses', icon: GraduationCap },
  docs: { label: 'Official docs & guides', icon: Link2 },
};

const TYPE_ORDER = ['docs', 'course', 'book', 'video', 'paper'];

const ResourceList = ({ skillName }) => {
  const { curated, search } = resourcesForSkill(skillName);
  const grouped = TYPE_ORDER
    .map((type) => ({ type, items: curated.filter((item) => item.type === type) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {grouped.map(({ type, items }) => {
            const meta = RESOURCE_TYPES[type];
            const Icon = meta.icon;
            return (
              <div key={type}>
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#42544E]"><Icon className="h-3.5 w-3.5" />{meta.label}</p>
                <ul className="mt-2 space-y-1.5">
                  {items.map((item) => (
                    <li key={item.url}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1 text-sm text-[#075E4F] hover:text-[#063C32] hover:underline">
                        <span>{item.title}</span>
                        <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-[#9BB0A6] group-hover:text-[#075E4F]" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <div className="rounded-md bg-[#F3F5EF] p-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#42544E]"><Search className="h-3.5 w-3.5" />Find more</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {search.map((item) => {
            const Icon = RESOURCE_TYPES[item.type].icon;
            return (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE5DF] bg-white px-2.5 py-1 text-xs font-medium text-[#063C32] hover:border-[#13816D]">
                  <Icon className="h-3.5 w-3.5" />{item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const LevelTrack = ({ current, target }) => (
  <div className="flex items-center gap-1" aria-label={`Level ${current} of 5, target ${target}`}>
    {[1, 2, 3, 4, 5].map((level) => (
      <span
        key={level}
        className={`h-2 flex-1 rounded-full ${level <= current ? 'bg-[#13816D]' : level <= target ? 'bg-[#A8D85A]' : 'bg-[#E8EFEA]'}`}
      />
    ))}
  </div>
);

const RoadmapItem = ({ item, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const steps = [];
  for (let level = item.current_level + 1; level <= item.target_level; level += 1) steps.push(level);

  return (
    <article className="rounded-lg border border-[#DCE5DF] bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#10221E]">{item.skill_name}</h3>
            <Badge size="sm" variant="default">{item.category}</Badge>
            {item.reason === 'PROJECT_DEMAND'
              ? <Badge size="sm" variant="warning">Needed by {item.demand_projects.length} project{item.demand_projects.length === 1 ? '' : 's'}</Badge>
              : <Badge size="sm" variant="info">Builds on {item.related_to}</Badge>}
          </div>
          <div className="mt-3 max-w-sm">
            <LevelTrack current={item.current_level} target={item.target_level} />
            <p className="mt-1 text-xs text-[#687A73]">
              Level {item.current_level} → {item.target_level} · about {item.estimated_weeks} weeks at a few hours a week
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-5 w-5 shrink-0 text-[#687A73]" /> : <ChevronDown className="h-5 w-5 shrink-0 text-[#687A73]" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-[#E8EFEA] p-4">
          {item.demand_projects.length > 0 && (
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#42544E]"><Briefcase className="h-3.5 w-3.5" />Why this skill</p>
              <ul className="mt-2 space-y-1">
                {item.demand_projects.map((project) => (
                  <li key={project.project_id} className="text-xs text-[#42544E]">
                    <span className="font-medium text-[#10221E]">{project.project_name}</span> needs level {project.required_level} ({project.importance.replaceAll('_', ' ').toLowerCase()})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#42544E]"><Target className="h-3.5 w-3.5" />Milestones</p>
            <ol className="mt-2 space-y-2 border-l-2 border-[#C3E7D8] pl-4">
              {steps.map((level) => (
                <li key={level} className="relative">
                  <span className="absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#13816D] text-[9px] font-bold text-white">{level}</span>
                  <p className="text-xs leading-5 text-[#42544E]"><span className="font-semibold text-[#10221E]">Level {level}:</span> {LEVEL_MILESTONES[level]}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#42544E]"><GraduationCap className="h-3.5 w-3.5" />Learning resources</p>
            <ResourceList skillName={item.skill_name} />
          </div>
        </div>
      )}
    </article>
  );
};

export const EmployeeDevelopment = () => {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    employeeService.getMyDevelopmentRoadmap()
      .then((data) => { if (!cancelled) setRoadmap(data); })
      .catch((requestError) => { if (!cancelled) setError(messageFromError(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadCount]);

  const items = roadmap?.items || [];
  const demandCount = items.filter((item) => item.reason === 'PROJECT_DEMAND').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Development & Skill-Gap Roadmap"
        subtitle="A step-by-step plan built from the skills open projects need and what you already know, with free books, papers, and videos for each step."
        actions={(
          <>
            <Button variant="outline" icon={GraduationCap} onClick={() => navigate('/employee/skills')}>Update my skills</Button>
            <Button variant="outline" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Refresh</Button>
          </>
        )}
      />

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg border border-[#DCE5DF] bg-white" />)}
          <p className="text-sm text-[#687A73]">Building your roadmap...</p>
        </div>
      ) : error ? (
        <Card>
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{error}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          </div>
        </Card>
      ) : (
        <>
          <section aria-label="Roadmap summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[#DCE5DF] bg-white p-4">
              <p className="text-xs font-medium text-[#687A73]">Skills to grow</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#10221E]">{items.length}</p>
              <p className="text-xs text-[#687A73]">{demandCount} needed by open projects</p>
            </div>
            <div className="rounded-lg border border-[#DCE5DF] bg-white p-4">
              <p className="text-xs font-medium text-[#687A73]">Open projects analysed</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#10221E]">{roadmap?.open_projects_considered ?? 0}</p>
              <p className="text-xs text-[#687A73]">Planning or active</p>
            </div>
            <div className="rounded-lg border border-[#DCE5DF] bg-white p-4">
              <p className="text-xs font-medium text-[#687A73]">Skills on your profile</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#10221E]">{roadmap?.skills_held ?? 0}</p>
              <p className="text-xs text-[#687A73]">Raise levels on My Skills as you progress</p>
            </div>
          </section>

          {items.length === 0 ? (
            <Card className="py-6 text-center">
              <Compass className="mx-auto h-9 w-9 text-[#9BB0A6]" />
              <p className="mt-3 text-sm font-semibold text-[#10221E]">No gaps against open projects</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#687A73]">
                Your skills meet every level current projects ask for. Add more skills to your profile to get stretch suggestions for related technologies.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {PHASES.map((phase, phaseIndex) => {
                const phaseItems = items.filter((item) => item.phase === phase.key);
                if (phaseItems.length === 0) return null;
                return (
                  <section key={phase.key} aria-labelledby={`phase-${phase.key}`} className="relative">
                    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#063C32] text-xs font-bold text-[#A8D85A]">{phaseIndex + 1}</span>
                      <h2 id={`phase-${phase.key}`} className="text-base font-semibold text-[#10221E]">{phase.title}</h2>
                      <span className="text-xs font-medium text-[#075E4F]">{phase.window}</span>
                      <span className="text-xs text-[#687A73]">— {phase.description}</span>
                    </div>
                    <div className="space-y-3 border-l-2 border-dashed border-[#C3E7D8] pl-5 ml-3.5">
                      {phaseItems.map((item, index) => (
                        <RoadmapItem key={item.skill_id} item={item} defaultOpen={phase.key === 'NOW' && index === 0} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDevelopment;
