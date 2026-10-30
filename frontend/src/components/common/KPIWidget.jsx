import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export const KPIWidget = ({
  title,
  value,
  change,
  changeType = 'increase', // 'increase' | 'decrease' | 'neutral'
  changePeriod = 'vs last month',
  icon: Icon,
  iconColor = 'text-brand-600',
  iconBg = 'bg-brand-50',
  suffix = '',
  description,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-[#DCE5DF] shadow-card hover:border-[#9BB0A6] transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-card-hover' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#687A73] uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-[#10221E]">{value}</span>
        {suffix && <span className="text-sm font-semibold text-[#687A73]">{suffix}</span>}
      </div>

      {(change !== undefined || description) && (
        <div className="mt-2.5 flex items-center text-xs">
          {change !== undefined && (
            <span
              className={`inline-flex items-center font-medium mr-1.5 ${
                changeType === 'increase'
                  ? 'text-emerald-600'
                  : changeType === 'decrease'
                  ? 'text-rose-600'
                  : 'text-[#687A73]'
              }`}
            >
              {changeType === 'increase' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
              {changeType === 'decrease' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {changeType === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
              {change}
            </span>
          )}
          <span className="text-[#9BB0A6]">{description || changePeriod}</span>
        </div>
      )}
    </div>
  );
};

export default KPIWidget;
