import React, { createContext, useCallback, useContext, useState } from 'react';
import EmployeeProfileDrawer from '../components/employee/EmployeeProfileDrawer';

const EmployeeProfileContext = createContext(null);

// Lets any manager screen open the full employee profile drawer by id,
// so names in recommendations, teams, analytics, etc. are all clickable.
export const EmployeeProfileProvider = ({ children }) => {
  const [employeeId, setEmployeeId] = useState(null);
  const openEmployeeProfile = useCallback((id) => setEmployeeId(id), []);
  const close = useCallback(() => setEmployeeId(null), []);

  return (
    <EmployeeProfileContext.Provider value={{ openEmployeeProfile }}>
      {children}
      {employeeId !== null && employeeId !== undefined && (
        <EmployeeProfileDrawer employeeId={employeeId} onClose={close} />
      )}
    </EmployeeProfileContext.Provider>
  );
};

export const useEmployeeProfile = () => useContext(EmployeeProfileContext) || { openEmployeeProfile: null };

// A name that opens the profile drawer when a provider is present, and
// renders as plain text otherwise (e.g. on employee-side screens).
export const EmployeeLink = ({ employeeId, children, className = '' }) => {
  const { openEmployeeProfile } = useEmployeeProfile();
  if (!openEmployeeProfile || employeeId === null || employeeId === undefined) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        openEmployeeProfile(employeeId);
      }}
      title="View employee profile"
      className={`rounded text-left underline decoration-[#9BB0A6] decoration-dotted underline-offset-4 hover:text-[#075E4F] hover:decoration-[#075E4F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13816D] ${className}`}
    >
      {children}
    </button>
  );
};
