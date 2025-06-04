// src/pages/Notifications.js - Version simplifiée
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ lu: '', type: '' });
  const [stats, setStats] = useState({ total: 0, non_lues: 0, lues: 0 });

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications(filters);
      setNotifications(response.data.data.data || response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getNotificationsCount();
      setStats(response.data.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (stats.non_lues === 0) {
      toast.info('Toutes les notifications sont déjà lues');
      return;
    }

    try {
      await apiService.marquerToutesNotificationsLues();
      toast.success(`${stats.non_lues} notification(s) marquée(s) comme lues`);
      loadNotifications();
      loadStats();
    } catch (error) {
      toast.error('Erreur lors du marquage');
    }
  };

  const handleToggleRead = async (notification) => {
    try {
      if (notification.lu) {
        // Marquer comme non lue (besoin d'une route API)
        toast.info('Fonctionnalité à implémenter');
      } else {
        await apiService.marquerNotificationLue(notification.id);
        toast.success('Notification marquée comme lue');
      }
      
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notification.id
            ? { ...notif, lu: !notif.lu, lu_le: !notif.lu ? new Date().toISOString() : null }
            : notif
        )
      );
      loadStats();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (notification) => {
    if (!window.confirm('Supprimer cette notification ?')) return;

    try {
      await apiService.deleteNotification(notification.id);
      toast.success('Notification supprimée');
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
      loadStats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteRead = async () => {
    if (stats.lues === 0) {
      toast.info('Aucune notification lue à supprimer');
      return;
    }

    if (!window.confirm(`Supprimer toutes les ${stats.lues} notifications lues ?`)) return;

    try {
      await apiService.supprimerNotificationsLues();
      toast.success('Notifications lues supprimées');
      loadNotifications();
      loadStats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
    
    if (diffDays === 1) return 'Aujourd\'hui';
    if (diffDays === 2) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jour(s)`;
    return date.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Chargement des notifications...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
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
                <span className="text-warning fw-bold"> {stats.non_lues} non lues</span>
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-success"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={stats.non_lues === 0}
              >
                <i className="fas fa-check-double me-1"></i>
                Marquer toutes lues
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDeleteRead}
                disabled={stats.lues === 0}
              >
                <i className="fas fa-trash me-1"></i>
                Supprimer lues
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Select
                value={filters.lu}
                onChange={(e) => setFilters(prev => ({ ...prev, lu: e.target.value }))}
              >
                <option value="">Toutes les notifications</option>
                <option value="false">Non lues seulement</option>
                <option value="true">Lues seulement</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
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
                onClick={() => setFilters({ lu: '', type: '' })}
                className="w-100"
              >
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste */}
      {notifications.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
            <h4>Aucune notification</h4>
            <p className="text-muted">Vous n'avez pas de notifications pour le moment.</p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`mb-3 ${!notification.lu ? 'border-warning' : ''}`}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-start flex-grow-1">
                    <div className="me-3">
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>
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
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;