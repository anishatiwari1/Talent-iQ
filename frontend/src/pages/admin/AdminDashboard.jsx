import React, { useEffect, useState } from 'react';
import { Briefcase, Layers, RefreshCw, Users, UserCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import KPIWidget from '../../components/common/KPIWidget';
import Card from '../../components/common/Card';
import api from '../../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get('/workforce/overview');
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Dashboard"
        subtitle="Current workforce capacity, allocation, and project status"
      />

      {loading ? (
        <div className="space-y-5" aria-live="polite" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl border border-[#DCE5DF] bg-white p-5">
                <div className="h-3 w-28 rounded bg-[#E8EFEA]" />
                <div className="mt-5 h-7 w-20 rounded bg-[#E8EFEA]" />
                <div className="mt-3 h-3 w-32 rounded bg-[#F1F5F2]" />
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#687A73]">Loading workforce overview...</p>
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center rounded-xl border border-rose-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-[#10221E]">Workforce overview could not be loaded</p>
          <p className="mt-1 text-sm text-[#687A73]">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#075E4F] px-4 py-2 text-sm font-medium text-white hover:bg-[#064B40]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPIWidget
              title="Total Employees"
              value={overview.total_employees}
              description="Active workforce"
              icon={Users}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#DFF2EA]"
            />
            <KPIWidget
              title="Available Employees"
              value={overview.available_employees}
              suffix={`/ ${overview.total_employees}`}
              description={`Fully available: ${overview.fully_available_employees} · Partially available: ${overview.partially_available_employees} · Unavailable: ${overview.unavailable_employees}${overview.availability_unknown_employees ? ` · Unknown: ${overview.availability_unknown_employees}` : ''}`}
              icon={UserCheck}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#EAF0D8]"
            />
            <KPIWidget
              title="Active Projects"
              value={overview.active_projects_count}
              description="Projects with active status"
              icon={Briefcase}
              iconColor="text-[#0A7865]"
              iconBg="bg-[#DFF2EA]"
            />
            <KPIWidget
              title="Employees Assigned"
              value={overview.assigned_employees}
              description="Distinct employees with active assignments today"
              icon={Layers}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#DFF2EA]"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card
              title="Utilization by Department"
              subtitle="Average allocation against weekly capacity"
            >
              {overview.department_utilization.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#687A73]">No department utilization data available.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.department_utilization} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                      <Tooltip
                        formatter={(value, _name, item) => [`${value}%`, `Average utilization (${item.payload.employee_count} employees)`]}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="average_utilization_percentage" fill="#13816D" radius={[4, 4, 0, 0]} name="Average utilization" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card
              title="Workload Distribution"
              subtitle="Employees grouped by current utilization band"
            >
              {overview.total_employees === 0 ? (
                <p className="py-16 text-center text-sm text-[#687A73]">No employee workload data available.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.workload_distribution} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis type="category" dataKey="range" width={76} tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        formatter={(value) => [value, 'Employees']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#5B9B74" radius={[0, 4, 4, 0]} name="Employees" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card
              title="Project Status Summary"
              subtitle="Project counts by status"
            >
              {overview.project_status_breakdown.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#687A73]">No project status data available.</p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.project_status_breakdown} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#497B9B" radius={[4, 4, 0, 0]} name="Projects" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card
              title="Most Represented Skills"
              subtitle="Employee skill records returned by the workforce overview"
            >
              {overview.skill_distribution.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#687A73]">No skill distribution data available.</p>
              ) : (
                <div className="space-y-3">
                  {overview.skill_distribution.slice(0, 8).map((skill) => (
                    <div key={skill.skill_name} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 truncate text-sm text-[#42544E]" title={skill.skill_name}>
                        {skill.skill_name}
                      </span>
                      <div className="h-2 min-w-0 flex-1 rounded-full bg-[#E8EFEA]">
                        <div
                          className="h-2 rounded-full bg-[#13816D]"
                          style={{ width: `${(skill.employee_count / overview.skill_distribution[0].employee_count) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums text-[#687A73]">{skill.employee_count}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-5 border-t border-[#E8EFEA] pt-4 text-xs text-[#687A73]">
                Skill-gap metrics are not included in this endpoint response.
              </p>
            </Card>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-[#DCE5DF] bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#42544E]">No workforce overview data available.</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
