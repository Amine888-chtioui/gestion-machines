// src/services/apiService.js - Version complète mise à jour avec accepter/refuser
import axios from "axios";
import { toast } from "react-toastify";

class ApiService {
  constructor() {
    // Configuration de base d'Axios
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Intercepteur pour les requêtes
    this.api.interceptors.request.use(
      (config) => {
        // Ajouter le token d'authentification si disponible
        const token = localStorage.getItem("token");
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
            const refreshResponse = await this.api.post("/auth/refresh");
            const { token } = refreshResponse.data;
            localStorage.setItem("token", token);
            this.setAuthToken(token);

            // Retenter la requête originale
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Échec du rafraîchissement, déconnecter l'utilisateur
            localStorage.removeItem("token");
            window.location.href = "/login";
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
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common["Authorization"];
    }
  }

  // Gestion centralisée des erreurs
  handleError(error) {
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      const { status, data } = error.response;

      switch (status) {
        case 400:
          toast.error(data.message || "Requête invalide");
          break;
        case 403:
          toast.error("Accès interdit");
          break;
        case 404:
          toast.error("Ressource non trouvée");
          break;
        case 422:
          // Erreurs de validation
          if (data.errors) {
            Object.values(data.errors)
              .flat()
              .forEach((error) => {
                toast.error(error);
              });
          } else {
            toast.error(data.message || "Erreur de validation");
          }
          break;
        case 500:
          toast.error("Erreur interne du serveur");
          break;
        default:
          toast.error(data.message || "Une erreur est survenue");
      }
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse n'a été reçue
      toast.error("Impossible de contacter le serveur");
    } else {
      // Erreur lors de la configuration de la requête
      toast.error("Erreur de configuration de la requête");
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
    return this.post("/auth/login", credentials);
  }

  async register(userData) {
    return this.post("/auth/register", userData);
  }

  async logout() {
    return this.post("/auth/logout");
  }

  async getProfile() {
    return this.get("/auth/me");
  }

  async updateProfile(profileData) {
    return this.put("/auth/profile", profileData);
  }

  async refreshToken() {
    return this.post("/auth/refresh");
  }

  // ===================================
  // DASHBOARD
  // ===================================

  async getDashboard() {
    return this.get("/dashboard");
  }

  async getStatistiquesRapides() {
    return this.get("/dashboard/statistiques-rapides");
  }

  async getStatistiquesGenerales() {
    return this.get("/dashboard/statistiques-generales");
  }

  async getAlertes() {
    return this.get("/dashboard/alertes");
  }

  async getAlertesImportantes() {
    return this.get("/dashboard/alertes-importantes");
  }

  async getActivitesRecentes() {
    return this.get("/dashboard/activites");
  }

  async getGraphiqueEvolution() {
    return this.get("/dashboard/evolution");
  }

  async getResume() {
    return this.get("/dashboard/resume");
  }

  // ===================================
  // MACHINES (AVEC GESTION D'IMAGES)
  // ===================================

  async getMachines(params = {}) {
    return this.get("/machines", { params });
  }

  async getMachine(id) {
    return this.get(`/machines/${id}`);
  }

  async createMachine(machineData) {
    // Si machineData contient une image, utiliser FormData
    if (machineData.image) {
      const formData = new FormData();
      Object.keys(machineData).forEach((key) => {
        if (
          key === "specifications_techniques" &&
          typeof machineData[key] === "object"
        ) {
          formData.append(key, JSON.stringify(machineData[key]));
        } else {
          formData.append(key, machineData[key]);
        }
      });
      return this.uploadFile("/machines", formData);
    }
    return this.post("/machines", machineData);
  }

  async updateMachine(id, machineData) {
    // Si machineData contient une image, utiliser FormData avec _method PUT
    if (machineData.image) {
      const formData = new FormData();
      formData.append("_method", "PUT"); // Laravel method spoofing
      Object.keys(machineData).forEach((key) => {
        if (
          key === "specifications_techniques" &&
          typeof machineData[key] === "object"
        ) {
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
    return this.get("/machines/actives");
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
    return this.get("/machines/statistiques");
  }

  // Méthode pour supprimer l'image d'une machine
  async deleteMachineImage(id) {
    return this.delete(`/machines/${id}/image`);
  }

  // ===================================
  // COMPOSANTS (AVEC GESTION D'IMAGES)
  // ===================================

  async getComposants(params = {}) {
    return this.get("/composants", { params });
  }

  async getComposant(id) {
    return this.get(`/composants/${id}`);
  }

  async createComposant(composantData) {
  // Nettoyer les données avant envoi
  const cleanedData = this.cleanComposantData(composantData);
  
  // Si composantData contient une image, utiliser FormData
  if (cleanedData.image) {
    const formData = new FormData();
    Object.keys(cleanedData).forEach(key => {
      if (key === 'caracteristiques' && typeof cleanedData[key] === 'object') {
        formData.append(key, JSON.stringify(cleanedData[key]));
      } else if (cleanedData[key] !== null && cleanedData[key] !== undefined) {
        formData.append(key, cleanedData[key]);
      }
    });
    return this.uploadFile('/composants', formData);
  }
  return this.post('/composants', cleanedData);
}

cleanComposantData(composantData) {
  const cleaned = { ...composantData };
  
  // Nettoyer les champs numériques
  if (cleaned.prix_unitaire === '' || cleaned.prix_unitaire === 'null' || cleaned.prix_unitaire === null) {
    cleaned.prix_unitaire = null;
  } else if (cleaned.prix_unitaire !== null && cleaned.prix_unitaire !== undefined) {
    cleaned.prix_unitaire = parseFloat(cleaned.prix_unitaire);
  }
  
  if (cleaned.duree_vie_estimee === '' || cleaned.duree_vie_estimee === 'null' || cleaned.duree_vie_estimee === null) {
    cleaned.duree_vie_estimee = null;
  } else if (cleaned.duree_vie_estimee !== null && cleaned.duree_vie_estimee !== undefined) {
    cleaned.duree_vie_estimee = parseInt(cleaned.duree_vie_estimee);
  }
  
  if (cleaned.quantite !== null && cleaned.quantite !== undefined) {
    cleaned.quantite = parseInt(cleaned.quantite) || 1;
  }
  
  // Nettoyer les champs de chaîne vides
  const stringFields = ['fournisseur', 'description', 'notes'];
  stringFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === 'null') {
      cleaned[field] = null;
    }
  });
  
  // Nettoyer les champs de date vides
  const dateFields = ['date_installation', 'derniere_inspection', 'prochaine_inspection'];
  dateFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === 'null') {
      cleaned[field] = null;
    }
  });
  
  return cleaned;
}

async updateComposant(id, composantData) {
  // Nettoyer les données avant envoi
  const cleanedData = this.cleanComposantData(composantData);
  
  // Si composantData contient une image, utiliser FormData avec _method PUT
  if (cleanedData.image) {
    const formData = new FormData();
    formData.append('_method', 'PUT'); // Laravel method spoofing
    Object.keys(cleanedData).forEach(key => {
      if (key === 'caracteristiques' && typeof cleanedData[key] === 'object') {
        formData.append(key, JSON.stringify(cleanedData[key]));
      } else if (cleanedData[key] !== null && cleanedData[key] !== undefined) {
        formData.append(key, cleanedData[key]);
      }
    });
    return this.uploadFile(`/composants/${id}`, formData);
  }
  return this.put(`/composants/${id}`, cleanedData);
}

  async deleteComposant(id) {
    return this.delete(`/composants/${id}`);
  }

  // Méthode pour supprimer l'image d'un composant
  async deleteComposantImage(id) {
    return this.delete(`/composants/${id}/image`);
  }

  async getComposantsDefaillants() {
    return this.get("/composants/defaillants");
  }

  async getComposantsAInspecter() {
    return this.get("/composants/a-inspecter");
  }

  async updateComposantStatut(id, data) {
    return this.patch(`/composants/${id}/statut`, data);
  }

  async updateComposantInspection(id, data) {
    return this.patch(`/composants/${id}/inspection`, data);
  }

  async getStatistiquesComposants() {
    return this.get("/composants/statistiques");
  }

  // Méthode pour vérifier les images des composants (admin)
  async checkComposantImages() {
    return this.get("/composants/admin/check-images");
  }

  // ===================================
  // DEMANDES (AVEC ACCEPTER/REFUSER)
  // ===================================

  async getDemandes(params = {}) {
    return this.get("/demandes", { params });
  }

  async getDemande(id) {
    return this.get(`/demandes/${id}`);
  }

  async createDemande(demandeData) {
    return this.post("/demandes", demandeData);
  }

  async updateDemande(id, demandeData) {
    return this.put(`/demandes/${id}`, demandeData);
  }

  async deleteDemande(id) {
    return this.delete(`/demandes/${id}`);
  }

  // ===================================
  // NOUVELLES MÉTHODES ACCEPTER/REFUSER
  // ===================================

  /**
   * Accepter une demande (admin seulement)
   * @param {number} id - ID de la demande
   * @param {string} commentaire - Commentaire optionnel
   */
  async accepterDemande(id, commentaire = "") {
    return this.patch(`/demandes/${id}/accepter`, {
      commentaire_admin: commentaire,
    });
  }

  /**
   * Refuser une demande (admin seulement)
   * @param {number} id - ID de la demande
   * @param {string} commentaire - Motif du refus (obligatoire)
   */
  async refuserDemande(id, commentaire) {
    return this.patch(`/demandes/${id}/refuser`, {
      commentaire_admin: commentaire,
    });
  }

  /**
   * Changer le statut d'une demande (admin seulement)
   * @param {number} id - ID de la demande
   * @param {string} statut - Nouveau statut
   * @param {string} commentaire - Commentaire optionnel
   */
  async changerStatutDemande(id, statut, commentaire = "") {
    return this.patch(`/demandes/${id}/statut`, {
      statut,
      commentaire_admin: commentaire,
    });
  }

  /**
   * Obtenir les demandes en attente (admin seulement)
   */
  async getDemandesEnAttente() {
    return this.get("/demandes/en-attente");
  }

  /**
   * Obtenir les demandes urgentes (admin seulement)
   */
  async getDemandesUrgentes() {
    return this.get("/demandes/urgentes");
  }

  /**
   * Obtenir mes demandes récentes
   */
  async getMesDemandesRecentes() {
    return this.get("/demandes/mes-demandes-recentes");
  }

  /**
   * Obtenir les statistiques des demandes
   */
  async getStatistiquesDemandes() {
    return this.get("/demandes/statistiques");
  }

  // ===================================
  // TYPES
  // ===================================

  async getTypes(params = {}) {
    return this.get("/types", { params });
  }

  async getType(id) {
    return this.get(`/types/${id}`);
  }

  async createType(typeData) {
    return this.post("/types", typeData);
  }

  async updateType(id, typeData) {
    return this.put(`/types/${id}`, typeData);
  }

  async deleteType(id) {
    return this.delete(`/types/${id}`);
  }

  async getTypesActifs() {
    return this.get("/types/actifs");
  }

  async toggleTypeActif(id) {
    return this.patch(`/types/${id}/toggle-actif`);
  }

  async getStatistiquesTypes() {
    return this.get("/types/statistiques");
  }

  // ===================================
  // NOTIFICATIONS
  // ===================================

  async getNotifications(params = {}) {
    return this.get("/notifications", { params });
  }

  async getNotification(id) {
    return this.get(`/notifications/${id}`);
  }

  async getNotificationsNonLues() {
    return this.get("/notifications/non-lues");
  }

  async getNotificationsRecentes() {
    return this.get("/notifications/recentes");
  }

  async getNotificationsCount() {
    return this.get("/notifications/count");
  }

  async marquerNotificationLue(id) {
    return this.patch(`/notifications/${id}/lue`);
  }

  async marquerNotificationNonLue(id) {
    return this.patch(`/notifications/${id}/non-lue`);
  }

  async marquerToutesNotificationsLues() {
    return this.patch("/notifications/marquer-toutes-lues");
  }

  async deleteNotification(id) {
    return this.delete(`/notifications/${id}`);
  }

  async supprimerNotificationsLues() {
    return this.delete("/notifications/lues/supprimer");
  }

  async creerNotification(data) {
    return this.post("/notifications", data);
  }

  async diffuserNotification(data) {
    return this.post("/notifications/diffuser", data);
  }

  // ===================================
  // UTILISATEURS
  // ===================================

  async getUtilisateurs(params = {}) {
    return this.get("/users", { params });
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
  // METHODES UTILITAIRES POUR IMAGES
  // ===================================

  // Méthode utilitaire pour gérer les uploads avec preview
  createImagePreview(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Le fichier doit être une image"));
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
    if (!file.type.startsWith("image/")) {
      errors.push("Le fichier doit être une image");
    }

    // Vérifier les extensions autorisées (plus permissif)
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push("Format non autorisé. Utilisez: JPG, PNG, GIF, WEBP");
    }

    // Vérifier la taille (5MB max au lieu de 2MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push("L'image ne doit pas dépasser 5MB");
    }

    // Note: Nous ne vérifions plus les dimensions côté client car c'est fait côté serveur

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  // Redimensionner une image côté client
  resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
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
    if (!file.type.startsWith("image/")) {
      return file;
    }

    try {
      const compressedBlob = await this.resizeImage(file, 1200, 1200, quality);
      return new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.error("Erreur lors de la compression:", error);
      return file; // Retourner le fichier original en cas d'erreur
    }
  }

  // Méthode pour convertir blob en File
  blobToFile(blob, fileName) {
    return new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now(),
    });
  }

  // Méthode pour obtenir les métadonnées d'une image
  getImageMetadata(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Le fichier doit être une image"));
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
          lastModified: file.lastModified,
          sizeFormatted: this.formatFileSize(file.size),
        });
        URL.revokeObjectURL(img.src); // Nettoyer la mémoire
      };
      img.onerror = () => {
        // En cas d'erreur, on retourne quand même les infos de base
        resolve({
          width: "unknown",
          height: "unknown",
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified,
          sizeFormatted: this.formatFileSize(file.size),
          error: "Impossible de lire les dimensions",
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // ===================================
  // METHODES UTILITAIRES GENERALES
  // ===================================

  // Méthode pour formater les erreurs de validation
  formatValidationErrors(errors) {
    const formattedErrors = {};
    Object.keys(errors).forEach((field) => {
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
        "Content-Type": "multipart/form-data",
        ...config.headers,
      },
    };
    return this.post(url, formData, uploadConfig);
  }

  // Méthode pour télécharger des fichiers
  async downloadFile(url, filename) {
    try {
      const response = await this.api.get(url, {
        responseType: "blob",
      });

      // Créer un lien de téléchargement
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return response;
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      throw error;
    }
  }

  // ===================================
  // HEALTH CHECK
  // ===================================

  async healthCheck() {
    return this.get("/health");
  }

  async testConnection() {
    return this.get("/test");
  }

  // ===================================
  // METHODES UTILITAIRES POUR FORMATS
  // ===================================

  // Formater la taille de fichier
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Formater une date
  formatDate(date, locale = "fr-FR") {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString(locale);
  }

  // Formater une date avec heure
  formatDateTime(date, locale = "fr-FR") {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString(locale);
  }

  // Formater un prix
  formatPrice(price, currency = "EUR", locale = "fr-FR") {
    if (!price) return "-";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
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
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      score,
      strength: score < 2 ? "faible" : score < 4 ? "moyen" : "fort",
      checks,
    };
  }

  // ===================================
  // METHODES UTILITAIRES POUR CACHE
  // ===================================

  // Cache simple en mémoire
  _cache = new Map();

  // Mettre en cache
  setCache(key, data, ttl = 300000) {
    // TTL par défaut: 5 minutes
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
}

// Créer et exporter une instance unique
const apiService = new ApiService();

// Exporter aussi la classe pour les tests ou instances multiples
export { ApiService };

// Export par défaut de l'instance
export default apiService;
