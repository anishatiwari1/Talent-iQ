import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, MessageSquareText, RefreshCw, Search } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/layout/PageHeader';
import { EmployeeLink, useEmployeeProfile } from '../../context/EmployeeProfileContext';
import { employeeService } from '../../services/employeeService';
import { skillService } from '../../services/skillService';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const formatStatus = (status) => (status || 'Unknown').replaceAll('_', ' ');

const statusVariant = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'AVAILABLE': return 'success';
    case 'PARTIALLY_AVAILABLE': return 'warning';
    case 'UNAVAILABLE': return 'danger';
    default: return 'default';
  }
};

// Fixed list (rather than collected from results) so the options never
// shrink after filtering.
const AVAILABILITY_STATUSES = ['AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'UNKNOWN'];

// "Best match" ranks the closest result first: search match, then
// proficiency in the chosen skill, then most free capacity.
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'utilization', label: 'Most available' },
  { value: 'delivered', label: 'Most delivered' },
  { value: 'experience', label: 'Most experience' },
  { value: 'name', label: 'Name (A–Z)' },
];

const filtersFromParams = (params) => ({
  search: params.get('search') || '',
  department: params.get('department') || 'All',
  availabilityStatus: params.get('availability') || 'All',
  skillId: params.get('skill') || '',
  maxUtilization: params.get('max_utilization') || '',
  sort: params.get('sort') || 'relevance',
});

const paramsFromFilters = (filters) => {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.department !== 'All') params.department = filters.department;
  if (filters.availabilityStatus !== 'All') params.availability = filters.availabilityStatus;
  if (filters.skillId) params.skill = filters.skillId;
  if (filters.maxUtilization !== '') params.max_utilization = filters.maxUtilization;
  if (filters.sort && filters.sort !== 'relevance') params.sort = filters.sort;
  return params;
};

const selectClass = 'mt-1 w-full rounded-md border border-[#DCE5DF] bg-white px-3 py-2 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA]';

export const EmployeeDirectoryPage = () => {
  const { openEmployeeProfile } = useEmployeeProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  // Filters live in the URL, so the global search bar (which navigates
  // here with ?search=...) and the back button both work.
  const filters = filtersFromParams(searchParams);
  const filterKey = searchParams.toString();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [utilizationDraft, setUtilizationDraft] = useState(filters.maxUtilization);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const hasLoadedOnce = useRef(false);

  // Functional update so a debounced change never overwrites a filter
  // picked in the meantime.
  const updateFilters = (changes) => {
    setSearchParams((current) => paramsFromFilters({ ...filtersFromParams(current), ...changes }), { replace: true });
  };

  // Keep the text inputs in sync when the URL changes from elsewhere
  // (e.g. a new global search while already on this page).
  useEffect(() => { setSearchDraft(filters.search); }, [filters.search]);
  useEffect(() => { setUtilizationDraft(filters.maxUtilization); }, [filters.maxUtilization]);

  // Debounce typing so results update live without a request per keystroke.
  useEffect(() => {
    const value = searchDraft.trim();
    if (value === filters.search) return undefined;
    const timer = setTimeout(() => updateFilters({ search: value }), 350);
    return () => clearTimeout(timer);
  }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (utilizationDraft === filters.maxUtilization) return undefined;
    const value = utilizationDraft === '' ? '' : String(Math.min(Math.max(Number(utilizationDraft) || 0, 0), 100));
    const timer = setTimeout(() => updateFilters({ maxUtilization: value }), 400);
    return () => clearTimeout(timer);
  }, [utilizationDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([employeeService.getDepartments(), skillService.listSkills()]).then(([departmentResult, skillResult]) => {
      if (cancelled) return;
      if (departmentResult.status === 'fulfilled') setDepartments(departmentResult.value);
      if (skillResult.status === 'fulfilled') setSkills(skillResult.value);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // After the first load, keep showing the current rows while the next
    // result arrives instead of flashing the skeleton on every change.
    if (hasLoadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError('');

    employeeService.getEmployees(filters, { signal: controller.signal })
      .then((data) => {
        setEmployees(data);
        hasLoadedOnce.current = true;
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(requestError, 'The employee directory could not be loaded.'));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [filterKey, reloadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (event) => {
    event.preventDefault();
    updateFilters({ search: searchDraft.trim() });
  };

  const resetFilters = () => {
    setSearchDraft('');
    setUtilizationDraft('');
    setSearchParams({}, { replace: true });
  };

  const hasFilters = Object.keys(paramsFromFilters({ ...filters, sort: 'relevance' })).length > 0;
  const departmentOptions = filters.department !== 'All' && !departments.includes(filters.department)
    ? [...departments, filters.department]
    : departments;

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Management Directory" subtitle="Search by name, role, department, code, or skill. Click a name to see the full profile." />

      <Card>
        <form onSubmit={submitSearch} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.2fr)_repeat(4,minmax(130px,0.7fr))_minmax(110px,0.5fr)_auto]">
          <label className="block text-xs font-medium text-[#42544E]">
            Search employees
            <span className="relative mt-1 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687A73]" />
              <input className="w-full rounded-md border border-[#DCE5DF] bg-white py-2 pl-9 pr-3 text-sm text-[#10221E] outline-none focus:border-[#13816D] focus:ring-2 focus:ring-[#DFF2EA]" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name, role, code, or skill" />
            </span>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Department
            <select className={selectClass} value={filters.department} onChange={(event) => updateFilters({ department: event.target.value })}>
              <option value="All">All departments</option>
              {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Skill
            <select className={selectClass} value={filters.skillId} onChange={(event) => updateFilters({ skillId: event.target.value })}>
              <option value="">Any skill</option>
              {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Availability
            <select className={selectClass} value={filters.availabilityStatus} onChange={(event) => updateFilters({ availabilityStatus: event.target.value })}>
              <option value="All">All statuses</option>
              {AVAILABILITY_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Sort by
            <select className={selectClass} value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#42544E]">
            Max utilization %
            <input className={selectClass} type="number" min="0" max="100" step="1" value={utilizationDraft} onChange={(event) => setUtilizationDraft(event.target.value)} placeholder="Any" />
          </label>
          <div className="flex gap-2">
            <Button type="submit" icon={Search}>Search</Button>
            {hasFilters && <Button type="button" variant="outline" onClick={resetFilters}>Clear</Button>}
          </div>
        </form>
      </Card>

      <Card
        title="Employees"
        subtitle={loading ? 'Loading directory...' : `${employees.length} employee${employees.length === 1 ? '' : 's'} ${hasFilters ? 'match your filters' : 'in the directory'}`}
        action={refreshing && <span className="inline-flex items-center gap-1.5 text-xs text-[#687A73]" aria-live="polite"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Updating</span>}
      >
        {loading ? (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-md bg-[#F1F5F2]" />)}
            <p className="text-sm text-[#687A73]">Loading employees...</p>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{error}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>Retry</Button>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-[#10221E]">{hasFilters ? 'No matching employees' : 'No employees returned'}</p>
            <p className="mt-1 text-sm text-[#687A73]">{hasFilters ? 'Adjust or clear the filters to see more employees.' : 'The employee directory is empty.'}</p>
            {hasFilters && <Button className="mt-4" variant="outline" onClick={resetFilters}>Clear filters</Button>}
          </div>
        ) : (
          <div className={`-mx-5 overflow-x-auto px-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-[#E8EFEA] text-[11px] font-semibold uppercase text-[#687A73]">
                  <th className="w-10 pb-3 pr-2">#</th>
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Skills</th>
                  <th className="pb-3 pr-4">Delivered</th>
                  <th className="pb-3 pr-4">Availability</th>
                  <th className="pb-3 pr-4">Utilization</th>
                  <th className="pb-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EFEA]">
                {employees.map((employee, index) => (
                  <tr key={employee.employeeDbId}>
                    <td className="py-4 pr-2 text-xs font-semibold tabular-nums text-[#687A73]">{index + 1}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.name} src={employee.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <EmployeeLink employeeId={employee.employeeDbId} className="text-sm font-semibold text-[#10221E]">{employee.name}</EmployeeLink>
                          <p className="mt-0.5 text-xs text-[#687A73]">{employee.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#42544E]">{employee.role}</td>
                    <td className="py-4 pr-4 text-sm text-[#42544E]">{employee.department}</td>
                    <td className="max-w-xs py-4 pr-4 text-sm text-[#42544E]">{employee.skills.length ? employee.skills.join(', ') : 'No skills listed'}</td>
                    <td className="py-4 pr-4 text-sm font-medium tabular-nums text-[#10221E]">
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#13816D]" />{employee.deliveredProjectsCount}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={statusVariant(employee.availabilityStatus)}>{formatStatus(employee.availabilityStatus)}</Badge>
                      {(employee.availabilityNote || employee.availableFrom) && (
                        <button
                          type="button"
                          onClick={() => openEmployeeProfile(employee.employeeDbId)}
                          title={[employee.availableFrom && `Available from ${employee.availableFrom}`, employee.availabilityNote].filter(Boolean).join(' — ')}
                          className="mt-1.5 flex max-w-[180px] items-start gap-1 text-left text-[11px] leading-4 text-[#497B9B] hover:underline"
                        >
                          <MessageSquareText className="mt-px h-3 w-3 shrink-0" />
                          <span className="line-clamp-2">{employee.availabilityNote || `Available from ${employee.availableFrom}`}</span>
                        </button>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm font-medium tabular-nums text-[#10221E]">{employee.workload}%</td>
                    <td className="py-4 text-right">
                      <Button variant="outline" size="sm" icon={Eye} onClick={() => openEmployeeProfile(employee.employeeDbId)}>View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeDirectoryPage;
