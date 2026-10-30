import React from 'react';

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerClassName = '',
  bodyClassName = '',
  footer,
  footerClassName = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#DCE5DF] shadow-card ${
        hoverEffect ? 'hover:shadow-card-hover hover:border-[#9BB0A6] transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {(title || action || subtitle) && (
        <div
          className={`flex items-start justify-between px-5 py-4 border-b border-[#E8EFEA] ${headerClassName}`}
        >
          <div>
            {title && <h3 className="font-semibold text-[#10221E] text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-[#687A73] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className={`px-5 py-3.5 bg-[#FAFBF8] border-t border-[#E8EFEA] rounded-b-xl ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
