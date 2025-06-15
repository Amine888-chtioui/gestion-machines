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
        setAlertes(response.data || {});
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
      <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow-sm" style={{ zIndex: 1030 }}>
        <Container fluid>
          <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center">
            <i className="fas fa-industry me-2"></i>
            <span className="d-none d-sm-inline">Système de gestion</span>
          </Navbar.Brand>

          <button
            className="btn btn-outline-light btn-sm d-lg-none"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <i className="fas fa-bars"></i>
          </button>

          <Nav className="ms-auto d-flex align-items-center">
            {/* Alertes rapides pour admin */}
            {user?.role === 'admin' && (
              <>
                {(alertes.demandes_en_attente || 0) > 0 && (
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
                
                {(alertes.composants_defaillants || 0) > 0 && (
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
            <Dropdown align="end">
              <Dropdown.Toggle 
                variant="outline-light" 
                id="user-dropdown"
                className="d-flex align-items-center border-0 rounded"
                style={{ minWidth: '120px' }}
              >
                <i className="fas fa-user me-2"></i>
                <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '100px' }}>
                  {user?.name}
                </span>
                <i className="fas fa-chevron-down ms-2 small"></i>
              </Dropdown.Toggle>

              <Dropdown.Menu 
                className="shadow-lg border-0"
                style={{ 
                  minWidth: '200px',
                  zIndex: 1050,
                  marginTop: '0.5rem'
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <small className="text-muted d-block">Connecté en tant que</small>
                  <strong className="text-dark">{user?.name}</strong>
                  <br />
                  <small className="text-muted">{user?.email}</small>
                </div>
                
                <Dropdown.Item 
                  as={Link} 
                  to="/profile" 
                  className="d-flex align-items-center py-2"
                >
                  <i className="fas fa-user-edit me-2 text-primary"></i>
                  Mon Profil
                </Dropdown.Item>
                
                {user?.role === 'admin' && (
                  <Dropdown.Item 
                    as={Link} 
                    to="/admin/settings" 
                    className="d-flex align-items-center py-2"
                  >
                    <i className="fas fa-cog me-2 text-secondary"></i>
                    Paramètres
                  </Dropdown.Item>
                )}
                
                <Dropdown.Divider />
                
                <Dropdown.Item 
                  onClick={handleLogout} 
                  className="d-flex align-items-center py-2 text-danger"
                >
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
                      location.pathname === item.path ? 'active bg-primary text-white' : 'text-dark'
                    }`}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <i className={`${item.icon} me-3`} style={{ width: '16px' }}></i>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <Badge bg={item.badgeColor} className="ms-2">
                        {item.badge}
                      </Badge>
                    )}
                  </Nav.Link>
                ))}
              </Nav>
            </div>
          </Col>

          {/* Main Content */}
          <Col lg={9} xl={10} className="main-content">
            <div className="p-4">
              {children}
            </div>
          </Col>
        </Row>
      </div>

      {/* Styles CSS inline pour corriger les problèmes */}
      <style jsx>{`
        .dropdown-menu {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          border-radius: 0.5rem !important;
        }
        
        .dropdown-item:hover {
          background-color: #f8f9fa !important;
        }
        
        .dropdown-toggle::after {
          display: none !important;
        }
        
        .sidebar-link:hover {
          background-color: #e9ecef !important;
          color: #495057 !important;
        }
        
        .sidebar-link.active:hover {
          background-color: #0056b3 !important;
          color: white !important;
        }
        
        .badge-sm {
          font-size: 0.75em;
          padding: 0.25em 0.4em;
        }
        
        @media (max-width: 991.98px) {
          .sidebar {
            position: fixed;
            top: 76px;
            left: 0;
            height: calc(100vh - 76px);
            z-index: 1040;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
          }
          
          .sidebar:not(.d-none) {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;