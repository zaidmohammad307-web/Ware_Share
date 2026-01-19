// client/src/hooks/index.js
import { useState, useEffect, useContext, useCallback } from 'react';
import jwt_decode from 'jwt-decode';

import { UserContext } from '@/providers/UserProvider';
import { PlaceContext } from '@/providers/PlaceProvider';

import {
  getItemFromLocalStorage,
  setItemsInLocalStorage,
  removeItemFromLocalStorage,
} from '@/utils';
import axiosInstance from '@/utils/axios';

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
      return { success: true, message: 'Registration successfull' };
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
      return { success: true, message: 'Login successfull' };
    } catch (error) {
      const message = error?.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const googleLogin = async (credential) => {
    const decoded = jwt_decode(credential);

    try {
      const { data } = await axiosInstance.post('/users/google/login', {
        name: `${decoded.given_name} ${decoded.family_name}`,
        email: decoded.email,
      });

      applyAuthPayload(data);
      return { success: true, message: 'Login successfull' };
    } catch (error) {
      const message = error?.message || 'Google login failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      const { data } = await axiosInstance.get('/users/logout');

      if (data.success) {
        clearAuth();
      }

      return { success: true, message: 'Logout successfull' };
    } catch (error) {
      console.log(error);
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
      console.log(error);
    }
  };

  const updateUser = async (userDetails) => {
    const { name, password, picture } = userDetails;

    try {
      const { data } = await axiosInstance.put('/users/update-user', {
        name,
        password,
        picture,
      });

      // Backend responds with { success, token, user }
      applyAuthPayload(data);
      return data;
    } catch (error) {
      console.log(error);
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
    const { data } = await axiosInstance.get('/places');
    setPlaces(data.places);
    setLoading(false);
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
