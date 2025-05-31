import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import apiService from '../services/apiService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiService.getNotifications();
      setNotifications(response.data.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Notifications</h1>
        <Button variant="outline-primary">Marquer toutes comme lues</Button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status"></div>
        </div>
      ) : (
        <div>
          {notifications.map((notification) => (
            <Card key={notification.id} className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6>{notification.titre}</h6>
                    <p className="text-muted">{notification.message}</p>
                    <small className="text-muted">
                      {new Date(notification.created_at).toLocaleString()}
                    </small>
                  </div>
                  <Badge bg={notification.lu ? 'secondary' : 'primary'}>
                    {notification.lu ? 'Lu' : 'Non lu'}
                  </Badge>
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