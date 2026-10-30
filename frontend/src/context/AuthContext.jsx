import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { authService } from '../services/authService';


const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // Restore authenticated session when the application starts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to restore authentication session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);


  // Login
  const login = async (email, password) => {
    setLoading(true);

    try {
      const { user: loggedInUser } = await authService.login(
        email,
        password
      );

      setUser(loggedInUser);

      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };


  // Register
  const register = async (userData) => {
    setLoading(true);

    try {
      const { user: registeredUser } =
        await authService.register(userData);

      setUser(registeredUser);

      return registeredUser;
    } finally {
      setLoading(false);
    }
  };


  // Logout
  const logout = async () => {
    setLoading(true);

    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };


  // Re-reads the signed-in user (e.g. after a name or photo change in
  // Settings/Profile) so the navbar and sidebar update immediately.
  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    if (currentUser) setUser(currentUser);
    return currentUser;
  };


  const value = {
    user,

    isAuthenticated: !!user,

    // Backend role: MANAGER → frontend manager/admin access
    isAdmin: user?.role === 'manager',

    // Backend role: EMPLOYEE
    isEmployee: user?.role === 'employee',

    loading,

    login,
    register,
    logout,
    refreshUser,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};