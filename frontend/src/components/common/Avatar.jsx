import React, { useState } from 'react';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export const initialsFor = (name) => (name || '')
  .trim()
  .split(/\s+/)
  .map((part) => part[0])
  .join('')
  .toUpperCase()
  .slice(0, 2);

export const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const sizeClass = sizes[size] || sizes.md;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ? `${name} profile photo` : 'Profile photo'}
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full border border-[#C3E7D8] object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-[#C3E7D8] bg-[#DFF2EA] font-bold text-[#063C32] ${className}`}
    >
      {initialsFor(name) || '?'}
    </span>
  );
};

export default Avatar;
