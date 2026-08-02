// client/src/hooks/index.js
import { useState, useEffect, useContext, useCallback } from 'react';

import { UserContext } from '@/providers/UserProvider';
import { PlaceContext } from '@/providers/PlaceProvider';

import {
  getItemFromLocalStorage,
  setItemsInLocalStorage,
  removeItemFromLocalStorage,
} from '@/utils';
import axiosInstance from '@/utils/axios';

// Saved places: synced to the account when logged in, device-local otherwise.
// On first load after login, device favorites merge into the account once.
export const useFavorites = () => {
  const { user } = useContext(UserContext);

  const readLocal = () => {
    try {
      const raw = localStorage.getItem('wareshare_favorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const [favorites, setFavorites] = useState(readLocal);

  // Only mirror to the device while logged out. Writing an account's
  // favorites to this shared key would leak them into the next account
  // that logs in on the same device.
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem('wareshare_favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites, user]);

  // When logged in: merge device favorites into the account, then use server
  // list. On logout, drop everything so the next user starts clean.
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      try {
        localStorage.removeItem('wareshare_favorites');
      } catch {
        // ignore
      }
      return;
    }

    let active = true;

    const sync = async () => {
      try {
        const local = readLocal();
        const merged = local.length
          ? await axiosInstance.post('/users/favorites/merge', { ids: local })
          : await axiosInstance.get('/users/favorites');
        if (active && Array.isArray(merged.data?.ids)) {
          setFavorites(merged.data.ids);
          // Consumed: don't re-merge these into another account later
          try {
            localStorage.removeItem('wareshare_favorites');
          } catch {
            // ignore
          }
        }
      } catch {
        // stay on device copy
      }
    };

    sync();
    return () => {
      active = false;
    };
  }, [user]);

  const toggleFavorite = useCallback(
    (placeId) => {
      // Optimistic flip locally, capturing the pre-toggle list so a failure
      // restores exactly that state instead of blindly toggling again.
      let before = null;
      setFavorites((prev) => {
        before = prev;
        return prev.includes(placeId)
          ? prev.filter((id) => id !== placeId)
          : [...prev, placeId];
      });

      if (user) {
        axiosInstance
          .put(`/users/favorites/${placeId}`)
          .then(({ data }) => {
            if (Array.isArray(data?.ids)) setFavorites(data.ids);
          })
          .catch(() => {
            if (before) setFavorites(before);
          });
      }
    },
    [user]
  );

  return { favorites, toggleFavorite };
};

// Unread chat message count for the logged-in user (polls every 60s)
export const useUnreadMessages = () => {
  const { user } = useContext(UserContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let active = true;

    const fetchCount = async () => {
      try {
        const { data } = await axiosInstance.get('/chat/unread');
        if (active) setCount(data?.count || 0);
      } catch (_) {
        // keep last known count
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60 * 1000);
    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  return count;
};

// Sets the browser tab title for the current page
export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} · WareShare` : 'WareShare';
    return () => {
      document.title = 'WareShare';
    };
  }, [title]);
};

// USER
export const useAuth = () => {
  return useContext(UserContext);
};

export const useProvideAuth = () => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((nextUser) => {
    if (nextUser) {
      setItemsInLocalStorage('user', nextUser);
    } else {
      removeItemFromLocalStorage('user');
    }
  }, []);

  const persistToken = useCallback((nextToken) => {
    if (nextToken) {
      setItemsInLocalStorage('token', nextToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:token', { detail: { token: nextToken } })
        );
      }
    } else {
      removeItemFromLocalStorage('token');
      delete axiosInstance.defaults.headers.common.Authorization;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
  }, []);

  // Public setUser used across the app: ALWAYS persist to localStorage.
  const setUser = useCallback(
    (nextUser) => {
      setUserState(nextUser);
      persistUser(nextUser);
    },
    [persistUser]
  );

  const applyAuthPayload = useCallback(
    (data) => {
      if (!data?.user || !data?.token) return;
      setUserState(data.user);
      persistUser(data.user);
      persistToken(data.token);
    },
    [persistUser, persistToken]
  );

  const clearAuth = useCallback(() => {
    setUserState(null);
    persistUser(null);
    persistToken(null);
  }, [persistUser, persistToken]);

  useEffect(() => {
    const storedUser = getItemFromLocalStorage('user');
    const storedToken = getItemFromLocalStorage('token');

    // If token missing -> treat session as logged out
    if (!storedToken) {
      removeItemFromLocalStorage('user');
      delete axiosInstance.defaults.headers.common.Authorization;
      setUserState(null);
      setLoading(false);
      return;
    }

    // Restore token to axios (always)
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

    // Restore user if present
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch (_) {
        removeItemFromLocalStorage('user');
        setUserState(null);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setUserState(null);
      removeItemFromLocalStorage('user');
      removeItemFromLocalStorage('token');
      delete axiosInstance.defaults.headers.common.Authorization;
    };

    const onStorage = (e) => {
      if (!e?.key) return;

      // Cross-tab sync
      if (e.key === 'token') {
        const token = getItemFromLocalStorage('token');
        if (!token) {
          onLogout();
          return;
        }

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
      }

      if (e.key === 'user') {
        const next = getItemFromLocalStorage('user');
        if (!next) {
          setUserState(null);
          return;
        }
        try {
          setUserState(JSON.parse(next));
        } catch (_) {
          setUserState(null);
          removeItemFromLocalStorage('user');
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', onLogout);
      window.addEventListener('storage', onStorage);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', onLogout);
        window.removeEventListener('storage', onStorage);
      }
    };
  }, []);

  const register = async (formData) => {
    const { name, email, password } = formData;

    try {
      const { data } = await axiosInstance.post('/users/register', {
        name,
        email,
        password,
      });

      applyAuthPayload(data);
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      const message = error?.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const login = async (formData) => {
    const { email, password } = formData;

    try {
      const { data } = await axiosInstance.post('/users/login', {
        email,
        password,
      });

      applyAuthPayload(data);
      return { success: true, message: 'Login successful' };
    } catch (error) {
      const message = error?.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const { data } = await axiosInstance.post('/users/google/login', {
        credential,
      });

      applyAuthPayload(data);
      return { success: true, message: 'Login successful' };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Google login failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      const { data } = await axiosInstance.get('/users/logout');

      if (data.success) {
        clearAuth();
      }

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      return { success: false, message: 'Something went wrong!' };
    }
  };

  const uploadPicture = async (picture) => {
    try {
      const formData = new FormData();
      formData.append('picture', picture);

      const { data } = await axiosInstance.post('/users/upload-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data;
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to upload picture';
      return { success: false, message };
    }
  };

  const updateUser = async (userDetails) => {
    const { name, password, currentPassword, picture } = userDetails;

    try {
      const { data } = await axiosInstance.put('/users/update-user', {
        name,
        password,
        currentPassword,
        picture,
      });

      // Backend responds with { success, token, user }
      applyAuthPayload(data);
      return data;
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to update user';
      return { success: false, message };
    }
  };

  return {
    user,
    setUser,
    register,
    login,
    googleLogin,
    logout,
    loading,
    uploadPicture,
    updateUser,
  };
};

// PLACES
export const usePlaces = () => {
  return useContext(PlaceContext);
};

export const useProvidePlaces = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const getPlaces = async () => {
    try {
      const { data } = await axiosInstance.get('/places');
      setPlaces(data.places || []);
    } catch (_) {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPlaces();
  }, []);

  return {
    places,
    setPlaces,
    loading,
    setLoading,
  };
};
