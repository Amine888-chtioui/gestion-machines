// src/services/apiService.js
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

  // Méthodes HTTP
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

  // Méthodes spécifiques pour l'application

  // === AUTHENTIFICATION ===
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

  // === DASHBOARD ===
  async getDashboard() {
    return this.get('/dashboard');
  }

  async getStatistiquesRapides() {
    return this.get('/dashboard/statistiques-rapides');
  }

  async getAlertes() {
    return this.get('/dashboard/alertes');
  }

  // === MACHINES ===
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

  // === COMPOSANTS ===
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

  async updateComposantStatut(id, data) {
    return this.patch(`/composants/${id}/statut`, data);
  }

  // === DEMANDES ===
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

  async getDemandesEnAttente() {
    return this.get('/demandes/en-attente');
  }

  // === TYPES ===
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

  // === NOTIFICATIONS ===
  async getNotifications(params = {}) {
    return this.get('/notifications', { params });
  }

  async getNotificationsNonLues() {
    return this.get('/notifications/non-lues');
  }

  async marquerNotificationLue(id) {
    return this.patch(`/notifications/${id}/lue`);
  }

  async marquerToutesNotificationsLues() {
    return this.patch('/notifications/marquer-toutes-lues');
  }

  async deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  // === HEALTH CHECK ===
  async healthCheck() {
    return this.get('/health');
  }
}

const apiService = new ApiService();
export default apiService;