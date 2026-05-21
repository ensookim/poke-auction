import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import authService, { LoginResponse } from '../services/authService';

interface AuthContextType {
  isLoading: boolean;
  isSignedIn: boolean;
  user: {
    id: number;
    nickname: string;
  } | null;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<{ id: number; nickname: string } | null>(
    null,
  );

  const checkAuth = useCallback(async () => {
    try {
      if (process.env.EXPO_PUBLIC_DEV_AUTH === 'true') {
        const response = await authService.devLogin();
        const devUser = {
          id: response.userId,
          nickname: response.nickname,
        };

        await authService.saveTokens(response.accessToken, response.refreshToken);
        await authService.saveUser(devUser);
        setUser(devUser);
        setIsSignedIn(true);
        return;
      }

      const token = await authService.getAccessToken();
      if (token) {
        const storedUser = await authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
        setIsSignedIn(true);
      } else {
        setUser(null);
        setIsSignedIn(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 앱 시작 시 토큰 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      const response: LoginResponse = await authService.kakaoLogin(code);

      // 토큰 저장
      await authService.saveTokens(response.accessToken, response.refreshToken);
      await authService.saveUser({
        id: response.userId,
        nickname: response.nickname,
      });

      // 사용자 정보 저장
      setUser({
        id: response.userId,
        nickname: response.nickname,
      });

      setIsSignedIn(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.clearTokens();
      setUser(null);
      setIsSignedIn(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isSignedIn,
        user,
        login,
        logout,
        checkAuth,
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
