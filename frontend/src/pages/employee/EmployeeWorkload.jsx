import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Briefcase, CalendarCheck, Clock, Gauge, RefreshCw, Settings2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import KPIWidget from '../../components/common/KPIWidget';
import PageHeader from '../../components/layout/PageHeader';
import { employeeService } from '../../services/employeeService';

const messageFromError = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Your workload could not be loaded.';
};

const formatDate = (value, options = { month: 'short', day: 'numeric' }) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, options);
};

const HEALTH = {
  OVERLOADED: {
    label: 'Overloaded',
    variant: 'danger',
    advice: 'You are allocated beyond your weekly capacity. Talk to your manager about re-prioritising or moving part of an assignment, and avoid taking on new work until this drops below 100%.',
  },
  AT_CAPACITY: {
    label: 'At capacity',
    variant: 'warning',
    advice: 'You are close to full. New assignments will likely push you over capacity — flag upcoming leave or blockers early so your manager can plan around them.',
  },
  BALANCED: {
    label: 'Balanced',
    variant: 'success',
    advice: 'Your workload is healthy, with some room for focused growth. A good time to work through your development roadmap.',
  },
  UNDERUTILIZED: {
    label: 'Available for work',
    variant: 'primary',
    advice: 'You have plenty of free capacity. Keep your skills and profile up to date so the recommendation engine matches you to new projects, and use the spare time on your roadmap.',
  },
};

const barColor = (allocation) => {
  if (allocation > 100) return '#E11D48';
  if (allocation >= 85) return '#D97706';
  if (allocation > 0) return '#13816D';
  return '#C3E7D8';
};

export const EmployeeWorkload = () => {
  const navigate = useNavigate();
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    employeeService.getMyWorkload(12)
      .then((data) => { if (!cancelled) setWorkload(data); })
      .catch((requestError) => { if (!cancelled) setError(messageFromError(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadCount]);

  const health = HEALTH[workload?.health] || HEALTH.BALANCED;
  const chartData = (workload?.forecast || []).map((week) => ({
    ...week,
    label: formatDate(week.week_start),
  }));
  const peakWeek = chartData.reduce((peak, week) => (!peak || week.allocation_percentage > peak.allocation_percentage ? week : peak), null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workload & Capacity"
        subtitle="How much of your week is allocated now and over the next 12 weeks, based on your project assignments."
        actions={(
          <>
            <Button variant="outline" icon={Settings2} onClick={() => navigate('/employee/availability')}>Request capacity change</Button>
            <Button variant="outline" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Refresh</Button>
          </>
        )}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-[#DCE5DF] bg-white" />)}
        </div>
      ) : error ? (
        <Card>
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{error}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          </div>
        </Card>
      ) : workload && (
        <>
          <section aria-label="Workload summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPIWidget title="Utilization" value={workload.utilization_percentage} suffix="%" description="Of your weekly capacity, this week" icon={Gauge} iconColor="text-[#063C32]" iconBg="bg-[#DFF2EA]" />
            <KPIWidget title="Allocated" value={workload.allocated_hours} suffix={`/ ${workload.weekly_capacity_hours} h`} description="Hours per week on projects" icon={Clock} iconColor="text-[#075E4F]" iconBg="bg-[#EAF0D8]" />
            <KPIWidget title="Free capacity" value={workload.free_hours} suffix="h" description="Hours per week still open" icon={CalendarCheck} iconColor="text-[#497B9B]" iconBg="bg-[#E9F2F7]" />
            <KPIWidget title="Active projects" value={workload.projects.filter((project) => project.is_current).length} description={`${workload.projects.filter((project) => !project.is_current).length} upcoming`} icon={Briefcase} iconColor="text-[#0A7865]" iconBg="bg-[#DFF2EA]" />
          </section>

          <Card
            title="Workload health"
            action={<Badge variant={health.variant} dot>{health.label}</Badge>}
          >
            <div className="flex items-start gap-3">
              {workload.health === 'OVERLOADED' || workload.health === 'AT_CAPACITY'
                ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                : <Activity className="mt-0.5 h-5 w-5 shrink-0 text-[#13816D]" />}
              <div className="text-sm leading-6 text-[#42544E]">
                <p>{health.advice}</p>
                {workload.next_available_week && workload.utilization_percentage >= 100 && (
                  <p className="mt-2 text-xs text-[#687A73]">Your allocation first drops below 100% in the week of {formatDate(workload.next_available_week, { month: 'long', day: 'numeric' })}.</p>
                )}
                {workload.available_from && (
                  <p className="mt-2 text-xs text-[#687A73]">You told your manager you are available from {formatDate(workload.available_from, { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
                )}
              </div>
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-xs text-[#687A73]">
                <span>0%</span><span>Capacity (100%)</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#E8EFEA]" aria-label={`Utilization ${workload.utilization_percentage}%`}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(workload.utilization_percentage, 100)}%`, backgroundColor: barColor(workload.utilization_percentage) }} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-3" title="12-week forecast" subtitle={peakWeek ? `Peak: ${peakWeek.allocation_percentage}% in the week of ${peakWeek.label}` : 'Weekly peak allocation'}>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} interval={1} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="%" domain={[0, (dataMax) => Math.max(120, Math.ceil(dataMax / 10) * 10)]} />
                    <ReferenceLine y={100} stroke="#E11D48" strokeDasharray="4 4" label={{ value: 'Capacity', position: 'insideTopRight', fontSize: 11, fill: '#E11D48' }} />
                    <Tooltip
                      formatter={(value, _name, item) => [`${value}% · ${item.payload.allocated_hours} h`, 'Allocated']}
                      labelFormatter={(_label, payload) => (payload?.[0] ? `Week of ${formatDate(payload[0].payload.week_start, { month: 'long', day: 'numeric' })}` : '')}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="allocation_percentage" radius={[4, 4, 0, 0]} name="Allocated">
                      {chartData.map((week) => <Cell key={week.week_start} fill={barColor(week.allocation_percentage)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="xl:col-span-2" title="Allocation by project" subtitle="Share of your weekly capacity">
              {workload.projects.length === 0 ? (
                <div className="py-10 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-[#9BB0A6]" />
                  <p className="mt-3 text-sm font-semibold text-[#10221E]">No active assignments</p>
                  <p className="mt-1 text-xs text-[#687A73]">Your full capacity is free for new projects.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {workload.projects.map((project) => (
                    <li key={project.project_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#10221E]">{project.project_name}</p>
                          <p className="text-xs text-[#687A73]">
                            {[project.role_on_project, `${formatDate(project.start_date) || 'Open'} – ${formatDate(project.end_date) || 'Open'}`].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-[#10221E]">{project.allocation_percentage}%</p>
                          <p className="text-xs tabular-nums text-[#687A73]">{project.weekly_hours} h/wk</p>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8EFEA]" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(project.allocation_percentage, 100)}%`, backgroundColor: project.is_current ? '#13816D' : '#9BB0A6' }} />
                      </div>
                      {!project.is_current && <p className="mt-1 text-[11px] text-[#687A73]">Starts {formatDate(project.start_date, { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeWorkload;
