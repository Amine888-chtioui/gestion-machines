// src/services/apiService.js - Version complète mise à jour
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
  // MACHINES
  // ===================================

  async getMachines(params = {}) {
    return this.get('/machines', { params });
  }

  async getMachine(id) {
    return this.get(`/machines/${id}`);
  }

  async createMachine(machineData) {
    return this.post('/machines', machineData);
  }

  async updateMachine(id, machineData) {
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
  // METHODES UTILITAIRES
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
}

// Créer et exporter une instance unique
const apiService = new ApiService();
export default apiService;