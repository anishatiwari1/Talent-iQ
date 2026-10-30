import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowUpRight, LayoutDashboard } from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

export const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/employee/dashboard';

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[#DCE5DF]/80 bg-[#F3F5EF]/85 py-3 backdrop-blur-xl'
          : 'border-transparent bg-[#F3F5EF] py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection('features')}
              className="nav-link"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="nav-link"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('ai-matching')}
              className="nav-link"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="nav-link"
            >
              Contact
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-2 rounded-full bg-[#063C32] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#075E4F]"
              >
                <LayoutDashboard className="w-4 h-4 text-[#A8D85A]" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-semibold text-[#10221E] transition-colors hover:text-[#075E4F]"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-1 rounded-full bg-[#A8D85A] px-4 py-2 text-sm font-bold text-[#063C32] shadow-sm transition-all hover:bg-[#b8e56c] hover:shadow-md active:scale-[0.98]"
                >
                  Get Started
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-[#A8D85A] px-3 py-1.5 text-xs font-bold text-[#063C32]"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#10221E] hover:bg-[#DFF2EA]/40 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="mt-3 space-y-2 border-t border-[#DCE5DF] bg-[#F3F5EF] pb-4 pt-3 md:hidden">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#10221E] hover:bg-[#DFF2EA]/50 rounded-md"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#10221E] hover:bg-[#DFF2EA]/50 rounded-md"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('ai-matching')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#10221E] hover:bg-[#DFF2EA]/50 rounded-md"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-[#10221E] hover:bg-[#DFF2EA]/50 rounded-md"
            >
              Contact
            </button>
            <div className="pt-2 border-t border-[#DCE5DF] flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2 text-sm font-medium text-[#10221E] hover:bg-[#DFF2EA]/50 rounded-md"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingNavbar;
