// src/services/apiService.js - Version complète et optimisée
import axios from 'axios';
import { toast } from 'react-toastify';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Intercepteur pour gérer les erreurs globales
    this.api.interceptors.response.use(
      response => response,
      error => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Gestion centralisée des erreurs
  handleError(error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Une erreur est survenue';

    // Redirection si non authentifié
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    // Gestion des erreurs de validation (422)
    if (status === 422) {
      const errors = error.response.data.errors || {};
      Object.values(errors)
        .flat()
        .forEach(err => toast.error(err));
      return;
    }

    // Autres erreurs
    if (status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer plus tard.');
    } else if (status >= 400) {
      toast.error(message);
    }
  }

  // Configuration du token d'authentification
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete this.api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }

  // ================================
  // MÉTHODES HTTP DE BASE
  // ================================
  get(url, config = {}) {
    return this.api.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  patch(url, data = {}, config = {}) {
    return this.api.patch(url, data, config);
  }

  delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  // ================================
  // UPLOAD DE FICHIERS
  // ================================
  uploadFile(url, formData, config = {}) {
    return this.api.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers
      }
    });
  }

  // ================================
  // AUTHENTIFICATION
  // ================================
  login(credentials) {
    return this.post('/auth/login', credentials);
  }

  register(userData) {
    return this.post('/auth/register', userData);
  }

  logout() {
    return this.post('/auth/logout');
  }

  getProfile() {
    return this.get('/auth/me');
  }

  updateProfile(data) {
    return this.put('/auth/profile', data);
  }

  changePassword(data) {
    return this.post('/auth/change-password', data);
  }

  forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }

  resetPassword(data) {
    return this.post('/auth/reset-password', data);
  }

  // ================================
  // DASHBOARD
  // ================================
  getDashboard() {
    return this.get('/dashboard');
  }

  getStatistiquesRapides() {
    return this.get('/dashboard/statistiques-rapides');
  }

  getAlertes() {
    return this.get('/dashboard/alertes');
  }

  getGraphiquesMaintenance() {
    return this.get('/dashboard/graphiques-maintenance');
  }

  // ================================
  // MACHINES
  // ================================
  getMachines(params = {}) {
    return this.get('/machines', { params });
  }

  getMachine(id) {
    return this.get(`/machines/${id}`);
  }

  createMachine(data) {
    return this.uploadFile('/machines', this.createFormData(data));
  }

  updateMachine(id, data) {
    // Si pas d'image, utiliser PUT directement
    if (!data.image) {
      return this.put(`/machines/${id}`, data);
    }
    
    // Si image, utiliser POST avec _method=PUT
    const formData = this.createFormData(data, 'PUT');
    return this.post(`/machines/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  deleteMachine(id) {
    return this.delete(`/machines/${id}`);
  }

  deleteMachineImage(id) {
    return this.delete(`/machines/${id}/image`);
  }

  getMachinesActives() {
    return this.get('/machines/actives');
  }

  updateMachineStatut(id, statut) {
    return this.patch(`/machines/${id}/statut`, { statut });
  }

  getMachineComposants(id) {
    return this.get(`/machines/${id}/composants`);
  }

  getMachinesStatistiques() {
    return this.get('/machines/statistiques');
  }

  // ================================
  // COMPOSANTS
  // ================================
  getComposants(params = {}) {
    return this.get('/composants', { params });
  }

  getComposant(id) {
    return this.get(`/composants/${id}`);
  }

  createComposant(data) {
    return this.uploadFile('/composants', this.createFormData(data));
  }

  updateComposant(id, data) {
    // Si pas d'image, utiliser PUT directement
    if (!data.image) {
      return this.put(`/composants/${id}`, data);
    }
    
    // Si image, utiliser POST avec _method=PUT
    const formData = this.createFormData(data, 'PUT');
    return this.post(`/composants/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  deleteComposant(id) {
    return this.delete(`/composants/${id}`);
  }

  updateComposantStatut(id, data) {
    return this.patch(`/composants/${id}/statut`, data);
  }

  getComposantsDefaillants() {
    return this.get('/composants/defaillants');
  }

  getComposantsAInspecter() {
    return this.get('/composants/a-inspecter');
  }

  getComposantsStatistiques() {
    return this.get('/composants/statistiques');
  }

  // ================================
  // DEMANDES
  // ================================
  getDemandes(params = {}) {
    return this.get('/demandes', { params });
  }

  getDemande(id) {
    return this.get(`/demandes/${id}`);
  }

  createDemande(data) {
    return this.post('/demandes', data);
  }

  updateDemande(id, data) {
    return this.put(`/demandes/${id}`, data);
  }

  deleteDemande(id) {
    return this.delete(`/demandes/${id}`);
  }

  accepterDemande(id, commentaire = '') {
    return this.patch(`/demandes/${id}/accepter`, { commentaire_admin: commentaire });
  }

  refuserDemande(id, commentaire) {
    return this.patch(`/demandes/${id}/refuser`, { commentaire_admin: commentaire });
  }

  getDemandesStatistiques() {
    return this.get('/demandes/statistiques');
  }

  getDemandesUtilisateur() {
    return this.get('/demandes/mes-demandes');
  }

  // ================================
  // TYPES
  // ================================
  getTypes(params = {}) {
    return this.get('/types', { params });
  }

  getType(id) {
    return this.get(`/types/${id}`);
  }

  getTypesActifs() {
    return this.get('/types/actifs');
  }

  createType(data) {
    return this.post('/types', data);
  }

  updateType(id, data) {
    return this.put(`/types/${id}`, data);
  }

  deleteType(id) {
    return this.delete(`/types/${id}`);
  }

  toggleTypeActif(id) {
    return this.patch(`/types/${id}/toggle-actif`);
  }

  // ================================
  // NOTIFICATIONS
  // ================================
  getNotifications(params = {}) {
    return this.get('/notifications', { params });
  }

  getNotification(id) {
    return this.get(`/notifications/${id}`);
  }

  getNotificationsNonLues() {
    return this.get('/notifications/non-lues');
  }

  getNotificationsCount() {
    return this.get('/notifications/count');
  }

  marquerNotificationLue(id) {
    return this.patch(`/notifications/${id}/lue`);
  }

  marquerToutesNotificationsLues() {
    return this.patch('/notifications/marquer-toutes-lues');
  }

  deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  supprimerNotificationsLues() {
    return this.delete('/notifications/lues/supprimer');
  }

  // ================================
  // UTILISATEURS (pour admin)
  // ================================
  getUtilisateurs(params = {}) {
    return this.get('/users', { params });
  }

  getUtilisateur(id) {
    return this.get(`/users/${id}`);
  }

  createUtilisateur(data) {
    return this.post('/users', data);
  }

  updateUtilisateur(id, data) {
    return this.put(`/users/${id}`, data);
  }

  deleteUtilisateur(id) {
    return this.delete(`/users/${id}`);
  }

  toggleUtilisateurActif(id) {
    return this.patch(`/users/${id}/toggle-actif`);
  }

  resetUtilisateurPassword(id) {
    return this.post(`/users/${id}/reset-password`);
  }

  // ================================
  // RAPPORTS
  // ================================
  getRapportMaintenance(params = {}) {
    return this.get('/rapports/maintenance', { params });
  }

  getRapportComposants(params = {}) {
    return this.get('/rapports/composants', { params });
  }

  getRapportDemandes(params = {}) {
    return this.get('/rapports/demandes', { params });
  }

  exportRapport(type, format = 'pdf', params = {}) {
    return this.get(`/rapports/${type}/export`, {
      params: { ...params, format },
      responseType: 'blob'
    });
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  // Création de FormData pour les uploads
  createFormData(data, method = null) {
    const formData = new FormData();
    
    // Ajouter la méthode HTTP pour Laravel
    if (method) {
      formData.append('_method', method);
    }

    // Ajouter tous les champs
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'image' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object' && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return formData;
  }

  // Validation d'image
  validateImage(file) {
    const errors = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];

    if (!file) {
      errors.push('Aucun fichier sélectionné');
      return { valid: false, errors };
    }

    if (file.size > maxSize) {
      errors.push('Le fichier est trop volumineux (maximum 5MB)');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('Type de fichier non autorisé (JPG, PNG, GIF uniquement)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Création d'aperçu d'image
  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Le fichier n\'est pas une image'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Compression d'image (ajout de la méthode manquante)
  compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Définir la taille du canvas
        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en blob
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Formatage des erreurs de validation
  formatValidationErrors(errors) {
    const formatted = [];
    
    Object.keys(errors).forEach(field => {
      const fieldErrors = Array.isArray(errors[field]) ? errors[field] : [errors[field]];
      fieldErrors.forEach(error => {
        formatted.push(`${field}: ${error}`);
      });
    });
    
    return formatted;
  }

  // Téléchargement de fichier
  downloadFile(url, filename) {
    return this.get(url, { responseType: 'blob' })
      .then(response => {
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      });
  }

  // Conversion d'objet en paramètres URL
  objectToParams(obj) {
    const params = new URLSearchParams();
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(key + '[]', item));
        } else {
          params.append(key, value);
        }
      }
    });
    
    return params;
  }

  // ================================
  // MÉTHODES DE DÉVELOPPEMENT
  // ================================
  
  // Test de connexion API
  testConnection() {
    return this.get('/test-connection')
      .then(() => {
        console.log('✅ Connexion API réussie');
        toast.success('Connexion API réussie');
        return true;
      })
      .catch(error => {
        console.error('❌ Erreur connexion API:', error);
        toast.error('Erreur de connexion API');
        return false;
      });
  }

  // Informations sur l'API
  getApiInfo() {
    return this.get('/info');
  }

  // Statistiques globales
  getGlobalStats() {
    return this.get('/stats');
  }
}

// Export de l'instance singleton
export default new ApiService();