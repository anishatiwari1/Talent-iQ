import React from 'react';

export const AvailabilityIndicator = ({ percentage = 0, showLabel = true, size = 'md' }) => {
  // Higher availability = good for new allocations (emerald/sky)
  let statusColor = 'bg-[#C3E7D8]';
  let textColor = 'text-[#687A73]';
  let label = 'Low Bandwidth';

  if (percentage >= 70) {
    statusColor = 'bg-[#75B857]';
    textColor = 'text-[#075E4F]';
    label = 'Ready for Allocation';
  } else if (percentage >= 40) {
    statusColor = 'bg-[#0A7865]';
    textColor = 'text-[#075E4F]';
    label = 'Partial Availability';
  } else {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    label = 'Committed';
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5'
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-[#687A73] font-medium">Availability</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${textColor}`}>{percentage}%</span>
            <span className="text-[11px] text-[#9BB0A6]">({label})</span>
          </div>
        </div>
      )}
      <div className={`w-full bg-[#E8EFEA] rounded-full overflow-hidden ${heightClasses[size] || heightClasses.md}`}>
        <div
          className={`${statusColor} h-full rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};

export default AvailabilityIndicator;
