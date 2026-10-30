import { AlertTriangle, Award, Bell, Briefcase, CalendarClock, CheckCircle2, FileText, GraduationCap, ListChecks, UsersRound } from 'lucide-react';

// Icon, label and colour per backend notification type.
export const NOTIFICATION_TYPES = {
  PROJECT_ASSIGNMENT: { label: 'Assignment', icon: Briefcase, tone: 'text-[#075E4F] bg-[#DFF2EA]' },
  ASSIGNMENT_CHANGED: { label: 'Assignment', icon: Briefcase, tone: 'text-[#075E4F] bg-[#DFF2EA]' },
  PROJECT_COMPLETED: { label: 'Delivered', icon: CheckCircle2, tone: 'text-[#075E4F] bg-[#EAF0D8]' },
  WORKLOAD_WARNING: { label: 'Workload', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50' },
  AVAILABILITY_UPDATED: { label: 'Availability', icon: CalendarClock, tone: 'text-[#497B9B] bg-[#E9F2F7]' },
  DOCUMENT_PROCESSED: { label: 'Documents', icon: FileText, tone: 'text-sky-700 bg-sky-50' },
  CERTIFICATION_ADDED: { label: 'Certification', icon: Award, tone: 'text-[#C27A42] bg-orange-50' },
  PROJECT_CREATED: { label: 'Projects', icon: Briefcase, tone: 'text-[#497B9B] bg-[#E9F2F7]' },
  TEAM_APPROVED: { label: 'Teams', icon: UsersRound, tone: 'text-[#497B9B] bg-[#E9F2F7]' },
  TEAM_CHANGED: { label: 'Teams', icon: UsersRound, tone: 'text-[#497B9B] bg-[#E9F2F7]' },
  PROJECT_STAGE_CHANGED: { label: 'Progress', icon: ListChecks, tone: 'text-[#075E4F] bg-[#EAF0D8]' },
  CAPACITY_REQUEST: { label: 'Capacity', icon: CalendarClock, tone: 'text-amber-700 bg-amber-50' },
  CAPACITY_DECISION: { label: 'Capacity', icon: CalendarClock, tone: 'text-[#497B9B] bg-[#E9F2F7]' },
  SKILL_GAP: { label: 'Development', icon: GraduationCap, tone: 'text-purple-700 bg-purple-50' },
};

export const notificationMeta = (type) => NOTIFICATION_TYPES[type] || { label: 'Update', icon: Bell, tone: 'text-[#42544E] bg-[#F3F5EF]' };

// Where clicking a notification should take the user. Returns either
// { path } to navigate to or { employeeId } to open the profile drawer.
export const notificationTarget = (notification, isAdmin) => {
  const { related_entity_type: type, related_entity_id: id } = notification;
  if (type === 'project') return { path: isAdmin ? `/admin/projects/${id}` : '/employee/projects' };
  if (type === 'employee') return isAdmin ? { employeeId: id } : { path: '/employee/workload' };
  if (type === 'document') return { path: '/employee/profile' };
  return null;
};
