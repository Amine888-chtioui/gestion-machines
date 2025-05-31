// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        apiService.setAuthToken(token);
        const response = await apiService.get('/auth/me');
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      localStorage.removeItem('token');
      apiService.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await apiService.post('/auth/login', credentials);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      apiService.setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      
      toast.success('Connexion réussie !');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la connexion';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await apiService.post('/auth/register', userData);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      apiService.setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      
      toast.success('Inscription réussie !');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'inscription';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('token');
      apiService.setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      toast.info('Déconnexion réussie');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.put('/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profil mis à jour avec succès !');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du profil';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await apiService.post('/auth/refresh');
      const { token } = response.data;
      localStorage.setItem('token', token);
      apiService.setAuthToken(token);
      return { success: true };
    } catch (error) {
      logout();
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};