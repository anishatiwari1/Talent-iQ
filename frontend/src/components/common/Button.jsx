import React from 'react';

const variants = {
  primary: 'bg-[#063C32] text-white hover:bg-[#075E4F] focus:ring-[#A8D85A] shadow-sm border border-transparent',
  secondary: 'bg-[#DFF2EA] text-[#063C32] hover:bg-[#C3E7D8] focus:ring-[#99D5BD] border border-[#C3E7D8]',
  outline: 'bg-white text-[#42544E] hover:bg-[#F4FAF7] border border-[#DCE5DF] focus:ring-[#A8D85A] shadow-sm',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm border border-transparent',
  ghost: 'bg-transparent text-[#687A73] hover:bg-[#DFF2EA] hover:text-[#063C32] border border-transparent',
  success: 'bg-[#075E4F] text-white hover:bg-[#063C32] focus:ring-[#A8D85A] shadow-sm border border-transparent'
};

const sizes = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-3.5 py-2 rounded-lg gap-2',
  lg: 'text-base px-4 py-2.5 rounded-lg gap-2.5'
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      
      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
};

export default Button;
