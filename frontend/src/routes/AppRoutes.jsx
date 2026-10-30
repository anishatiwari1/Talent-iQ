import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import EmployeeLayout from '../layouts/EmployeeLayout';

// Pages
import Landing from '../pages/Landing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Dashboards
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProjectsPage, { CreateProjectPage, ProjectDetailsPage } from '../pages/admin/ProjectsPage';
import RecommendationsPage from '../pages/admin/RecommendationsPage';
import TeamFormationPage from '../pages/admin/TeamFormationPage';
import SkillGapsPage from '../pages/admin/SkillGapsPage';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';
import EmployeeProjects from '../pages/employee/EmployeeProjects';
import { EmployeeAvailability, EmployeeProfile, EmployeeSkills } from '../pages/employee/EmployeeSelfService';
import WorkforceAnalyticsPage from '../pages/admin/WorkforceAnalyticsPage';
import NotificationsPage from '../pages/NotificationsPage';
import EmployeeDirectoryPage from '../pages/admin/EmployeeDirectoryPage';
import SettingsPage from '../pages/SettingsPage';
import EmployeeWorkload from '../pages/employee/EmployeeWorkload';
import EmployeeDevelopment from '../pages/employee/EmployeeDevelopment';

// Common Placeholder View for upcoming feature stages
import PlaceholderView from '../components/common/PlaceholderView';
import { User } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5EF] flex items-center justify-center">
        <div className="text-sm text-[#687A73]">Loading TalentIQ...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RoleRoute = ({ children, allowedRole }) => {
  const {
    isAuthenticated,
    isAdmin,
    isEmployee,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5EF] flex items-center justify-center">
        <div className="text-sm text-[#687A73]">Loading TalentIQ...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole === 'manager' && !isAdmin) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (allowedRole === 'employee' && !isEmployee) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Landing Page Route */}
      <Route path="/" element={<Landing />} />

      {/* Authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin Module Routes */}
      <Route
  path="/admin"
  element={
    <RoleRoute allowedRole="manager">
      <AdminLayout />
    </RoleRoute>
  }
>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        
        <Route
          path="employees"
          element={<EmployeeDirectoryPage />}
        />
        <Route
          path="employees/:id"
          element={
            <PlaceholderView
              title="Employee Capability Profile"
              subtitle="Comprehensive breakdown of skills, verified credentials, assignment history, and bandwidth."
              category="Employee Profile"
              icon={User}
            />
          }
        />

        <Route
          path="projects"
          element={<ProjectsPage />}
        />
        <Route
          path="projects/create"
          element={<CreateProjectPage />}
        />
        <Route
          path="projects/:id"
          element={<ProjectDetailsPage />}
        />
        <Route
          path="projects/:id/recommendations"
          element={<RecommendationsPage />}
        />
        <Route
          path="recommendations"
          element={<RecommendationsPage />}
        />

        <Route path="teams" element={<TeamFormationPage />} />

        <Route path="skill-gaps" element={<SkillGapsPage />} />

        <Route
          path="analytics"
          element={<WorkforceAnalyticsPage />}
        />

        <Route
          path="notifications"
          element={<NotificationsPage title="Notification Center" />}
        />

        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Employee Module Routes */}
      <Route
  path="/employee"
  element={
    <RoleRoute allowedRole="employee">
      <EmployeeLayout />
    </RoleRoute>
  }
>
        <Route index element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="resume" element={<Navigate to="/employee/profile" replace />} />

        <Route
          path="profile"
          element={<EmployeeProfile />}
        />
        <Route
          path="skills"
          element={<EmployeeSkills />}
        />
        <Route
          path="projects"
          element={<EmployeeProjects />}
        />
        <Route
          path="availability"
          element={<EmployeeAvailability />}
        />
        <Route path="workload" element={<EmployeeWorkload />} />
        <Route path="development" element={<EmployeeDevelopment />} />
        <Route
          path="notifications"
          element={<NotificationsPage title="My Notifications" />}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
