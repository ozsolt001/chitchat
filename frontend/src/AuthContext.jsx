import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!active) {
          return;
        }

        if (response.ok) {
          setUser(await response.json());
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const register = async (userName, password, profileColor, mascot) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userName, password, profileColor, mascot }),
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw payload?.errors?.join(', ') || 'Sikertelen regisztracio.';
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const login = async (userName, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userName, password }),
    });

    if (!response.ok) {
      throw await response.text();
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
    localStorage.removeItem('currentRoom');
  };

  const updateProfile = async (profileColor, mascot) => {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileColor, mascot }),
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response, 'Sikertelen profilmentes.');
      throw errorMessage;
    }

    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readErrorMessage(response, fallbackMessage) {
  const rawBody = await response.text();

  if (!rawBody) {
    return fallbackMessage;
  }

  try {
    const payload = JSON.parse(rawBody);
    return payload?.errors?.join(', ') || rawBody || fallbackMessage;
  } catch {
    return rawBody || fallbackMessage;
  }
}
