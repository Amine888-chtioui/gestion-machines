// src/pages/Dashboard.js - Version simplifiée
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await apiService.getDashboard();
      setData(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, link }) => (
    <Card className="h-100">
      <Card.Body className="d-flex align-items-center">
        <div className={`me-3 p-3 rounded bg-${color} text-white`}>
          <i className={icon}></i>
        </div>
        <div className="flex-grow-1">
          <h6 className="text-muted mb-1">{title}</h6>
          <h3 className={`mb-0 text-${color}`}>{value}</h3>
          {link && (
            <Link to={link} className="btn btn-outline-primary btn-sm mt-2">
              Voir détails
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  const AlertCard = ({ type, message, action, link }) => (
    <div className={`alert alert-${type} d-flex justify-content-between align-items-center`}>
      <span>{message}</span>
      {action && link && (
        <Button as={Link} to={link} variant={`outline-${type}`} size="sm">
          {action}
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Chargement du tableau de bord...</p>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const stats = data?.statistiques || {};

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4">
        <h1 className="h3 mb-1">
          <i className="fas fa-tachometer-alt text-primary me-2"></i>
          Tableau de Bord
        </h1>
        <p className="text-muted">Bienvenue {user?.name} !</p>
      </div>

      {/* Alertes */}
      {data?.resume?.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Alertes importantes</h5>
          </Card.Header>
          <Card.Body>
            {data.resume.map((item, index) => (
              <AlertCard
                key={index}
                type={item.type === 'error' ? 'danger' : item.type}
                message={item.message}
                action={item.action}
                link={
                  item.action?.includes('demandes') ? '/demandes' :
                  item.action?.includes('composants') ? '/composants' :
                  item.action?.includes('machines') ? '/machines' : null
                }
              />
            ))}
          </Card.Body>
        </Card>
      )}

      {/* Statistiques */}
      <Row className="mb-4">
        {isAdmin ? (
          <>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Machines"
                value={stats.machines?.total || 0}
                icon="fas fa-cogs"
                color="primary"
                link="/machines"
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Composants"
                value={stats.composants?.total || 0}
                icon="fas fa-puzzle-piece"
                color="info"
                link="/composants"
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Demandes"
                value={stats.demandes?.total || 0}
                icon="fas fa-file-alt"
                color="success"
                link="/demandes"
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Utilisateurs"
                value={stats.utilisateurs?.total || 0}
                icon="fas fa-users"
                color="warning"
              />
            </Col>
          </>
        ) : (
          <>
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Mes Demandes"
                value={data?.mes_statistiques?.mes_demandes?.total || 0}
                icon="fas fa-file-alt"
                color="primary"
                link="/demandes"
              />
            </Col>
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Machines Actives"
                value={data?.statistiques_generales?.machines?.actives || 0}
                icon="fas fa-cogs"
                color="success"
                link="/machines"
              />
            </Col>
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Composants OK"
                value={data?.statistiques_generales?.composants?.bon || 0}
                icon="fas fa-puzzle-piece"
                color="info"
                link="/composants"
              />
            </Col>
          </>
        )}
      </Row>

      {/* Activités récentes */}
      <Row>
        <Col lg={8} className="mb-3">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Demandes récentes</h5>
              <Link to="/demandes" className="btn btn-outline-primary btn-sm">
                Voir toutes
              </Link>
            </Card.Header>
            <Card.Body>
              {(data?.activites_recentes?.demandes_recentes || data?.mes_demandes_recentes || []).length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Titre</th>
                        <th>Machine</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isAdmin ? data.activites_recentes?.demandes_recentes : data.mes_demandes_recentes)
                        ?.slice(0, 5)
                        .map((demande) => (
                        <tr key={demande.id}>
                          <td>
                            <Link to={`/demandes/${demande.id}`} className="fw-bold text-primary">
                              {demande.numero_demande}
                            </Link>
                          </td>
                          <td>{demande.titre}</td>
                          <td>{demande.machine?.nom}</td>
                          <td>
                            <Badge bg={
                              demande.statut === 'acceptee' ? 'success' :
                              demande.statut === 'refusee' ? 'danger' :
                              demande.statut === 'en_cours' ? 'info' : 'warning'
                            }>
                              {demande.statut.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Aucune demande récente</p>
                  <Button as={Link} to="/demandes" variant="outline-primary">
                    Créer une demande
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-3">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Notifications</h5>
              <Link to="/notifications" className="btn btn-outline-primary btn-sm">
                Voir toutes
              </Link>
            </Card.Header>
            <Card.Body>
              {data?.activites_recentes?.notifications_non_lues?.length > 0 ? (
                <div>
                  {data.activites_recentes.notifications_non_lues.slice(0, 3).map((notification) => (
                    <div key={notification.id} className="mb-3 p-2 bg-light rounded">
                      <h6 className="mb-1">{notification.titre}</h6>
                      <p className="mb-1 small">{notification.message}</p>
                      <small className="text-muted">
                        {new Date(notification.created_at).toLocaleString()}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-bell-slash fa-2x text-muted mb-3"></i>
                  <p className="text-muted">Aucune notification</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Actions rapides */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Actions rapides</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6} lg={3} className="mb-3">
              <Button 
                as={Link} 
                to="/demandes" 
                variant="outline-primary" 
                className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                style={{ minHeight: '100px' }}
              >
                <i className="fas fa-plus fa-2x mb-2"></i>
                <span>Nouvelle Demande</span>
              </Button>
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <Button 
                as={Link} 
                to="/machines" 
                variant="outline-info" 
                className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                style={{ minHeight: '100px' }}
              >
                <i className="fas fa-cogs fa-2x mb-2"></i>
                <span>Machines</span>
              </Button>
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <Button 
                as={Link} 
                to="/composants" 
                variant="outline-success" 
                className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                style={{ minHeight: '100px' }}
              >
                <i className="fas fa-puzzle-piece fa-2x mb-2"></i>
                <span>Composants</span>
              </Button>
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <Button 
                as={Link} 
                to="/notifications" 
                variant="outline-warning" 
                className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                style={{ minHeight: '100px' }}
              >
                <i className="fas fa-bell fa-2x mb-2"></i>
                <span>Notifications</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Dashboard;