import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getToken, storeToken, removeToken } from './authStorage'; // Same folder, so just './authStorage'

interface User {
  id: string;
  email: string;
  name: string;
  // Add any other user properties from your WordPress API
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuthenticatedUser: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in when app starts
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        // Validate token with your WordPress backend
        const response = await fetch('https://nexus.inhiveglobal.org/wp-json/jwt-auth/v1/token/validate', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Create user object from WordPress response
          const user: User = {
            id: userData.data?.id || userData.data?.ID || 'user_id',
            email: userData.data?.user_email || 'user@example.com',
            name: userData.data?.user_display_name || userData.data?.display_name || 'User',
          };
          setUser(user);
        } else {
          // Token is invalid, remove it
          await removeToken();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthenticatedUser = async (userData: User, token: string) => {
    await storeToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      setAuthenticatedUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
