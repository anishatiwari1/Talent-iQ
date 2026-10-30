import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sparkles,
  UsersRound,
  TrendingDown,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  UserCheck,
  Award,
  CalendarCheck,
  Gauge,
  GraduationCap,
  ShieldCheck,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Employees', path: '/admin/employees', icon: Users },
    { label: 'Projects', path: '/admin/projects', icon: Briefcase },
    { label: 'Recommendations', path: '/admin/recommendations', icon: Sparkles },
    { label: 'Teams', path: '/admin/teams', icon: UsersRound },
    { label: 'Skill Gaps', path: '/admin/skill-gaps', icon: TrendingDown },
    { label: 'Workforce Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const employeeNavItems = [
    { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', path: '/employee/profile', icon: User },
    { label: 'My Skills', path: '/employee/skills', icon: Award },
    { label: 'My Projects', path: '/employee/projects', icon: Briefcase },
    { label: 'Availability', path: '/employee/availability', icon: CalendarCheck },
    { label: 'Workload', path: '/employee/workload', icon: Gauge },
    { label: 'Development / Skill Gap', path: '/employee/development', icon: GraduationCap },
    { label: 'Notifications', path: '/employee/notifications', icon: Bell },
    { label: 'Settings', path: '/employee/settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#063C32]/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FAFBF8] text-[#687A73] flex flex-col border-r border-[#DCE5DF] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#DCE5DF] bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#063C32] flex items-center justify-center text-[#A8D85A] shadow-md shadow-[#063C32]/20">
              <Sparkles className="w-4 h-4" />
            </div>
              <div>
                <span className="font-bold text-[#10221E] tracking-tight text-base">TalentIQ</span>
                <p className="text-[10px] text-[#687A73] font-medium tracking-wide uppercase">
                Workforce Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Current Role Banner */}
        <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-[#F3F5EF] border border-[#DCE5DF] flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#A8D85A] ring-2 ring-[#A8D85A]/30" />
            <div>
              <p className="text-xs font-semibold text-[#10221E] leading-none">
                {isAdmin ? 'Admin / Manager' : 'Employee View'}
              </p>
              <p className="text-[10px] text-[#687A73] mt-0.5">
                {isAdmin ? 'Workforce Planning' : 'Self-Service Portal'}
              </p>
            </div>
          </div>

        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen?.(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#063C32] text-white shadow-sm shadow-[#063C32]/30'
                      : 'text-[#42544E] hover:bg-[#DFF2EA] hover:text-[#063C32]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      item.badge === 'AI'
                        ? 'bg-[#DFF2EA] text-[#075E4F] border border-[#C3E7D8]'
                        : item.badge === 'New'
                        ? 'bg-[#EAF0D8] text-[#075E4F]'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & actions footer */}
        <div className="p-3 border-t border-[#DCE5DF] bg-white/60">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F3F5EF] border border-[#DCE5DF]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#10221E] truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-[#687A73] truncate">{user?.department || 'Department'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-[#687A73] hover:text-rose-600 hover:bg-[#DFF2EA] rounded-md transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
