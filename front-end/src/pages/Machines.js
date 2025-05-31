// src/pages/Machines.js
import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Table, Button, Form, InputGroup, 
  Badge, Dropdown, Modal, Spinner, Alert, Pagination 
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Machines = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    statut: '',
    localisation: '',
    modele: ''
  });
  const [sortBy, setSortBy] = useState('nom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    numero_serie: '',
    modele: 'TELSOSPLICE TS3',
    description: '',
    localisation: '',
    statut: 'actif',
    date_installation: '',
    specifications_techniques: {}
  });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadMachines();
  }, [currentPage, filters, sortBy, sortOrder, searchTerm]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters
      };

      const response = await apiService.getMachines(params);
      setMachines(response.data.data.data);
      setTotalPages(response.data.data.last_page);
    } catch (error) {
      console.error('Erreur lors du chargement des machines:', error);
      toast.error('Erreur lors du chargement des machines');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      statut: '',
      localisation: '',
      modele: ''
    });
    setSearchTerm('');
    setSortBy('nom');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormErrors({});
      await apiService.createMachine(formData);
      toast.success('Machine créée avec succès');
      setShowCreateModal(false);
      resetForm();
      loadMachines();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
  };

  const handleUpdateStatut = async (id, newStatut) => {
    try {
      await apiService.updateMachineStatut(id, newStatut);
      toast.success('Statut mis à jour avec succès');
      loadMachines();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteMachine(selectedMachine.id);
      toast.success('Machine supprimée avec succès');
      setShowDeleteModal(false);
      setSelectedMachine(null);
      loadMachines();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      numero_serie: '',
      modele: 'TELSOSPLICE TS3',
      description: '',
      localisation: '',
      statut: 'actif',
      date_installation: '',
      specifications_techniques: {}
    });
    setFormErrors({});
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'actif': 'success',
      'inactif': 'secondary',
      'maintenance': 'warning'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{statut}</Badge>;
  };

  const getMaintenanceStatus = (machine) => {
    if (!machine.derniere_maintenance) {
      return <Badge bg="secondary">Non définie</Badge>;
    }
    
    const daysSince = machine.temps_depuis_maintenance;
    if (daysSince > 180) {
      return <Badge bg="danger">Critique ({daysSince}j)</Badge>;
    } else if (daysSince > 120) {
      return <Badge bg="warning">Attention ({daysSince}j)</Badge>;
    }
    return <Badge bg="success">OK ({daysSince}j)</Badge>;
  };

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-cogs text-primary me-2"></i>
            Gestion des Machines
          </h1>
          <p className="text-muted mb-0">
            {machines.length} machine(s) trouvée(s)
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus me-2"></i>
            Nouvelle Machine
          </Button>
        )}
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={4} className="mb-3">
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher une machine..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </InputGroup>
            </Col>
            <Col md={2} className="mb-3">
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="maintenance">Maintenance</option>
              </Form.Select>
            </Col>
            <Col md={3} className="mb-3">
              <Form.Control
                type="text"
                placeholder="Localisation"
                value={filters.localisation}
                onChange={(e) => handleFilterChange('localisation', e.target.value)}
              />
            </Col>
            <Col md={2} className="mb-3">
              <Form.Control
                type="text"
                placeholder="Modèle"
                value={filters.modele}
                onChange={(e) => handleFilterChange('modele', e.target.value)}
              />
            </Col>
            <Col md={1} className="mb-3">
              <Button
                variant="outline-secondary"
                onClick={resetFilters}
                title="Réinitialiser les filtres"
              >
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table des machines */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : machines.length > 0 ? (
            <>
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('nom')}
                    >
                      Nom
                      {sortBy === 'nom' && (
                        <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Numéro de série</th>
                    <th>Modèle</th>
                    <th>Localisation</th>
                    <th>Statut</th>
                    <th>Maintenance</th>
                    <th>Composants</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => (
                    <tr key={machine.id}>
                      <td>
                        <div>
                          <Link 
                            to={`/machines/${machine.id}`}
                            className="fw-bold text-decoration-none"
                          >
                            {machine.nom}
                          </Link>
                          {machine.description && (
                            <div className="small text-muted">
                              {machine.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <code>{machine.numero_serie}</code>
                      </td>
                      <td>{machine.modele}</td>
                      <td>
                        <i className="fas fa-map-marker-alt text-muted me-1"></i>
                        {machine.localisation || 'Non définie'}
                      </td>
                      <td>{getStatutBadge(machine.statut)}</td>
                      <td>{getMaintenanceStatus(machine)}</td>
                      <td>
                        <Badge bg="info">
                          {machine.nombre_composants || 0}
                        </Badge>
                        {machine.composants_defaillants > 0 && (
                          <Badge bg="danger" className="ms-1">
                            {machine.composants_defaillants} défaillants
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="outline-secondary" 
                            size="sm"
                            id={`dropdown-${machine.id}`}
                          >
                            <i className="fas fa-ellipsis-v"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item as={Link} to={`/machines/${machine.id}`}>
                              <i className="fas fa-eye me-2"></i>
                              Voir détails
                            </Dropdown.Item>
                            
                            {isAdmin && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Header>Changer le statut</Dropdown.Header>
                                {machine.statut !== 'actif' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(machine.id, 'actif')}
                                  >
                                    <i className="fas fa-play text-success me-2"></i>
                                    Activer
                                  </Dropdown.Item>
                                )}
                                {machine.statut !== 'maintenance' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(machine.id, 'maintenance')}
                                  >
                                    <i className="fas fa-wrench text-warning me-2"></i>
                                    Maintenance
                                  </Dropdown.Item>
                                )}
                                {machine.statut !== 'inactif' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(machine.id, 'inactif')}
                                  >
                                    <i className="fas fa-pause text-secondary me-2"></i>
                                    Désactiver
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => {
                                    setSelectedMachine(machine);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  <i className="fas fa-trash me-2"></i>
                                  Supprimer
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center p-3">
                  <Pagination>
                    <Pagination.First 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    />
                    <Pagination.Prev 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    />
                    
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      const page = currentPage <= 3 ? index + 1 : currentPage - 2 + index;
                      if (page <= totalPages) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    />
                    <Pagination.Last 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-cogs fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Aucune machine trouvée</h5>
              <p className="text-muted">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par ajouter votre première machine'}
              </p>
              {isAdmin && !searchTerm && !Object.values(filters).some(f => f) && (
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Ajouter une machine
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus text-primary me-2"></i>
            Nouvelle Machine
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    isInvalid={!!formErrors.nom}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.nom?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Numéro de série *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                    isInvalid={!!formErrors.numero_serie}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.numero_serie?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Modèle</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData({...formData, modele: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Localisation</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.localisation}
                    onChange={(e) => setFormData({...formData, localisation: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={formData.statut}
                    onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date d'installation</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date_installation}
                    onChange={(e) => setFormData({...formData, date_installation: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              Créer la machine
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Confirmer la suppression
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <Alert.Heading className="h6">Attention !</Alert.Heading>
            Êtes-vous sûr de vouloir supprimer la machine <strong>{selectedMachine?.nom}</strong> ?
            <hr />
            <p className="mb-0">
              Cette action est irréversible et supprimera également tous les composants et demandes associés.
            </p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <i className="fas fa-trash me-2"></i>
            Supprimer définitivement
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .table th {
          border-top: none;
          font-weight: 600;
          color: #495057;
          background-color: #f8f9fa;
        }

        .table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .dropdown-toggle::after {
          display: none;
        }

        .cursor-pointer {
          cursor: pointer;
        }

        code {
          background-color: #f8f9fa;
          color: #e83e8c;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.875em;
        }

        .card {
          border-radius: 12px;
        }

        .btn {
          border-radius: 8px;
        }

        .form-control, .form-select {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default Machines;