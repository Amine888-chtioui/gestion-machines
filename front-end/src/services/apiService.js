// src/services/apiService.js - Version optimisée et simplifiée
import axios from 'axios';
import { toast } from 'react-toastify';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    // Intercepteur pour token
    this.api.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Intercepteur pour erreurs
    this.api.interceptors.response.use(
      response => response,
      error => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  handleError(error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Une erreur est survenue';

    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (status === 422) {
      Object.values(error.response.data.errors || {})
        .flat()
        .forEach(err => toast.error(err));
    } else {
      toast.error(message);
    }
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Méthodes HTTP de base
  get(url, config = {}) { return this.api.get(url, config); }
  post(url, data = {}, config = {}) { return this.api.post(url, data, config); }
  put(url, data = {}, config = {}) { return this.api.put(url, data, config); }
  patch(url, data = {}, config = {}) { return this.api.patch(url, data, config); }
  delete(url, config = {}) { return this.api.delete(url, config); }

  // AUTHENTIFICATION
  login(credentials) { return this.post('/auth/login', credentials); }
  register(userData) { return this.post('/auth/register', userData); }
  logout() { return this.post('/auth/logout'); }
  getProfile() { return this.get('/auth/me'); }
  updateProfile(data) { return this.put('/auth/profile', data); }

  // DASHBOARD
  getDashboard() { return this.get('/dashboard'); }
  getStatistiquesRapides() { return this.get('/dashboard/statistiques-rapides'); }
  getAlertes() { return this.get('/dashboard/alertes'); }

  // MACHINES
  getMachines(params = {}) { return this.get('/machines', { params }); }
  getMachine(id) { return this.get(`/machines/${id}`); }
  createMachine(data) { return this.uploadFile('/machines', this.createFormData(data)); }
  updateMachine(id, data) { return this.uploadFile(`/machines/${id}`, this.createFormData(data, 'PUT')); }
  deleteMachine(id) { return this.delete(`/machines/${id}`); }
  deleteMachineImage(id) { return this.delete(`/machines/${id}/image`); }
  getMachinesActives() { return this.get('/machines/actives'); }
  updateMachineStatut(id, statut) { return this.patch(`/machines/${id}/statut`, { statut }); }

  // COMPOSANTS
  getComposants(params = {}) { return this.get('/composants', { params }); }
  getComposant(id) { return this.get(`/composants/${id}`); }
  createComposant(data) { return this.uploadFile('/composants', this.createFormData(data)); }
  updateComposant(id, data) { return this.uploadFile(`/composants/${id}`, this.createFormData(data, 'PUT')); }
  deleteComposant(id) { return this.delete(`/composants/${id}`); }
  deleteComposantImage(id) { return this.delete(`/composants/${id}/image`); }
  updateComposantStatut(id, data) { return this.patch(`/composants/${id}/statut`, data); }

  // DEMANDES
  getDemandes(params = {}) { return this.get('/demandes', { params }); }
  getDemande(id) { return this.get(`/demandes/${id}`); }
  createDemande(data) { return this.post('/demandes', data); }
  accepterDemande(id, commentaire) { return this.patch(`/demandes/${id}/accepter`, { commentaire_admin: commentaire }); }
  refuserDemande(id, commentaire) { return this.patch(`/demandes/${id}/refuser`, { commentaire_admin: commentaire }); }

  // TYPES
  getTypes(params = {}) { return this.get('/types', { params }); }
  getTypesActifs() { return this.get('/types/actifs'); }
  createType(data) { return this.post('/types', data); }
  updateType(id, data) { return this.put(`/types/${id}`, data); }
  deleteType(id) { return this.delete(`/types/${id}`); }
  toggleTypeActif(id) { return this.patch(`/types/${id}/toggle-actif`); }

  // NOTIFICATIONS
  getNotifications(params = {}) { return this.get('/notifications', { params }); }
  getNotificationsNonLues() { return this.get('/notifications/non-lues'); }
  getNotificationsCount() { return this.get('/notifications/count'); }
  marquerNotificationLue(id) { return this.patch(`/notifications/${id}/lue`); }
  marquerToutesNotificationsLues() { return this.patch('/notifications/marquer-toutes-lues'); }
  deleteNotification(id) { return this.delete(`/notifications/${id}`); }
  supprimerNotificationsLues() { return this.delete('/notifications/lues/supprimer'); }

  // UTILITAIRES
  createFormData(data, method = null) {
    if (!data.image) return data;
    
    const formData = new FormData();
    if (method) formData.append('_method', method);
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (typeof data[key] === 'object' && key !== 'image') {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return formData;
  }

  uploadFile(url, formData) {
    return this.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  validateImage(file) {
    const errors = [];
    if (!file.type.startsWith('image/')) errors.push('Le fichier doit être une image');
    if (file.size > 5 * 1024 * 1024) errors.push('L\'image ne doit pas dépasser 5MB');
    return { valid: errors.length === 0, errors };
  }

  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async compressImage(file, quality = 0.8) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxSize = 800;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export default new ApiService();