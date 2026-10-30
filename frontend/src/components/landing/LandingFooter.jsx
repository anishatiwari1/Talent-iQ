import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

export const LandingFooter = () => {
  return (
    <footer className="bg-[#FAFBF8] border-t border-[#DCE5DF] pt-12 pb-8 text-xs text-[#687A73]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#DCE5DF]">
          
          {/* Logo & Description */}
          <div className="max-w-md">
            <Logo textSize="text-lg" />
            <p className="mt-2 text-xs text-[#687A73] leading-relaxed">
              TalentIQ: Workforce intelligence for smarter teams and workforce decisions.
            </p>
          </div>

          {/* Quick Links matching Figma */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <a href="#how-it-works" className="hover:text-[#10221E] transition-colors">
              How it Works
            </a>
            <a href="#features" className="hover:text-[#10221E] transition-colors">
              Capabilities
            </a>
            <a href="#ai-matching" className="hover:text-[#10221E] transition-colors">
              Smart Talent Matching
            </a>
            <a 
              href="#contact" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#10221E] transition-colors"
            >
              Contact Us
            </a>
            <Link to="/login" className="hover:text-[#10221E] transition-colors">
              Sign In
            </Link>
            <span className="text-[#DCE5DF]">|</span>
            <a href="#privacy" className="hover:text-[#10221E] transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-[#10221E] transition-colors">
              Terms of Service
            </a>
          </nav>
        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#687A73]">
          <div>
            &copy; {new Date().getFullYear()} TalentIQ. All rights reserved.
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#075E4F]" />
            <span>Built with workforce intelligence</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default LandingFooter;
