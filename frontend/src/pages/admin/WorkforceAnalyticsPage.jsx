import React, { useEffect, useState } from 'react';
import { Briefcase, Layers, RefreshCw, Users, UserCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../../components/common/Card';
import KPIWidget from '../../components/common/KPIWidget';
import PageHeader from '../../components/layout/PageHeader';
import api from '../../services/api';
import { EmployeeLink } from '../../context/EmployeeProfileContext';

const ChartPanel = ({ title, subtitle, data, emptyMessage, children }) => (
  <Card title={title} subtitle={subtitle}>
    {data.length ? (
      <div className="h-72 w-full">{children}</div>
    ) : (
      <p className="py-16 text-center text-sm text-[#687A73]">{emptyMessage}</p>
    )}
  </Card>
);

const EmployeeUtilizationPanel = ({ title, subtitle, employees, emptyMessage, utilizationColor }) => (
  <Card title={title} subtitle={subtitle}>
    {employees.length ? (
      <ul className="divide-y divide-[#E8EFEA]">
        {employees.map((employee) => (
          <li key={employee.employee_id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <EmployeeLink employeeId={employee.employee_id} className="min-w-0 truncate text-sm font-medium text-[#10221E]">{employee.name}</EmployeeLink>
            {employee.utilization !== undefined && (
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${utilizationColor}`}>
                {employee.utilization}%
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="py-10 text-center text-sm text-[#687A73]">{emptyMessage}</p>
    )}
  </Card>
);

const errorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'The workforce overview could not be loaded.';
};

export const WorkforceAnalyticsPage = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/workforce/overview')
      .then(({ data }) => {
        if (!cancelled) setOverview(data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadCount]);

  const retry = () => setReloadCount((count) => count + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Intelligence Analytics"
        subtitle="Workforce availability, department distribution, project status, and skill frequency."
      />

      {loading ? (
        <div className="space-y-5" aria-live="polite" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
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
          <p className="mt-1 text-sm text-[#687A73]">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#075E4F] px-4 py-2 text-sm font-medium text-white hover:bg-[#064B40]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : overview ? (
        <>
          <section aria-label="Workforce key performance indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPIWidget
              title="Total employees"
              value={overview.total_employees}
              description="Active workforce"
              icon={Users}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#DFF2EA]"
            />
            <KPIWidget
              title="Available employees"
              value={overview.available_employees}
              suffix={`/ ${overview.total_employees}`}
              description={`Fully available: ${overview.fully_available_employees} · Partially available: ${overview.partially_available_employees} · Unavailable: ${overview.unavailable_employees}${overview.availability_unknown_employees ? ` · Unknown: ${overview.availability_unknown_employees}` : ''}`}
              icon={UserCheck}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#EAF0D8]"
            />
            <KPIWidget
              title="Assigned employees"
              value={overview.assigned_employees}
              description="Distinct employees with active assignments today"
              icon={Layers}
              iconColor="text-[#075E4F]"
              iconBg="bg-[#DFF2EA]"
            />
            <KPIWidget
              title="Active projects"
              value={overview.active_projects_count}
              description="Projects with active status"
              icon={Briefcase}
              iconColor="text-[#0A7865]"
              iconBg="bg-[#DFF2EA]"
            />
          </section>

          <section aria-label="Department analytics" className="grid grid-cols-1 gap-5">

            <ChartPanel
              title="Employees by department"
              subtitle="Active employee count returned by department"
              data={overview.department_breakdown}
              emptyMessage="No department distribution data available."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.department_breakdown} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="department" width={112} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip formatter={(value) => [value, 'Employees']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="employee_count" fill="#497B9B" radius={[0, 4, 4, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>

          <section aria-label="Workforce distribution" className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartPanel
              title="Workload distribution"
              subtitle="Employees grouped by returned utilization band"
              data={overview.workload_distribution}
              emptyMessage="No workforce utilization data available."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.workload_distribution} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="range" width={76} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip formatter={(value) => [value, 'Employees']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#5B9B74" radius={[0, 4, 4, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Project status"
              subtitle="Project counts by status"
              data={overview.project_status_breakdown}
              emptyMessage="No project status data available."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.project_status_breakdown} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(value) => [value, 'Projects']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#C27A42" radius={[4, 4, 0, 0]} name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>

          <section aria-label="Skill distribution and utilization outliers" className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartPanel
              title="Most represented skills"
              subtitle="Top skill records returned by the workforce overview"
              data={overview.skill_distribution}
              emptyMessage="No skill distribution data available."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.skill_distribution} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="skill_name" width={120} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip formatter={(value) => [value, 'Employee skill records']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="employee_count" fill="#8A6E9D" radius={[0, 4, 4, 0]} name="Employee skill records" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <div className="grid grid-cols-1 gap-5">
              <EmployeeUtilizationPanel
                title="Unavailable employees"
                employees={overview.unavailable_employees_list || []}
                emptyMessage="No unavailable employees."
                utilizationColor="text-rose-700"
              />
              <EmployeeUtilizationPanel
                title="Underutilized employees"
                subtitle="Utilization at or below 30%"
                employees={overview.underutilized_employees}
                emptyMessage="No underutilized employees returned."
                utilizationColor="text-[#075E4F]"
              />
            </div>
          </section>
        </>
      ) : (
        <Card>
          <p className="py-8 text-center text-sm text-[#687A73]">No workforce overview data available.</p>
        </Card>
      )}
    </div>
  );
};

export default WorkforceAnalyticsPage;