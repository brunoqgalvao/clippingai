import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login, signup, logout, getCurrentUser, getAuthToken, setAuthToken as setApiAuthToken, clearAuthToken, type AuthResponse, type User, type SignupInput, type LoginInput } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  signup: (input: SignupInput) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Load user on mount if token exists
  useEffect(() => {
    async function loadUser() {
      const existingToken = getAuthToken();
      if (existingToken) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          setToken(existingToken);
        } catch (error) {
          console.error('Failed to load user:', error);
          clearAuthToken();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    loadUser();
  }, []);

  const handleLogin = async (input: LoginInput): Promise<AuthResponse> => {
    const response = await login(input);
    setUser(response.user);
    setToken(response.token);
    setApiAuthToken(response.token);
    return response;
  };

  const handleSignup = async (input: SignupInput): Promise<AuthResponse> => {
    const response = await signup(input);
    setUser(response.user);
    setToken(response.token);
    setApiAuthToken(response.token);
    return response;
  };

  const handleLogout = () => {
    logout();
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to refresh user:', error);
        handleLogout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login: handleLogin,
        signup: handleSignup,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
