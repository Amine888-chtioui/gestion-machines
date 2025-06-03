// src/pages/Notifications.js - Version mise à jour avec fonctionnalité complète
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Spinner, Alert, Modal, Form, Dropdown } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    lu: '', // '' = toutes, 'true' = lues, 'false' = non lues
  });
  const [stats, setStats] = useState({
    total: 0,
    non_lues: 0,
    lues: 0,
    recentes: 0
  });

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      console.log('🔄 Chargement des notifications avec params:', params);
      const response = await apiService.getNotifications(params);
      console.log('📥 Réponse API notifications:', response.data);
      
      if (response.data && response.data.data) {
        const notificationsData = response.data.data.data || response.data.data;
        setNotifications(notificationsData);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des notifications:', error);
      setError('Erreur lors du chargement des notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getNotificationsCount();
      if (response.data && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadStats()]);
    setRefreshing(false);
    toast.success('Notifications actualisées');
  };

  // NOUVELLE FONCTION : Marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async () => {
    if (stats.non_lues === 0) {
      toast.info('Toutes les notifications sont déjà lues');
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir marquer toutes les ${stats.non_lues} notifications non lues comme lues ?`)) {
      return;
    }

    setMarkingAllAsRead(true);
    try {
      console.log('📝 Marquage de toutes les notifications comme lues...');
      
      const response = await apiService.marquerToutesNotificationsLues();
      console.log('✅ Réponse marquage:', response.data);
      
      toast.success(`${stats.non_lues} notification(s) marquée(s) comme lues`);
      
      // Recharger les données
      await Promise.all([loadNotifications(), loadStats()]);
      
    } catch (error) {
      console.error('❌ Erreur lors du marquage:', error);
      toast.error('Erreur lors du marquage des notifications');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Marquer une notification comme lue/non lue
  const handleToggleRead = async (notification) => {
    try {
      if (notification.lu) {
        await apiService.marquerNotificationNonLue(notification.id);
        toast.success('Notification marquée comme non lue');
      } else {
        await apiService.marquerNotificationLue(notification.id);
        toast.success('Notification marquée comme lue');
      }
      
      // Mettre à jour l'état local immédiatement
      setNotifications(prevNotifications =>
        prevNotifications.map(notif =>
          notif.id === notification.id
            ? { ...notif, lu: !notif.lu, lu_le: !notif.lu ? new Date().toISOString() : null }
            : notif
        )
      );
      
      // Recharger les stats
      loadStats();
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la notification');
    }
  };

  // Supprimer une notification
  const handleDelete = async (notification) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
      return;
    }

    try {
      await apiService.deleteNotification(notification.id);
      toast.success('Notification supprimée');
      
      // Mettre à jour l'état local
      setNotifications(prevNotifications =>
        prevNotifications.filter(notif => notif.id !== notification.id)
      );
      
      // Recharger les stats
      loadStats();
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la notification');
    }
  };

  // Supprimer toutes les notifications lues
  const handleDeleteRead = async () => {
    if (stats.lues === 0) {
      toast.info('Aucune notification lue à supprimer');
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les ${stats.lues} notifications lues ?`)) {
      return;
    }

    setDeletingRead(true);
    try {
      const response = await apiService.supprimerNotificationsLues();
      toast.success(response.data.message || 'Notifications lues supprimées');
      
      // Recharger les données
      await Promise.all([loadNotifications(), loadStats()]);
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression des notifications lues');
    } finally {
      setDeletingRead(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      lu: ''
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'info': 'fas fa-info-circle text-primary',
      'success': 'fas fa-check-circle text-success',
      'warning': 'fas fa-exclamation-triangle text-warning',
      'error': 'fas fa-times-circle text-danger'
    };
    return icons[type] || 'fas fa-bell text-secondary';
  };

  const getNotificationBadge = (type) => {
    const variants = {
      'info': 'primary',
      'success': 'success',
      'warning': 'warning',
      'error': 'danger'
    };
    return variants[type] || 'secondary';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Aujourd\'hui à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 2) {
      return 'Hier à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jour(s)`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* En-tête avec statistiques */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-bell me-2"></i>
                Notifications
              </h2>
              <p className="text-muted mb-0">
                {stats.total} notification(s) - 
                <span className="text-warning fw-bold"> {stats.non_lues} non lues</span> - 
                <span className="text-success"> {stats.lues} lues</span>
              </p>
            </div>
            <div className="d-flex gap-2">
              {/* Bouton de rafraîchissement */}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Actualiser les notifications"
              >
                {refreshing ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : (
                  <i className="fas fa-sync-alt"></i>
                )}
              </Button>

              {/* Actions en lot */}
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" size="sm">
                  <i className="fas fa-cog me-1"></i>
                  Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllAsRead || stats.non_lues === 0}
                  >
                    {markingAllAsRead ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Marquage en cours...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-double me-2 text-success"></i>
                        Marquer toutes comme lues ({stats.non_lues})
                      </>
                    )}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    onClick={handleDeleteRead}
                    disabled={deletingRead || stats.lues === 0}
                    className="text-danger"
                  >
                    {deletingRead ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Suppression...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-trash me-2"></i>
                        Supprimer les lues ({stats.lues})
                      </>
                    )}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Select
                value={filters.lu}
                onChange={(e) => handleFilterChange('lu', e.target.value)}
              >
                <option value="">Toutes les notifications</option>
                <option value="false">Non lues seulement</option>
                <option value="true">Lues seulement</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">Tous les types</option>
                <option value="info">Information</option>
                <option value="success">Succès</option>
                <option value="warning">Avertissement</option>
                <option value="error">Erreur</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="outline-secondary"
                onClick={clearFilters}
                title="Effacer les filtres"
                className="w-100"
              >
                <i className="fas fa-times me-1"></i>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des notifications */}
      {notifications.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-5">
              <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
              <h4>Aucune notification</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucune notification ne correspond à vos critères.'
                  : 'Vous n\'avez pas encore de notifications.'
                }
              </p>
              {Object.values(filters).some(filter => filter !== '') && (
                <Button variant="outline-primary" onClick={clearFilters}>
                  <i className="fas fa-times me-2"></i>
                  Effacer les filtres
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`mb-3 notification-card ${!notification.lu ? 'notification-unread' : ''}`}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-start flex-grow-1">
                    {/* Icône */}
                    <div className="notification-icon me-3">
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>

                    {/* Contenu */}
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className={`mb-1 ${!notification.lu ? 'fw-bold' : ''}`}>
                          {notification.titre}
                          {!notification.lu && (
                            <Badge bg="warning" className="ms-2">Nouveau</Badge>
                          )}
                        </h6>
                        <Badge bg={getNotificationBadge(notification.type)}>
                          {notification.type}
                        </Badge>
                      </div>

                      <p className={`mb-2 ${!notification.lu ? 'text-dark' : 'text-muted'}`}>
                        {notification.message}
                      </p>

                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          <i className="fas fa-clock me-1"></i>
                          {formatDate(notification.created_at)}
                          {notification.lu && notification.lu_le && (
                            <span className="ms-2">
                              • Lu le {formatDate(notification.lu_le)}
                            </span>
                          )}
                        </small>

                        {/* Actions */}
                        <div className="d-flex gap-1">
                          <Button
                            variant={notification.lu ? "outline-warning" : "outline-success"}
                            size="sm"
                            onClick={() => handleToggleRead(notification)}
                            title={notification.lu ? "Marquer comme non lue" : "Marquer comme lue"}
                          >
                            <i className={`fas ${notification.lu ? 'fa-eye-slash' : 'fa-check'}`}></i>
                          </Button>
                          
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(notification)}
                            title="Supprimer"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </div>

                      {/* Données supplémentaires si disponibles */}
                      {notification.data && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <small className="text-muted">
                            {notification.data.demande_id && (
                              <span className="me-3">
                                <i className="fas fa-file-alt me-1"></i>
                                Demande #{notification.data.numero_demande || notification.data.demande_id}
                              </span>
                            )}
                            {notification.data.machine_id && (
                              <span className="me-3">
                                <i className="fas fa-cog me-1"></i>
                                Machine ID: {notification.data.machine_id}
                              </span>
                            )}
                            {notification.data.composant_id && (
                              <span>
                                <i className="fas fa-puzzle-piece me-1"></i>
                                Composant ID: {notification.data.composant_id}
                              </span>
                            )}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        .notification-card {
          transition: all 0.3s ease;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }

        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .notification-unread {
          border-left: 4px solid #ffc107;
          background: linear-gradient(135deg, #fff8e1 0%, #ffffff 100%);
        }

        .notification-icon {
          font-size: 1.2rem;
          width: 30px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 2px;
        }

        .notifications-list {
          animation: fadeInUp 0.5s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        .btn-outline-success:hover {
          background-color: #28a745;
          border-color: #28a745;
        }

        .btn-outline-warning:hover {
          background-color: #ffc107;
          border-color: #ffc107;
          color: #212529;
        }

        .btn-outline-danger:hover {
          background-color: #dc3545;
          border-color: #dc3545;
        }

        /* Animation pour les actions en cours */
        .spinner-border-sm {
          width: 0.875rem;
          height: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .notification-card .card-body {
            padding: 1rem;
          }
          
          .notification-icon {
            font-size: 1rem;
            width: 25px;
          }
          
          .d-flex.gap-1 {
            flex-direction: column;
            gap: 0.25rem !important;
          }
          
          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 576px) {
          .notifications-page h2 {
            font-size: 1.5rem;
          }
          
          .d-flex.justify-content-between.align-items-center {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
          
          .d-flex.gap-2 {
            justify-content: center;
          }
        }

        /* États des notifications */
        .notification-unread h6 {
          color: #495057;
        }

        .notification-card .card-body:hover .btn {
          opacity: 1;
        }

        .btn {
          transition: all 0.2s ease;
        }

        /* Amélioration de l'accessibilité */
        .notification-card:focus-within {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* Animation pour le rafraîchissement */
        .fa-sync-alt {
          transition: transform 0.3s ease;
        }

        .fa-sync-alt:hover {
          transform: rotate(180deg);
        }

        /* Style pour les dropdowns */
        .dropdown-menu {
          border-radius: 8px;
          border: none;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .dropdown-item {
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa;
        }

        .dropdown-item.text-danger:hover {
          background-color: #f8d7da;
          color: #721c24 !important;
        }

        /* Indicateurs visuels pour les actions */
        .btn[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Animation des cartes */
        .notification-card:nth-child(1) { animation-delay: 0.1s; }
        .notification-card:nth-child(2) { animation-delay: 0.2s; }
        .notification-card:nth-child(3) { animation-delay: 0.3s; }
        .notification-card:nth-child(4) { animation-delay: 0.4s; }
        .notification-card:nth-child(5) { animation-delay: 0.5s; }
      `}</style>
    </div>
  );
};

export default Notifications;