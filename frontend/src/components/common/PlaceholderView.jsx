import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../layout/PageHeader';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { ArrowLeft, Construction } from 'lucide-react';

export const PlaceholderView = ({
  title,
  subtitle,
  category = 'Admin Module',
  icon: Icon = Construction,
  features = []
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        badge={
          <Badge variant="primary" size="sm">
            {category}
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        }
      />

      <Card className="text-center py-12 px-6">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-sm">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          {subtitle || 'This module is wired to mock services and is ready for the upcoming feature development phase.'}
        </p>

        {features.length > 0 && (
          <div className="mt-6 max-w-lg mx-auto text-left bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Key Capabilities Prepared for this View:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PlaceholderView;
