import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
      const hasValidToken = await authService.hasValidAccessToken();
      if (hasValidToken) {
        const storedUser = await authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
        setIsSignedIn(true);
      } else {
        const refreshed = await authService.refreshSession();
        if (refreshed) {
          setUser({
            id: refreshed.userId,
            nickname: refreshed.nickname,
          });
          setIsSignedIn(true);
        } else {
          await authService.clearTokens();
          setUser(null);
          setIsSignedIn(false);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await authService.clearTokens();
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkAuth();
      }
    });

    return () => subscription.remove();
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
