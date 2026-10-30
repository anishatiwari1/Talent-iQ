import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Button from './Button';
import Card from './Card';

// Shared by the manager's project page and the employee's projects page.
export const PROJECT_STAGES = ['REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'TESTING', 'DEPLOYMENT'];

const displayLabel = (value) => (value || '').replaceAll('_', ' ');

const stageName = (stage) => {
  const label = displayLabel(stage);
  return label.charAt(0) + label.slice(1).toLowerCase();
};

// A completed project has finished every stage, whatever stage was last set.
const stageProgress = (project) => {
  const delivered = project.status?.toUpperCase() === 'COMPLETED';
  const index = Math.max(PROJECT_STAGES.indexOf(project.stage), 0);
  const doneCount = delivered ? PROJECT_STAGES.length : index;
  return {
    delivered,
    index,
    doneCount,
    percent: Math.round((doneCount / PROJECT_STAGES.length) * 100),
  };
};

export const ProjectStageBar = ({ project }) => {
  const { delivered, index, doneCount } = stageProgress(project);
  return (
    <div className="mt-2 max-w-xs">
      <div className="flex gap-1" aria-hidden="true">
        {PROJECT_STAGES.map((stage, position) => (
          <span
            key={stage}
            className={`h-1.5 flex-1 rounded-full ${position < doneCount ? 'bg-[#13816D]' : position === index && !delivered ? 'bg-[#A8D85A]' : 'bg-[#E8EFEA]'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-[#687A73]">
        {delivered ? 'All stages delivered' : `Stage ${index + 1} of ${PROJECT_STAGES.length} · ${displayLabel(PROJECT_STAGES[index]).toLowerCase()}`}
      </p>
    </div>
  );
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value.endsWith('Z') || value.includes('+') ? value : `${value}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const ProjectStageTracker = ({ project, onStageChange, saving, error, className = 'lg:col-span-3', title = 'Delivery stages' }) => {
  const { delivered, index, doneCount, percent } = stageProgress(project);
  const locked = delivered || project.status?.toUpperCase() === 'ARCHIVED';
  const lastEntered = (stage) => [...project.stageHistory].reverse().find((event) => event.stage === stage);
  const history = [...project.stageHistory].reverse();
  const nextStage = PROJECT_STAGES[index + 1];
  const previousStage = PROJECT_STAGES[index - 1];

  return (
    <Card
      className={className}
      title={title}
      subtitle={delivered ? 'Project delivered: every stage is complete.' : `${percent}% of stages complete`}
      action={!locked && (
        <div className="flex flex-wrap gap-2">
          {previousStage && (
            <Button variant="outline" size="sm" icon={ArrowLeft} disabled={saving} onClick={() => onStageChange(previousStage)}>
              Back to {displayLabel(previousStage).toLowerCase()}
            </Button>
          )}
          {nextStage && (
            <Button size="sm" icon={ArrowRight} iconPosition="right" loading={saving} onClick={() => onStageChange(nextStage)}>
              Move to {displayLabel(nextStage).toLowerCase()}
            </Button>
          )}
        </div>
      )}
    >
      {error && <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {PROJECT_STAGES.map((stage, position) => {
          const done = position < doneCount;
          const current = position === index && !delivered;
          const entered = lastEntered(stage);
          return (
            <li
              key={stage}
              aria-current={current ? 'step' : undefined}
              className={`relative rounded-md border p-3 ${current ? 'border-[#13816D] bg-[#DFF2EA]/60' : done ? 'border-[#C3E7D8] bg-white' : 'border-[#E8EFEA] bg-[#F7F9F6]'}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-[#13816D] text-white' : current ? 'bg-[#A8D85A] text-[#063C32]' : 'bg-[#E8EFEA] text-[#687A73]'}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : position + 1}
                </span>
                <span className={`min-w-0 truncate text-sm font-semibold ${done || current ? 'text-[#10221E]' : 'text-[#687A73]'}`}>{stageName(stage)}</span>
              </div>
              <p className="mt-2 text-[11px] text-[#687A73]">
                {current ? 'In progress' : done ? 'Done' : 'Not started'}
                {entered && (done || current) ? ` · since ${formatDateTime(entered.enteredAt)}` : ''}
              </p>
            </li>
          );
        })}
      </ol>
      {history.length > 0 && (
        <details className="mt-4 border-t border-[#E8EFEA] pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#075E4F]">Stage history ({history.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((event) => (
              <li key={`${event.stage}-${event.enteredAt}`} className="text-xs text-[#42544E]">
                <span className="font-semibold text-[#10221E]">{stageName(event.stage)}</span>
                {` · ${formatDateTime(event.enteredAt)}`}
                {event.changedBy ? ` · by ${event.changedBy}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
};
