import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';


export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        role: role === 'manager' ? 'MANAGER' : 'EMPLOYEE',
      });

      setSubmitted(true);

      // Give the success state a moment before redirecting.
      setTimeout(() => {
        if (role === 'manager') {
          navigate('/admin/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      }, 1000);

    } catch (err) {
      console.error('Registration error:', err);

      const backendMessage =
        err.response?.data?.detail;

      setError(
        backendMessage ||
        err.message ||
        'Registration failed. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F3F5EF] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Subtle organic ambient glow */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-[#DFF2EA]/80 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-[#EAF0D8]/80 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">

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
          Create Enterprise Account
        </h2>

        <p className="mt-1 text-center text-xs text-[#687A73]">
          Join the workforce intelligence network
        </p>

      </div>


      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">

        <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-[0_24px_70px_-30px_rgba(6,60,50,0.38)] rounded-2xl border border-[#DCE5DF] sm:px-10">

          {submitted ? (

            <div className="text-center py-6">

              <CheckCircle2 className="w-12 h-12 text-[#0A7865] mx-auto mb-3" />

              <h3 className="text-base font-semibold text-[#10221E]">
                Account Created!
              </h3>

              <p className="text-xs text-[#687A73] mt-1">
                Redirecting to your TalentIQ workspace...
              </p>

            </div>

          ) : (

            <form
              className="space-y-4"
              onSubmit={handleSubmit}
            >

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}


              {/* Full Name */}
              <div>

                <label className="block text-xs font-medium text-[#42544E]">
                  Full Name
                </label>

                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#687A73]" />
                  </div>

                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    autoComplete="name"
                    className="bg-[#F8FAF6] border border-[#DCE5DF] block w-full pl-9 pr-3 py-2 text-xs text-[#10221E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:border-[#075E4F] placeholder-[#9BB0A6]"
                  />
                </div>

              </div>


              {/* Work Email */}
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
                    placeholder="name@company.internal"
                    autoComplete="email"
                    className="bg-[#F8FAF6] border border-[#DCE5DF] block w-full pl-9 pr-3 py-2 text-xs text-[#10221E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:border-[#075E4F] placeholder-[#9BB0A6]"
                  />
                </div>

              </div>


              {/* Account Role */}
              <div>

                <label className="block text-xs font-semibold text-[#687A73] uppercase tracking-wider mb-2">
                  Account Role
                </label>

                <div className="grid grid-cols-2 gap-2 bg-[#F3F5EF] p-1.5 rounded-xl border border-[#DCE5DF]">

                  <button
                    type="button"
                    onClick={() => setRole('employee')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      role === 'employee'
                        ? 'bg-[#063C32] text-white shadow-md'
                        : 'text-[#687A73] hover:text-[#10221E]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Employee
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('manager')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      role === 'manager'
                        ? 'bg-[#063C32] text-white shadow-md'
                        : 'text-[#687A73] hover:text-[#10221E]'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin / Manager
                  </button>

                </div>

              </div>


              {/* Password */}
              <div>

                <label className="block text-xs font-medium text-[#42544E]">
                  Password
                </label>

                <div className="mt-1 relative rounded-md shadow-sm">

                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#687A73]" />
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="bg-[#F8FAF6] border border-[#DCE5DF] block w-full pl-9 pr-10 py-2 text-xs text-[#10221E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A8D85A] focus:border-[#075E4F] placeholder-[#9BB0A6]"
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

                <p className="mt-1 text-[10px] text-[#687A73]">
                  Minimum 8 characters
                </p>

              </div>


              {/* Submit */}
              <div className="pt-2">

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="w-full"
                >
                  Create Account
                </Button>

              </div>


              {/* Login link */}
              <div className="text-center pt-3 border-t border-[#E8EFEA]">

                <span className="text-xs text-[#687A73]">
                  Already registered?{' '}
                </span>

                <Link
                  to="/login"
                  className="text-xs text-[#075E4F] font-semibold hover:text-[#063C32] hover:underline"
                >
                  Sign In
                </Link>

              </div>

            </form>

          )}

        </div>

      </div>

    </div>
  );
};


export default Register;