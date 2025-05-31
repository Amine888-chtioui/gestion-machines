// src/layouts/DashboardLayout.js
import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Row, Col, Dropdown, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [alertes, setAlertes] = useState({});

  useEffect(() => {
    loadNotificationsCount();
    loadAlertes();
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(() => {
      loadNotificationsCount();
      loadAlertes();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadNotificationsCount = async () => {
    try {
      const response = await apiService.getNotificationsNonLues();
      setNotificationsCount(response.data.count || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const loadAlertes = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await apiService.getAlertes();
        setAlertes(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      icon: 'fas fa-tachometer-alt',
      label: 'Dashboard',
      path: '/dashboard',
      roles: ['user', 'admin']
    },
    {
      icon: 'fas fa-cogs',
      label: 'Machines',
      path: '/machines',
      roles: ['user', 'admin'],
      badge: alertes.machines_en_maintenance > 0 ? alertes.machines_en_maintenance : null,
      badgeColor: 'warning'
    },
    {
      icon: 'fas fa-puzzle-piece',
      label: 'Composants',
      path: '/composants',
      roles: ['user', 'admin'],
      badge: alertes.composants_defaillants > 0 ? alertes.composants_defaillants : null,
      badgeColor: 'danger'
    },
    {
      icon: 'fas fa-file-alt',
      label: 'Demandes',
      path: '/demandes',
      roles: ['user', 'admin'],
      badge: alertes.demandes_urgentes > 0 ? alertes.demandes_urgentes : null,
      badgeColor: 'warning'
    },
    {
      icon: 'fas fa-tags',
      label: 'Types',
      path: '/types',
      roles: ['admin']
    },
    {
      icon: 'fas fa-bell',
      label: 'Notifications',
      path: '/notifications',
      roles: ['user', 'admin'],
      badge: notificationsCount > 0 ? notificationsCount : null,
      badgeColor: 'primary'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="dashboard-layout">
      {/* Top Navigation */}
      <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
            <i className="fas fa-industry me-2"></i>
            TELSOSPLICE TS3
          </Navbar.Brand>

          <button
            className="btn btn-outline-light btn-sm d-lg-none"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className="fas fa-bars"></i>
          </button>

          <Nav className="ms-auto">
            {/* Alertes rapides pour admin */}
            {user?.role === 'admin' && (
              <>
                {alertes.demandes_en_attente > 0 && (
                  <Nav.Link 
                    as={Link} 
                    to="/demandes?statut=en_attente"
                    className="position-relative me-2"
                    title="Demandes en attente"
                  >
                    <i className="fas fa-clock text-warning"></i>
                    <Badge bg="warning" className="position-absolute top-0 start-100 translate-middle badge-sm">
                      {alertes.demandes_en_attente}
                    </Badge>
                  </Nav.Link>
                )}
                
                {alertes.composants_defaillants > 0 && (
                  <Nav.Link 
                    as={Link} 
                    to="/composants?statut=defaillant"
                    className="position-relative me-2"
                    title="Composants défaillants"
                  >
                    <i className="fas fa-exclamation-triangle text-danger"></i>
                    <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle badge-sm">
                      {alertes.composants_defaillants}
                    </Badge>
                  </Nav.Link>
                )}
              </>
            )}

            {/* Notifications */}
            <Nav.Link as={Link} to="/notifications" className="position-relative me-3">
              <i className="fas fa-bell"></i>
              {notificationsCount > 0 && (
                <Badge bg="primary" className="position-absolute top-0 start-100 translate-middle badge-sm">
                  {notificationsCount}
                </Badge>
              )}
            </Nav.Link>

            {/* Menu utilisateur */}
            <Dropdown>
              <Dropdown.Toggle 
                variant="outline-light" 
                id="user-dropdown"
                className="d-flex align-items-center"
              >
                <i className="fas fa-user me-2"></i>
                {user?.name}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item as={Link} to="/profile">
                  <i className="fas fa-user-edit me-2"></i>
                  Mon Profil
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Déconnexion
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </Navbar>

      <div className="dashboard-content" style={{ paddingTop: '76px' }}>
        <Row className="g-0" style={{ minHeight: 'calc(100vh - 76px)' }}>
          {/* Sidebar */}
          <Col lg={3} xl={2} className={`sidebar bg-light border-end ${sidebarCollapsed ? 'd-none d-lg-block' : ''}`}>
            <div className="sidebar-content p-3">
              <Nav className="flex-column">
                {filteredMenuItems.map((item, index) => (
                  <Nav.Link
                    key={index}
                    as={Link}
                    to={item.path}
                    className={`sidebar-link d-flex justify-content-between align-items-center mb-2 ${
                      location.pathname === item.path ? 'active' : ''
                    }`}
                  >
                    <div className="d-flex align-items-center">
                      <i className={`${item.icon} me-2`}></i>
                      {item.label}
                    </div>
                    {item.badge && (
                      <Badge bg={item.badgeColor} className="badge-sm">
                        {item.badge}
                      </Badge>
                    )}
                  </Nav.Link>
                ))}
              </Nav>

              {/* Section informations système pour admin */}
              {user?.role === 'admin' && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    État du système
                  </h6>
                  <div className="small">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Machines actives:</span>
                      <span className="text-success fw-bold">
                        {alertes.machines_total - (alertes.machines_en_maintenance || 0)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>En maintenance:</span>
                      <span className="text-warning fw-bold">
                        {alertes.machines_en_maintenance || 0}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Composants OK:</span>
                      <span className="text-success fw-bold">
                        {(alertes.composants_total || 0) - (alertes.composants_defaillants || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Main Content */}
          <Col lg={9} xl={10} className="main-content">
            <Container fluid className="p-4">
              {children}
            </Container>
          </Col>
        </Row>
      </div>

      <style jsx>{`
        .sidebar-link {
          padding: 10px 15px;
          border-radius: 8px;
          color: #495057;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .sidebar-link:hover {
          background-color: #f8f9fa;
          color: #007bff;
          text-decoration: none;
        }

        .sidebar-link.active {
          background-color: #007bff;
          color: white;
        }

        .sidebar-link.active:hover {
          background-color: #0056b3;
          color: white;
        }

        .badge-sm {
          font-size: 0.7rem;
          padding: 0.25em 0.5em;
        }

        @media (max-width: 991.98px) {
          .sidebar {
            position: fixed;
            top: 76px;
            left: 0;
            height: calc(100vh - 76px);
            z-index: 1000;
            overflow-y: auto;
          }
          
          .main-content {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;