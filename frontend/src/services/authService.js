import api, { assetUrl } from './api';

export const authService = {
  // Login existing user
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });

    const { access_token, token_type } = response.data;

    // Store JWT
    localStorage.setItem('talentiq_auth_token', access_token);

    // Fetch the authenticated user's profile
    const userResponse = await api.get('/auth/me');

    const backendUser = userResponse.data;

    // Normalize backend user data for the existing frontend
    const user = await normalizeUser(backendUser);

    localStorage.setItem(
      'talentiq_user',
      JSON.stringify(user)
    );

    return {
      user,
      token: access_token,
      tokenType: token_type,
    };
  },

  // Register a new user
  register: async (userData) => {
    const response = await api.post('/auth/register', {
      email: userData.email,
      full_name: userData.full_name,
      password: userData.password,
      role: userData.role || 'EMPLOYEE',
    });

    const { access_token, token_type } = response.data;

    // Store JWT
    localStorage.setItem('talentiq_auth_token', access_token);

    // Fetch the newly registered user
    const userResponse = await api.get('/auth/me');

    const backendUser = userResponse.data;

    const user = await normalizeUser(backendUser);

    localStorage.setItem(
      'talentiq_user',
      JSON.stringify(user)
    );

    return {
      user,
      token: access_token,
      tokenType: token_type,
    };
  },

  // Get current authenticated user
  getCurrentUser: async () => {
    const token = localStorage.getItem('talentiq_auth_token');

    if (!token) {
      return null;
    }

    try {
      const response = await api.get('/auth/me');

      const backendUser = response.data;

      const user = await normalizeUser(backendUser);

      localStorage.setItem(
        'talentiq_user',
        JSON.stringify(user)
      );

      return user;
    } catch (error) {
      // Token is invalid or expired
      localStorage.removeItem('talentiq_auth_token');
      localStorage.removeItem('talentiq_user');

      return null;
    }
  },

  // Logout
  logout: async () => {
    // Backend logout endpoint will be added later.
    // For JWT authentication, removing the local token
    // effectively logs the user out on this client.
    localStorage.removeItem('talentiq_user');
    localStorage.removeItem('talentiq_auth_token');
  },

  // Role switching is no longer supported with real authentication.
  switchRole: () => {
    console.warn(
      'Role switching is disabled when using real backend authentication.'
    );

    return null;
  },
};


// Shapes the /auth/me response for the frontend. Employees also get
// their department and profile photo for the navbar/sidebar; a failure
// there never blocks sign-in.
async function normalizeUser(backendUser) {
  const role = backendUser.role.toLowerCase();
  const user = {
    id: backendUser.id,
    name: backendUser.full_name,
    email: backendUser.email,
    role,
    roleLabel: role === 'manager' ? 'Workforce Manager' : 'Employee',
    department: role === 'manager' ? 'Workforce Planning' : null,
    avatar: getInitials(backendUser.full_name),
    avatarUrl: null,
    isActive: backendUser.is_active,
  };

  if (role === 'employee') {
    try {
      const { data } = await api.get('/employees/me');
      user.department = data.department;
      user.avatarUrl = assetUrl(data.avatar_url);
    } catch {
      // Profile details are optional for the session itself.
    }
  }
  return user;
}


// Generate initials for avatar
function getInitials(name) {
  if (!name) {
    return '';

  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}