import React from 'react';

export const WorkloadIndicator = ({ percentage = 0, showLabel = true, size = 'md' }) => {
  // Determine color status based on workload percentage
  let statusColor = 'bg-[#75B857]';
  let textColor = 'text-[#075E4F]';
  let label = 'Low';

  if (percentage >= 80) {
    statusColor = 'bg-rose-500';
    textColor = 'text-rose-700';
    label = 'Overloaded';
  } else if (percentage >= 65) {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    label = 'High';
  } else if (percentage >= 35) {
    statusColor = 'bg-[#075E4F]';
    textColor = 'text-[#075E4F]';
    label = 'Optimal';
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
          <span className="text-[#687A73] font-medium">Workload</span>
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

export default WorkloadIndicator;
