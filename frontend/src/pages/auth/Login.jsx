import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  User,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';


export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState('manager');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      // Backend is the source of truth for the user's role.
      if (user.role === 'manager') {
        navigate('/admin/dashboard');
      } else if (user.role === 'employee') {
        navigate('/employee/dashboard');
      } else {
        setError('Your account has an unsupported role.');
      }

    } catch (err) {
      console.error('Login error:', err);

      const backendMessage =
        err.response?.data?.detail;

      setError(
        backendMessage ||
        err.message ||
        'Authentication failed. Please check your credentials.'
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F3F5EF] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-[#10221E]">

      {/* Background ambient lighting */}
      <div className="hero-grid absolute inset-0 pointer-events-none opacity-70" />

      <div className="absolute top-0 -left-4 w-96 h-96 bg-[#DFF2EA]/80 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-[#EAF0D8]/80 rounded-full blur-3xl pointer-events-none" />


      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">

        {/* Brand header */}
        <div className="flex justify-center items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-[#063C32] flex items-center justify-center text-[#A8D85A] shadow-lg shadow-[#063C32]/20">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <span className="text-2xl font-bold tracking-tight text-[#10221E]">
              TalentIQ
            </span>
          </div>

        </div>


        <h2 className="mt-4 text-center text-xl font-bold text-[#10221E]">
          Enterprise Workforce Intelligence Platform
        </h2>

        <p className="mt-1 text-center text-xs text-[#687A73]">
          Intelligent skill gap identification, talent optimization & project allocation
        </p>

      </div>


      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">

        <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-[0_24px_70px_-30px_rgba(6,60,50,0.38)] rounded-2xl border border-[#DCE5DF] sm:px-10">


          {/* Role selection */}
          <div className="mb-6">

            <label className="block text-xs font-semibold text-[#687A73] uppercase tracking-wider mb-2">
              Sign in as
            </label>

            <div className="grid grid-cols-2 gap-2 bg-[#F3F5EF] p-1.5 rounded-xl border border-[#DCE5DF]">

              <button
                type="button"
                onClick={() => handleRoleChange('manager')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  role === 'manager'
                    ? 'bg-[#063C32] text-white shadow-md'
                    : 'text-[#687A73] hover:text-[#10221E]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin / Manager
              </button>


              <button
                type="button"
                onClick={() => handleRoleChange('employee')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  role === 'employee'
                    ? 'bg-[#075E4F] text-white shadow-md'
                    : 'text-[#687A73] hover:text-[#10221E]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Employee
              </button>

            </div>
          </div>


          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}


          <form
            className="space-y-4"
            onSubmit={handleSubmit}
          >

            {/* Email */}
            <div>

              <label className="block text-xs font-medium text-[#42544E]">
                Work Email
              </label>

              <div className="mt-1 relative rounded-md shadow-sm">

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#687A73]" />
                </div>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#F8FAF6] border border-[#DCE5DF] block w-full pl-9 pr-3 py-2 text-xs text-[#10221E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:border-[#075E4F] placeholder-[#9BB0A6]"
                  placeholder="name@company.internal"
                  autoComplete="email"
                />

              </div>

            </div>


            {/* Password */}
            <div>

              <div className="flex items-center justify-between">

                <label className="block text-xs font-medium text-[#42544E]">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#075E4F] hover:text-[#063C32]"
                >
                  Forgot password?
                </Link>

              </div>


              <div className="mt-1 relative rounded-md shadow-sm">

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#687A73]" />
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#F8FAF6] border border-[#DCE5DF] block w-full pl-9 pr-10 py-2 text-xs text-[#10221E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:border-[#075E4F] placeholder-[#9BB0A6]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#687A73] hover:text-[#10221E] focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>

            </div>


            {/* Submit */}
            <div className="pt-2">

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full flex items-center justify-center"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In as{' '}
                {role === 'manager'
                  ? 'Admin / Manager'
                  : 'Employee'}
              </Button>

            </div>

          </form>


          {/* Real authentication hint */}
          <div className="mt-6 pt-4 border-t border-[#E8EFEA]">

            <p className="text-[11px] text-[#687A73] flex items-center gap-1.5">

              <CheckCircle2 className="w-3.5 h-3.5 text-[#075E4F] shrink-0" />

              <span>
                Secure sign-in powered by TalentIQ authentication.
              </span>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
};


export default Login;