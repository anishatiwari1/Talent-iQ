import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = ({ 
  className = "", 
  iconSize = "w-8 h-8", 
  textSize = "text-xl",
  isDark = false,
  to = "/"
}) => {
  const content = (
    <div className={`flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Brand Icon Mark */}
      <div className={`${iconSize} rounded-lg bg-[#063C32] flex items-center justify-center shadow-sm relative overflow-hidden transition-transform duration-300 group-hover:scale-105`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-5 h-5 text-[#A8D85A]"
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Stylized interconnected intelligence graph/leaf node */}
          <circle cx="6" cy="18" r="2.5" fill="#A8D85A" stroke="none" />
          <circle cx="18" cy="6" r="2.5" fill="#DFF2EA" stroke="none" />
          <path d="M7.8 16.2C10.5 13.5 13.5 10.5 16.2 7.8" stroke="#A8D85A" strokeWidth="2.5" />
          <path d="M6 10a6 6 0 0 1 12 0v2" stroke="#DFF2EA" strokeWidth="2" strokeDasharray="1 3" />
          <circle cx="12" cy="11" r="2" fill="#FFFFFF" stroke="none" />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <span className={`font-bold tracking-tight ${textSize} ${isDark ? 'text-white' : 'text-[#10221E]'}`}>
          Talent<span className="text-[#075E4F] group-hover:text-[#063C32] transition-colors">IQ</span>
        </span>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="inline-flex focus:outline-none">{content}</Link>;
  }

  return content;
};

export default Logo;
