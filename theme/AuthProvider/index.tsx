import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {EditorGlobalData, GitHubUser} from '../../src/types';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

interface AuthContextValue {
  token: string | null;
  user: GitHubUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  handleOAuthCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default function AuthProvider({children}: {children: ReactNode}): JSX.Element {
  const {githubClientId, oauthWorkerUrl, editRoute, storageKeyPrefix} =
    usePluginData(PLUGIN_NAME) as EditorGlobalData;

  const tokenKey = `${storageKeyPrefix}-token`;
  const userKey = `${storageKeyPrefix}-user`;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setToken(null);
    setUser(null);
  }, [tokenKey, userKey]);

  const validateToken = useCallback(async (storedToken: string): Promise<boolean> => {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {Authorization: `Bearer ${storedToken}`},
      });
      if (res.ok) {
        const userData = (await res.json()) as GitHubUser;
        setUser(userData);
        localStorage.setItem(userKey, JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [userKey]);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem(tokenKey);
      if (storedToken) {
        const valid = await validateToken(storedToken);
        if (valid) {
          setToken(storedToken);
        } else {
          clearAuth();
        }
      }
      setIsLoading(false);
    };
    init();
  }, [validateToken, clearAuth, tokenKey]);

  const login = useCallback(() => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth-state', state);

    const redirectUri = `${window.location.origin}${editRoute}`;
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUri,
      scope: 'repo',
      state,
    });

    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }, [githubClientId, editRoute]);

  const handleOAuthCallback = useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${oauthWorkerUrl}/api/auth`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({code}),
        });

        const data = (await res.json()) as {access_token?: string; error?: string};

        if (!data.access_token) {
          throw new Error(data.error ?? 'Authentication failed');
        }

        localStorage.setItem(tokenKey, data.access_token);
        setToken(data.access_token);
        await validateToken(data.access_token);
      } finally {
        setIsLoading(false);
      }
    },
    [oauthWorkerUrl, validateToken, tokenKey],
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider
      value={{token, user, isLoading, login, logout, handleOAuthCallback}}>
      {children}
    </AuthContext.Provider>
  );
}
