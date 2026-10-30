import React from 'react';

const variantStyles = {
  default: 'bg-[#F3F5EF] text-[#42544E] border-[#DCE5DF]',
  primary: 'bg-[#DFF2EA] text-[#075E4F] border-[#C3E7D8]',
  success: 'bg-[#EAF0D8] text-[#075E4F] border-[#C3E7D8]',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200'
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5'
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
  dotColor = ''
}) => {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            dotColor || (variant === 'success' ? 'bg-[#75B857]' : variant === 'danger' ? 'bg-rose-500' : 'bg-[#075E4F]')
          }`}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
