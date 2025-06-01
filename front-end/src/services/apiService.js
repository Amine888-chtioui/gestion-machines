// src/services/apiService.js - Version complète mise à jour avec gestion d'images
import axios from 'axios';
import { toast } from 'react-toastify';

class ApiService {
  constructor() {
    // Configuration de base d'Axios
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Intercepteur pour les requêtes
    this.api.interceptors.request.use(
      (config) => {
        // Ajouter le token d'authentification si disponible
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour les réponses
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Gestion des erreurs 401 (Non autorisé)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Tentative de rafraîchissement du token
          try {
            const refreshResponse = await this.api.post('/auth/refresh');
            const { token } = refreshResponse.data;
            localStorage.setItem('token', token);
            this.setAuthToken(token);
            
            // Retenter la requête originale
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Échec du rafraîchissement, déconnecter l'utilisateur
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Gestion des autres erreurs
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Méthode pour définir le token d'authentification
  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Gestion centralisée des erreurs
  handleError(error) {
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          toast.error(data.message || 'Requête invalide');
          break;
        case 403:
          toast.error('Accès interdit');
          break;
        case 404:
          toast.error('Ressource non trouvée');
          break;
        case 422:
          // Erreurs de validation
          if (data.errors) {
            Object.values(data.errors).flat().forEach(error => {
              toast.error(error);
            });
          } else {
            toast.error(data.message || 'Erreur de validation');
          }
          break;
        case 500:
          toast.error('Erreur interne du serveur');
          break;
        default:
          toast.error(data.message || 'Une erreur est survenue');
      }
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse n'a été reçue
      toast.error('Impossible de contacter le serveur');
    } else {
      // Erreur lors de la configuration de la requête
      toast.error('Erreur de configuration de la requête');
    }
  }

  // Méthodes HTTP de base
  async get(url, config = {}) {
    return this.api.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.api.patch(url, data, config);
  }

  async delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  // ===================================
  // AUTHENTIFICATION
  // ===================================

  async login(credentials) {
    return this.post('/auth/login', credentials);
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async getProfile() {
    return this.get('/auth/me');
  }

  async updateProfile(profileData) {
    return this.put('/auth/profile', profileData);
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }

  // ===================================
  // DASHBOARD
  // ===================================

  async getDashboard() {
    return this.get('/dashboard');
  }

  async getStatistiquesRapides() {
    return this.get('/dashboard/statistiques-rapides');
  }

  async getStatistiquesGenerales() {
    return this.get('/dashboard/statistiques-generales');
  }

  async getAlertes() {
    return this.get('/dashboard/alertes');
  }

  async getAlertesImportantes() {
    return this.get('/dashboard/alertes-importantes');
  }

  async getActivitesRecentes() {
    return this.get('/dashboard/activites');
  }

  async getGraphiqueEvolution() {
    return this.get('/dashboard/evolution');
  }

  async getResume() {
    return this.get('/dashboard/resume');
  }

  // ===================================
  // MACHINES (AVEC GESTION D'IMAGES)
  // ===================================

  async getMachines(params = {}) {
    return this.get('/machines', { params });
  }

  async getMachine(id) {
    return this.get(`/machines/${id}`);
  }

  async createMachine(machineData) {
    // Si machineData contient une image, utiliser FormData
    if (machineData.image) {
      const formData = new FormData();
      Object.keys(machineData).forEach(key => {
        if (key === 'specifications_techniques' && typeof machineData[key] === 'object') {
          formData.append(key, JSON.stringify(machineData[key]));
        } else {
          formData.append(key, machineData[key]);
        }
      });
      return this.uploadFile('/machines', formData);
    }
    return this.post('/machines', machineData);
  }

  async updateMachine(id, machineData) {
    // Si machineData contient une image, utiliser FormData avec _method PUT
    if (machineData.image) {
      const formData = new FormData();
      formData.append('_method', 'PUT'); // Laravel method spoofing
      Object.keys(machineData).forEach(key => {
        if (key === 'specifications_techniques' && typeof machineData[key] === 'object') {
          formData.append(key, JSON.stringify(machineData[key]));
        } else {
          formData.append(key, machineData[key]);
        }
      });
      return this.uploadFile(`/machines/${id}`, formData);
    }
    return this.put(`/machines/${id}`, machineData);
  }

  async deleteMachine(id) {
    return this.delete(`/machines/${id}`);
  }

  async getMachinesActives() {
    return this.get('/machines/actives');
  }

  async updateMachineStatut(id, statut) {
    return this.patch(`/machines/${id}/statut`, { statut });
  }

  async updateMachineMaintenance(id, data) {
    return this.patch(`/machines/${id}/maintenance`, data);
  }

  async getMachineComposants(id) {
    return this.get(`/machines/${id}/composants`);
  }

  async getMachineDemandes(id) {
    return this.get(`/machines/${id}/demandes`);
  }

  async getStatistiquesMachines() {
    return this.get('/machines/statistiques');
  }

  // Nouvelle méthode pour supprimer l'image d'une machine
  async deleteMachineImage(id) {
    return this.delete(`/machines/${id}/image`);
  }

  // ===================================
  // COMPOSANTS
  // ===================================

  async getComposants(params = {}) {
    return this.get('/composants', { params });
  }

  async getComposant(id) {
    return this.get(`/composants/${id}`);
  }

  async createComposant(composantData) {
    return this.post('/composants', composantData);
  }

  async updateComposant(id, composantData) {
    return this.put(`/composants/${id}`, composantData);
  }

  async deleteComposant(id) {
    return this.delete(`/composants/${id}`);
  }

  async getComposantsDefaillants() {
    return this.get('/composants/defaillants');
  }

  async getComposantsAInspecter() {
    return this.get('/composants/a-inspecter');
  }

  async updateComposantStatut(id, data) {
    return this.patch(`/composants/${id}/statut`, data);
  }

  async updateComposantInspection(id, data) {
    return this.patch(`/composants/${id}/inspection`, data);
  }

  async getStatistiquesComposants() {
    return this.get('/composants/statistiques');
  }

  // ===================================
  // DEMANDES
  // ===================================

  async getDemandes(params = {}) {
    return this.get('/demandes', { params });
  }

  async getDemande(id) {
    return this.get(`/demandes/${id}`);
  }

  async createDemande(demandeData) {
    return this.post('/demandes', demandeData);
  }

  async updateDemande(id, demandeData) {
    return this.put(`/demandes/${id}`, demandeData);
  }

  async deleteDemande(id) {
    return this.delete(`/demandes/${id}`);
  }

  async accepterDemande(id, commentaire) {
    return this.patch(`/demandes/${id}/accepter`, { commentaire_admin: commentaire });
  }

  async refuserDemande(id, commentaire) {
    return this.patch(`/demandes/${id}/refuser`, { commentaire_admin: commentaire });
  }

  async changerStatutDemande(id, statut, commentaire) {
    return this.patch(`/demandes/${id}/statut`, { 
      statut, 
      commentaire_admin: commentaire 
    });
  }

  async getDemandesEnAttente() {
    return this.get('/demandes/en-attente');
  }

  async getDemandesUrgentes() {
    return this.get('/demandes/urgentes');
  }

  async getMesDemandesRecentes() {
    return this.get('/demandes/mes-demandes-recentes');
  }

  async getStatistiquesDemandes() {
    return this.get('/demandes/statistiques');
  }

  // ===================================
  // TYPES
  // ===================================

  async getTypes(params = {}) {
    return this.get('/types', { params });
  }

  async getType(id) {
    return this.get(`/types/${id}`);
  }

  async createType(typeData) {
    return this.post('/types', typeData);
  }

  async updateType(id, typeData) {
    return this.put(`/types/${id}`, typeData);
  }

  async deleteType(id) {
    return this.delete(`/types/${id}`);
  }

  async getTypesActifs() {
    return this.get('/types/actifs');
  }

  async toggleTypeActif(id) {
    return this.patch(`/types/${id}/toggle-actif`);
  }

  async getStatistiquesTypes() {
    return this.get('/types/statistiques');
  }

  // ===================================
  // NOTIFICATIONS
  // ===================================

  async getNotifications(params = {}) {
    return this.get('/notifications', { params });
  }

  async getNotification(id) {
    return this.get(`/notifications/${id}`);
  }

  async getNotificationsNonLues() {
    return this.get('/notifications/non-lues');
  }

  async getNotificationsRecentes() {
    return this.get('/notifications/recentes');
  }

  async getNotificationsCount() {
    return this.get('/notifications/count');
  }

  async marquerNotificationLue(id) {
    return this.patch(`/notifications/${id}/lue`);
  }

  async marquerNotificationNonLue(id) {
    return this.patch(`/notifications/${id}/non-lue`);
  }

  async marquerToutesNotificationsLues() {
    return this.patch('/notifications/marquer-toutes-lues');
  }

  async deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  async supprimerNotificationsLues() {
    return this.delete('/notifications/lues/supprimer');
  }

  async creerNotification(data) {
    return this.post('/notifications', data);
  }

  async diffuserNotification(data) {
    return this.post('/notifications/diffuser', data);
  }

  // ===================================
  // UTILISATEURS
  // ===================================

  async getUtilisateurs(params = {}) {
    return this.get('/users', { params });
  }

  async getUtilisateur(id) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id, data) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async toggleUserActif(id) {
    return this.patch(`/users/${id}/toggle-active`);
  }

  // ===================================
  // RAPPORTS
  // ===================================

  async getRapportMachines(params = {}) {
    return this.get('/rapports/machines', { params });
  }

  async getRapportDemandes(params = {}) {
    return this.get('/rapports/demandes', { params });
  }

  async getRapportComposants(params = {}) {
    return this.get('/rapports/composants', { params });
  }

  // ===================================
  // RECHERCHE
  // ===================================

  async searchGlobal(query, filters = {}) {
    return this.post('/search', { query, filters });
  }

  async searchMachines(query, filters = {}) {
    return this.post('/search/machines', { query, filters });
  }

  async searchComposants(query, filters = {}) {
    return this.post('/search/composants', { query, filters });
  }

  async searchDemandes(query, filters = {}) {
    return this.post('/search/demandes', { query, filters });
  }

  // ===================================
  // EXPORTATION / IMPORTATION
  // ===================================

  async exportData(type, format = 'xlsx', params = {}) {
    const url = `/export/${type}?format=${format}`;
    return this.get(url, { params, responseType: 'blob' });
  }

  async importData(type, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });
    
    return this.uploadFile(`/import/${type}`, formData);
  }

  async backupData() {
    return this.post('/backup');
  }

  async restoreData(backupFile) {
    const formData = new FormData();
    formData.append('backup', backupFile);
    return this.uploadFile('/restore', formData);
  }

  // ===================================
  // SYSTEME ET CONFIGURATION
  // ===================================

  async getSystemHealth() {
    return this.get('/health');
  }

  async getSystemMetrics() {
    return this.get('/metrics');
  }

  async getSystemInfo() {
    return this.get('/system-info');
  }

  async getSystemSettings() {
    return this.get('/settings');
  }

  async updateSystemSettings(settings) {
    return this.put('/settings', settings);
  }

  async resetSystemSettings() {
    return this.post('/settings/reset');
  }

  // ===================================
  // LOGS ET AUDIT
  // ===================================

  async getLogs(params = {}) {
    return this.get('/logs', { params });
  }

  async getAuditTrail(params = {}) {
    return this.get('/audit', { params });
  }

  async clearLogs() {
    return this.delete('/logs');
  }

  // ===================================
  // SESSIONS
  // ===================================

  async getActiveSessions() {
    return this.get('/sessions');
  }

  async revokeSession(sessionId) {
    return this.delete(`/sessions/${sessionId}`);
  }

  async revokeAllSessions() {
    return this.delete('/sessions/all');
  }

  // ===================================
  // PREFERENCES UTILISATEUR
  // ===================================

  async getUserPreferences() {
    return this.get('/preferences');
  }

  async updateUserPreferences(preferences) {
    return this.put('/preferences', preferences);
  }

  async resetUserPreferences() {
    return this.delete('/preferences');
  }

  // ===================================
  // FAVORIS
  // ===================================

  async getFavorites() {
    return this.get('/favorites');
  }

  async addToFavorites(type, id) {
    return this.post('/favorites', { type, id });
  }

  async removeFromFavorites(type, id) {
    return this.delete(`/favorites/${type}/${id}`);
  }

  // ===================================
  // FEEDBACK
  // ===================================

  async submitFeedback(feedback) {
    return this.post('/feedback', feedback);
  }

  async getFeedbacks(params = {}) {
    return this.get('/feedback', { params });
  }

  // ===================================
  // CALENDRIER ET PLANIFICATION
  // ===================================

  async getCalendarEvents(params = {}) {
    return this.get('/calendar', { params });
  }

  async createCalendarEvent(event) {
    return this.post('/calendar', event);
  }

  async updateCalendarEvent(id, event) {
    return this.put(`/calendar/${id}`, event);
  }

  async deleteCalendarEvent(id) {
    return this.delete(`/calendar/${id}`);
  }

  // ===================================
  // TACHES RECURRENTES
  // ===================================

  async getRecurringTasks(params = {}) {
    return this.get('/tasks/recurring', { params });
  }

  async createRecurringTask(task) {
    return this.post('/tasks/recurring', task);
  }

  async updateRecurringTask(id, task) {
    return this.put(`/tasks/recurring/${id}`, task);
  }

  async deleteRecurringTask(id) {
    return this.delete(`/tasks/recurring/${id}`);
  }

  // ===================================
  // WORKFLOWS
  // ===================================

  async getWorkflows(params = {}) {
    return this.get('/workflows', { params });
  }

  async executeWorkflow(id, input = {}) {
    return this.post(`/workflows/${id}/execute`, input);
  }

  async getWorkflowHistory(id, params = {}) {
    return this.get(`/workflows/${id}/history`, { params });
  }

  // ===================================
  // TEMPLATES
  // ===================================

  async getTemplates(type, params = {}) {
    return this.get(`/templates/${type}`, { params });
  }

  async createTemplate(type, template) {
    return this.post(`/templates/${type}`, template);
  }

  async useTemplate(type, id, data = {}) {
    return this.post(`/templates/${type}/${id}/use`, data);
  }

  // ===================================
  // KPIS ET METRIQUES
  // ===================================

  async getKPIs(params = {}) {
    return this.get('/kpis', { params });
  }

  async calculateKPI(kpiId, params = {}) {
    return this.post(`/kpis/${kpiId}/calculate`, params);
  }

  async getKPIHistory(kpiId, params = {}) {
    return this.get(`/kpis/${kpiId}/history`, { params });
  }

  // ===================================
  // ALERTES ET SEUILS
  // ===================================

  async getAlertRules(params = {}) {
    return this.get('/alerts/rules', { params });
  }

  async createAlertRule(rule) {
    return this.post('/alerts/rules', rule);
  }

  async updateAlertRule(id, rule) {
    return this.put(`/alerts/rules/${id}`, rule);
  }

  async deleteAlertRule(id) {
    return this.delete(`/alerts/rules/${id}`);
  }

  async getActiveAlerts(params = {}) {
    return this.get('/alerts/active', { params });
  }

  async acknowledgeAlert(id) {
    return this.patch(`/alerts/${id}/acknowledge`);
  }

  async resolveAlert(id, resolution) {
    return this.patch(`/alerts/${id}/resolve`, { resolution });
  }

  // ===================================
  // MAINTENANCE PREDICTIVE
  // ===================================

  async getPredictiveAnalysis(machineId, params = {}) {
    return this.get(`/predictive/machines/${machineId}`, { params });
  }

  async getMaintenanceRecommendations(params = {}) {
    return this.get('/predictive/recommendations', { params });
  }

  async getFailurePredictions(params = {}) {
    return this.get('/predictive/failures', { params });
  }

  // ===================================
  // OPTIMISATION
  // ===================================

  async getResourceOptimization(params = {}) {
    return this.get('/optimization/resources', { params });
  }

  async getMaintenanceOptimization(params = {}) {
    return this.get('/optimization/maintenance', { params });
  }

  async getInventoryOptimization(params = {}) {
    return this.get('/optimization/inventory', { params });
  }

  // ===================================
  // INTEGRATIONS EXTERNES
  // ===================================

  async syncWithExternalSystem(systemType, data) {
    return this.post(`/integrations/${systemType}/sync`, data);
  }

  async getIntegrationStatus(systemType) {
    return this.get(`/integrations/${systemType}/status`);
  }

  async testIntegrationConnection(systemType, config) {
    return this.post(`/integrations/${systemType}/test`, config);
  }

  // ===================================
  // NOTIFICATIONS PUSH
  // ===================================

  async subscribeToPushNotifications(subscription) {
    return this.post('/push/subscribe', subscription);
  }

  async unsubscribeFromPushNotifications() {
    return this.post('/push/unsubscribe');
  }

  // ===================================
  // GEOLOCALISATION
  // ===================================

  async updateLocation(coordinates) {
    return this.patch('/location', coordinates);
  }

  async getNearbyMachines(coordinates, radius = 1000) {
    return this.get('/machines/nearby', { 
      params: { 
        lat: coordinates.latitude, 
        lng: coordinates.longitude, 
        radius 
      } 
    });
  }

  // ===================================
  // METHODES UTILITAIRES POUR IMAGES
  // ===================================

  // Méthode utilitaire pour gérer les uploads avec preview
  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Le fichier doit être une image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // Validation d'image côté client
  validateImage(file) {
    const errors = [];
    
    if (!file) {
      return { valid: true, errors: [] };
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      errors.push('Le fichier doit être une image');
    }

    // Vérifier les extensions autorisées
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push('Format non autorisé. Utilisez: JPG, PNG, GIF');
    }

    // Vérifier la taille (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      errors.push('L\'image ne doit pas dépasser 2MB');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // ===================================
  // METHODES UTILITAIRES GENERALES
  // ===================================

  // Méthode pour formater les erreurs de validation
  formatValidationErrors(errors) {
    const formattedErrors = {};
    Object.keys(errors).forEach(field => {
      if (Array.isArray(errors[field])) {
        formattedErrors[field] = errors[field];
      } else {
        formattedErrors[field] = [errors[field]];
      }
    });
    return formattedErrors;
  }

  // Méthode pour gérer les uploads de fichiers
  async uploadFile(url, formData, config = {}) {
    const uploadConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers
      }
    };
    return this.post(url, formData, uploadConfig);
  }

  // Méthode pour télécharger des fichiers
  async downloadFile(url, filename) {
    try {
      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      return response;
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw error;
    }
  }

  // ===================================
  // HEALTH CHECK
  // ===================================

  async healthCheck() {
    return this.get('/health');
  }

  async testConnection() {
    return this.get('/test');
  }

  // ===================================
  // METHODES UTILITAIRES POUR IMAGES (AVANCEES)
  // ===================================

  // Redimensionner une image côté client
  resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en blob
        canvas.toBlob(resolve, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Compresser une image
  async compressImage(file, quality = 0.8) {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    try {
      const compressedBlob = await this.resizeImage(file, 1200, 1200, quality);
      return new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Erreur lors de la compression:', error);
      return file; // Retourner le fichier original en cas d'erreur
    }
  }

  // Méthode pour convertir blob en File
  blobToFile(blob, fileName) {
    return new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now()
    });
  }

  // Méthode pour obtenir les métadonnées d'une image
  getImageMetadata(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Le fichier doit être une image'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        });
        URL.revokeObjectURL(img.src); // Nettoyer la mémoire
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ===================================
  // METHODES UTILITAIRES POUR FORMATS
  // ===================================

  // Formater la taille de fichier
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Formater une date
  formatDate(date, locale = 'fr-FR') {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString(locale);
  }

  // Formater une date avec heure
  formatDateTime(date, locale = 'fr-FR') {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString(locale);
  }

  // Formater un prix
  formatPrice(price, currency = 'EUR', locale = 'fr-FR') {
    if (!price) return '-';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(price);
  }

  // ===================================
  // METHODES UTILITAIRES POUR VALIDATION
  // ===================================

  // Valider un email
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Valider un numéro de téléphone français
  validatePhoneFR(phone) {
    const re = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return re.test(phone);
  }

  // Valider la force d'un mot de passe
  validatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      score,
      strength: score < 2 ? 'faible' : score < 4 ? 'moyen' : 'fort',
      checks
    };
  }

  // ===================================
  // METHODES UTILITAIRES POUR CACHE
  // ===================================

  // Cache simple en mémoire
  _cache = new Map();

  // Mettre en cache
  setCache(key, data, ttl = 300000) { // TTL par défaut: 5 minutes
    const expiry = Date.now() + ttl;
    this._cache.set(key, { data, expiry });
  }

  // Récupérer du cache
  getCache(key) {
    const cached = this._cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this._cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  // Vider le cache
  clearCache(key = null) {
    if (key) {
      this._cache.delete(key);
    } else {
      this._cache.clear();
    }
  }

  // Méthode GET avec cache
  async getCached(url, config = {}, ttl = 300000) {
    const cacheKey = `${url}_${JSON.stringify(config)}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const response = await this.get(url, config);
    this.setCache(cacheKey, response, ttl);
    return response;
  }

  // ===================================
  // METHODES POUR GESTION D'ERREURS AVANCEE
  // ===================================

  // Retry automatique pour les requêtes qui échouent
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  // ===================================
  // METHODES POUR BATCH OPERATIONS
  // ===================================

  // Traitement par lots
  async batchProcess(items, processor, batchSize = 10, delay = 100) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(processor);
      const batchResults = await Promise.allSettled(batchPromises);
      
      results.push(...batchResults);
      
      // Délai entre les lots pour éviter de surcharger le serveur
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  // ===================================
  // METHODES POUR MONITORING
  // ===================================

  // Mesurer le temps de réponse
  async measureResponseTime(requestFn) {
    const start = performance.now();
    try {
      const result = await requestFn();
      const duration = performance.now() - start;
      console.log(`Requête exécutée en ${duration.toFixed(2)}ms`);
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Requête échouée après ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  // ===================================
  // METHODES POUR WEBSOCKETS (SI NECESSAIRE)
  // ===================================

  // Initialiser une connexion WebSocket
  initWebSocket(url) {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connecté');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Erreur parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket déconnecté');
      // Tentative de reconnexion après 5 secondes
      setTimeout(() => this.initWebSocket(url), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
  }

  // Gérer les messages WebSocket
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'notification':
        toast.info(data.message);
        break;
      case 'alert':
        toast.warning(data.message);
        break;
      case 'error':
        toast.error(data.message);
        break;
      default:
        console.log('Message WebSocket reçu:', data);
    }
  }

  // Envoyer un message via WebSocket
  sendWebSocketMessage(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket non connecté');
    }
  }

  // Fermer la connexion WebSocket
  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ===================================
  // METHODES POUR DEBUGGING
  // ===================================

  // Activer/désactiver le mode debug
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log('Mode debug activé pour apiService');
    }
  }

  // Logger pour debug
  debugLog(...args) {
    if (this.debugMode) {
      console.log('[ApiService Debug]', ...args);
    }
  }

  // ===================================
  // METHODES POUR CONFIGURATION DYNAMIQUE
  // ===================================

  // Mettre à jour la configuration
  updateConfig(newConfig) {
    if (newConfig.baseURL) {
      this.api.defaults.baseURL = newConfig.baseURL;
    }
    if (newConfig.timeout) {
      this.api.defaults.timeout = newConfig.timeout;
    }
    if (newConfig.headers) {
      Object.assign(this.api.defaults.headers, newConfig.headers);
    }
  }

  // Obtenir la configuration actuelle
  getConfig() {
    return {
      baseURL: this.api.defaults.baseURL,
      timeout: this.api.defaults.timeout,
      headers: this.api.defaults.headers
    };
  }
}

// Créer et exporter une instance unique
const apiService = new ApiService();

// Exporter aussi la classe pour les tests ou instances multiples
export { ApiService };

// Export par défaut de l'instance
export default apiService;