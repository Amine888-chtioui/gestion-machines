// src/pages/Dashboard.js - Version corrigée sans jsx invalide
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Alert, Spinner, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

// Styles CSS à placer dans un fichier séparé ou dans index.css
const dashboardStyles = `
  .stat-card {
    transition: all 0.3s ease;
    border-radius: 12px;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
  }

  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .notification-item {
    background: rgba(0,123,255,0.05);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .notification-item:hover {
    background: rgba(0,123,255,0.1);
    transform: translateX(2px);
  }

  .action-btn {
    border: 2px solid;
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .action-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }

  .card {
    border-radius: 12px;
    border: none;
  }

  .card-header {
    border-radius: 12px 12px 0 0;
  }

  .table th {
    border-top: none;
    border-bottom: 2px solid #e9ecef;
    font-weight: 600;
    color: #495057;
    background-color: transparent;
  }

  .table td {
    border-top: 1px solid #f1f3f4;
    vertical-align: middle;
  }

  .table tbody tr:hover {
    background-color: #f8f9fa;
  }

  .alert {
    border-radius: 10px;
    border: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.35em 0.65em;
  }

  @media (max-width: 768px) {
    .stat-icon {
      width: 50px;
      height: 50px;
      font-size: 1.2rem;
    }

    .card-title {
      font-size: 0.9rem;
    }

    h3 {
      font-size: 1.5rem;
    }

    .action-btn {
      min-height: 80px !important;
    }

    .action-btn i {
      font-size: 1.5rem !important;
    }

    .table-responsive {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 576px) {
    .stat-card .card-body {
      padding: 1rem;
    }

    .notification-item {
      padding: 0.75rem !important;
    }

    .action-btn {
      min-height: 70px !important;
      padding: 0.75rem !important;
    }

    .action-btn span {
      font-size: 0.9rem;
    }

    .action-btn small {
      font-size: 0.75rem;
    }
  }

  .fa-sync-alt {
    transition: transform 0.3s ease;
  }

  .fa-sync-alt:hover {
    transform: rotate(180deg);
  }

  .custom-tooltip {
    background: rgba(0,0,0,0.8);
    border: none;
    border-radius: 8px;
    color: white;
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

  .card {
    animation: fadeInUp 0.5s ease-out;
  }

  .bg-primary {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
  }

  .bg-success {
    background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%) !important;
  }

  .bg-info {
    background: linear-gradient(135deg, #17a2b8 0%, #117a8b 100%) !important;
  }

  .bg-warning {
    background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%) !important;
  }

  .bg-danger {
    background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%) !important;
  }

  .card a {
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .card a:hover {
    text-decoration: underline;
  }

  .badge {
    text-transform: capitalize;
    letter-spacing: 0.5px;
  }

  .alert-danger {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    border-left: 4px solid #dc3545;
  }

  .alert-warning {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-left: 4px solid #ffc107;
  }

  .alert-info {
    background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
    border-left: 4px solid #17a2b8;
  }

  .alert-success {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border-left: 4px solid #28a745;
  }

  @media (min-width: 1200px) {
    .container-fluid {
      max-width: 1400px;
    }
  }

  @media print {
    .btn, .alert .btn {
      display: none !important;
    }
    
    .card {
      border: 1px solid #ddd !important;
      break-inside: avoid;
    }
    
    .stat-card:hover {
      transform: none !important;
      box-shadow: none !important;
    }
  }
`;

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [statistiquesRapides, setStatistiquesRapides] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Injecter les styles dans le document (une seule fois)
  useEffect(() => {
    const styleId = 'dashboard-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = dashboardStyles;
      document.head.appendChild(style);
    }

    // Cleanup function pour supprimer les styles quand le composant est démonté
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadStatistiquesRapides();
    
    // Rafraîchir toutes les 2 minutes
    const interval = setInterval(() => {
      loadStatistiquesRapides();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistiquesRapides = async () => {
    try {
      setRefreshing(true);
      const response = await apiService.getStatistiquesRapides();
      setStatistiquesRapides(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques rapides:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadDashboardData(),
      loadStatistiquesRapides()
    ]);
  };

  // Composant pour les cartes de statistiques
  const StatCard = ({ title, value, icon, color, subtext, link, badge, trend }) => (
    <Card className="h-100 border-0 shadow-sm stat-card">
      <Card.Body className="d-flex align-items-center">
        <div className={`stat-icon bg-${color} text-white me-3`}>
          <i className={icon}></i>
        </div>
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h6 className="card-title mb-1 text-muted">{title}</h6>
              <h3 className={`mb-0 text-${color} fw-bold`}>
                {value}
                {badge && (
                  <Badge bg={badge.color} className="ms-2 fs-6">
                    {badge.text}
                  </Badge>
                )}
              </h3>
              {subtext && <small className="text-muted">{subtext}</small>}
              {trend && (
                <div className="mt-1">
                  <span className={`small ${trend.type === 'increase' ? 'text-success' : 'text-danger'}`}>
                    <i className={`fas fa-arrow-${trend.type === 'increase' ? 'up' : 'down'} me-1`}></i>
                    {trend.value}
                  </span>
                  <span className="small text-muted ms-1">vs mois dernier</span>
                </div>
              )}
            </div>
          </div>
          {link && (
            <Link to={link} className="btn btn-outline-primary btn-sm mt-2">
              <i className="fas fa-arrow-right me-1"></i>
              Voir détails
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  // Composant pour les alertes
  const AlertCard = ({ type, message, action, link, icon }) => (
    <Alert variant={type} className="mb-2 d-flex justify-content-between align-items-center border-0 shadow-sm">
      <div className="d-flex align-items-center">
        <i className={`fas ${icon || (type === 'danger' ? 'fa-exclamation-triangle' : type === 'warning' ? 'fa-clock' : 'fa-info-circle')} me-2`}></i>
        <span>{message}</span>
      </div>
      {action && link && (
        <Button as={Link} to={link} variant={`outline-${type}`} size="sm">
          {action}
        </Button>
      )}
    </Alert>
  );

  // Composant pour les notifications
  const NotificationItem = ({ notification }) => (
    <div className="notification-item mb-3 p-3 border-start border-3 border-primary rounded-end">
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          <h6 className="mb-1 fw-bold">{notification.titre}</h6>
          <p className="mb-1 small text-muted">{notification.message}</p>
          <small className="text-muted">
            <i className="fas fa-clock me-1"></i>
            {notification.temps_ecoule || new Date(notification.created_at).toLocaleString()}
          </small>
        </div>
        <Badge bg={notification.type_color || 'primary'} className="ms-2">
          <i className={notification.type_icon || 'fas fa-bell'}></i>
        </Badge>
      </div>
    </div>
  );

  // Couleurs pour les graphiques
  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8'];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const data = dashboardData?.data || {};

  return (
    <div>
      {/* En-tête avec bouton de rafraîchissement */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-tachometer-alt text-primary me-2"></i>
            Tableau de Bord
          </h1>
          <p className="text-muted mb-0">
            Bienvenue {user?.name} ! Voici un aperçu de votre système TELSOSPLICE TS3.
          </p>
        </div>
        <div className="d-flex align-items-center">
          <small className="text-muted me-3">
            Dernière mise à jour: {new Date().toLocaleTimeString()}
          </small>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              <i className="fas fa-sync-alt"></i>
            )}
          </Button>
        </div>
      </div>

      {/* Résumé et alertes importantes */}
      {data.resume && data.resume.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-exclamation-circle text-warning me-2"></i>
                  Alertes et Actions Requises
                </h5>
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
                      item.action?.includes('composants') ? '/composants?statut=defaillant' :
                      item.action?.includes('maintenance') ? '/machines?statut=maintenance' :
                      item.action?.includes('inspections') ? '/composants?a_inspecter=true' :
                      null
                    }
                  />
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Statistiques principales */}
      <Row className="mb-4">
        {isAdmin ? (
          <>
            {/* Vue Administrateur */}
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Machines Total"
                value={data.statistiques?.machines?.total || 0}
                icon="fas fa-cogs"
                color="primary"
                subtext={`${data.statistiques?.machines?.actives || 0} actives / ${data.statistiques?.machines?.en_maintenance || 0} en maintenance`}
                link="/machines"
                badge={data.statistiques?.machines?.en_maintenance > 0 ? {
                  text: `${data.statistiques?.machines?.en_maintenance} maintenance`,
                  color: 'warning'
                } : null}
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Composants Total"
                value={data.statistiques?.composants?.total || 0}
                icon="fas fa-puzzle-piece"
                color="info"
                subtext={`${data.statistiques?.composants?.bon || 0} en bon état / ${data.statistiques?.composants?.usure || 0} en usure`}
                link="/composants"
                badge={data.statistiques?.composants?.defaillant > 0 ? {
                  text: `${data.statistiques?.composants?.defaillant} défaillants`,
                  color: 'danger'
                } : null}
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Demandes"
                value={data.statistiques?.demandes?.total || 0}
                icon="fas fa-file-alt"
                color="success"
                subtext={`${data.statistiques?.demandes?.cette_semaine || 0} cette semaine / ${data.statistiques?.demandes?.ce_mois || 0} ce mois`}
                link="/demandes"
                badge={data.statistiques?.demandes?.en_attente > 0 ? {
                  text: `${data.statistiques?.demandes?.en_attente} en attente`,
                  color: 'warning'
                } : data.statistiques?.demandes?.urgentes > 0 ? {
                  text: `${data.statistiques?.demandes?.urgentes} urgentes`,
                  color: 'danger'
                } : null}
              />
            </Col>
            <Col md={6} lg={3} className="mb-3">
              <StatCard
                title="Utilisateurs"
                value={data.statistiques?.utilisateurs?.total || 0}
                icon="fas fa-users"
                color="warning"
                subtext={`${data.statistiques?.utilisateurs?.actifs || 0} actifs / ${data.statistiques?.utilisateurs?.admins || 0} admins`}
              />
            </Col>
          </>
        ) : (
          <>
            {/* Vue Utilisateur */}
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Mes Demandes"
                value={data.mes_statistiques?.mes_demandes?.total || 0}
                icon="fas fa-file-alt"
                color="primary"
                subtext={`${data.mes_statistiques?.mes_demandes?.ce_mois || 0} ce mois`}
                link="/demandes"
                badge={data.mes_statistiques?.mes_demandes?.en_attente > 0 ? {
                  text: `${data.mes_statistiques?.mes_demandes?.en_attente} en attente`,
                  color: 'warning'
                } : null}
              />
            </Col>
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Machines Actives"
                value={data.statistiques_generales?.machines?.actives || 0}
                icon="fas fa-cogs"
                color="success"
                subtext="Système opérationnel"
                link="/machines"
              />
            </Col>
            <Col md={6} lg={4} className="mb-3">
              <StatCard
                title="Composants OK"
                value={data.statistiques_generales?.composants?.bon || 0}
                icon="fas fa-puzzle-piece"
                color="info"
                subtext="En bon état"
                link="/composants"
              />
            </Col>
          </>
        )}
      </Row>

      {/* Graphiques et analyses (Admin uniquement) */}
      {isAdmin && data.graphiques && (
        <Row className="mb-4">
          <Col lg={8} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="fas fa-chart-bar text-primary me-2"></i>
                  Évolution des Demandes par Mois
                </h5>
              </Card.Header>
              <Card.Body>
                {data.graphiques.demandes_par_mois?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.graphiques.demandes_par_mois}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="periode" 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="total" fill="#007bff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-chart-bar fa-2x text-muted mb-2"></i>
                    <p className="text-muted">Aucune donnée disponible</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-transparent border-0">
                <h5 className="mb-0">
                  <i className="fas fa-chart-pie text-info me-2"></i>
                  Répartition des Composants
                </h5>
              </Card.Header>
              <Card.Body>
                {data.graphiques.composants_par_statut?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.graphiques.composants_par_statut}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="total"
                        label={({ statut, total, percent }) => `${statut}: ${total} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {data.graphiques.composants_par_statut.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-5">
                    <i className="fas fa-chart-pie fa-2x text-muted mb-2"></i>
                    <p className="text-muted">Aucune donnée disponible</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Section des activités récentes */}
      <Row>
        <Col lg={8} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-clock text-warning me-2"></i>
                {isAdmin ? 'Demandes Récentes' : 'Mes Demandes Récentes'}
              </h5>
              <Link to="/demandes" className="btn btn-outline-primary btn-sm">
                Voir toutes
              </Link>
            </Card.Header>
            <Card.Body>
              {(data.activites_recentes?.demandes_recentes?.length > 0 || data.mes_demandes_recentes?.length > 0) ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Titre</th>
                        {isAdmin && <th>Utilisateur</th>}
                        <th>Machine</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isAdmin ? data.activites_recentes?.demandes_recentes : data.mes_demandes_recentes)?.slice(0, 5).map((demande) => (
                        <tr key={demande.id}>
                          <td>
                            <Link to={`/demandes/${demande.id}`} className="text-decoration-none fw-bold">
                              {demande.numero_demande}
                            </Link>
                          </td>
                          <td>
                            <div>
                              {demande.titre}
                              <div className="small text-muted">{demande.type_demande}</div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="d-flex align-items-center">
                                <i className="fas fa-user-circle text-muted me-2"></i>
                                {demande.user?.name}
                              </div>
                            </td>
                          )}
                          <td>
                            <div className="d-flex align-items-center">
                              <i className="fas fa-cog text-muted me-2"></i>
                              {demande.machine?.nom}
                            </div>
                          </td>
                          <td>
                            <Badge bg={demande.priorite_color || (
                              demande.priorite === 'critique' ? 'danger' :
                              demande.priorite === 'haute' ? 'warning' :
                              demande.priorite === 'normale' ? 'info' : 'secondary'
                            )}>
                              {demande.priorite}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={demande.statut_color || (
                              demande.statut === 'acceptee' ? 'success' :
                              demande.statut === 'refusee' ? 'danger' :
                              demande.statut === 'en_cours' ? 'info' :
                              demande.statut === 'terminee' ? 'secondary' : 'warning'
                            )}>
                              {demande.statut.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(demande.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">Aucune demande récente</h6>
                  <p className="text-muted small">
                    {isAdmin ? 'Aucune demande n\'a été soumise récemment' : 'Vous n\'avez pas encore soumis de demandes'}
                  </p>
                  <Button as={Link} to="/demandes" variant="outline-primary">
                    <i className="fas fa-plus me-2"></i>
                    {isAdmin ? 'Voir toutes les demandes' : 'Créer une demande'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-bell text-primary me-2"></i>
                Notifications
              </h5>
              <Link to="/notifications" className="btn btn-outline-primary btn-sm">
                Voir toutes
              </Link>
            </Card.Header>
            <Card.Body>
              {data.activites_recentes?.notifications_non_lues?.length > 0 ? (
                <div>
                  {data.activites_recentes.notifications_non_lues.slice(0, 3).map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                  <div className="text-center mt-3">
                    <Button as={Link} to="/notifications" variant="outline-primary" size="sm">
                      <i className="fas fa-bell me-1"></i>
                      Voir toutes ({data.activites_recentes.notifications_non_lues.length})
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-bell-slash fa-2x text-muted mb-3"></i>
                  <h6 className="text-muted">Aucune notification</h6>
                  <p className="text-muted small">Toutes vos notifications sont à jour</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Actions rapides */}
      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent border-0">
              <h5 className="mb-0">
                <i className="fas fa-bolt text-warning me-2"></i>
                Actions Rapides
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} lg={3} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/demandes?action=create" 
                    variant="outline-primary" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 action-btn"
                    style={{ minHeight: '100px' }}
                  >
                    <i className="fas fa-plus fa-2x mb-2"></i>
                    <span className="fw-bold">Nouvelle Demande</span>
                    <small className="text-muted">Créer une demande de maintenance</small>
                  </Button>
                </Col>
                <Col md={6} lg={3} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/machines" 
                    variant="outline-info" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 action-btn"
                    style={{ minHeight: '100px' }}
                  >
                    <i className="fas fa-cogs fa-2x mb-2"></i>
                    <span className="fw-bold">Machines</span>
                    <small className="text-muted">Gérer les machines</small>
                  </Button>
                </Col>
                <Col md={6} lg={3} className="mb-3">
                  <Button 
                    as={Link} 
                    to="/composants" 
                    variant="outline-success" 
                    className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 action-btn"
                    style={{ minHeight: '100px' }}
                  >
                    <i className="fas fa-puzzle-piece fa-2x mb-2"></i>
                    <span className="fw-bold">Composants</span>
                    <small className="text-muted">Voir les composants</small>
                  </Button>
                </Col>
                <Col md={6} lg={3} className="mb-3">
                  <div className="position-relative">
                    <Button 
                      as={Link} 
                      to="/notifications" 
                      variant="outline-warning" 
                      className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 action-btn"
                      style={{ minHeight: '100px' }}
                    >
                      <i className="fas fa-bell fa-2x mb-2"></i>
                      <span className="fw-bold">Notifications</span>
                      <small className="text-muted">Messages et alertes</small>
                    </Button>
                    {(statistiquesRapides.mes_notifications_non_lues > 0 || statistiquesRapides.notifications_non_lues > 0) && (
                      <Badge 
                        bg="danger" 
                        className="position-absolute top-0 start-100 translate-middle"
                        style={{ zIndex: 1 }}
                      >
                        {statistiquesRapides.mes_notifications_non_lues || statistiquesRapides.notifications_non_lues}
                      </Badge>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;