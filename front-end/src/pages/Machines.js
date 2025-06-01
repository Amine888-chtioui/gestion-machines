// src/pages/Machines.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Alert, Spinner, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Machines = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    localisation: '',
    modele: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 15
  });
  const [formData, setFormData] = useState({
    nom: '',
    numero_serie: '',
    modele: 'TELSOSPLICE TS3',
    description: '',
    localisation: '',
    statut: 'actif',
    date_installation: '',
    derniere_maintenance: '',
    specifications_techniques: {}
  });
  const [statutData, setStatutData] = useState({
    statut: '',
    derniere_maintenance: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMachines();
  }, [filters, pagination.currentPage]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      console.log('Chargement des machines avec params:', params);
      const response = await apiService.getMachines(params);
      console.log('Réponse API machines:', response.data);
      
      if (response.data && response.data.data) {
        setMachines(response.data.data.data || response.data.data);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        }));
      } else {
        setMachines([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des machines:', error);
      setError('Erreur lors du chargement des machines');
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      statut: '',
      localisation: '',
      modele: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        specifications_techniques: formData.specifications_techniques || {}
      };

      await apiService.createMachine(dataToSubmit);
      toast.success('Machine créée avec succès');
      setShowModal(false);
      resetForm();
      loadMachines();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de la machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatutChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (statutData.statut) {
        await apiService.updateMachineStatut(selectedMachine.id, statutData.statut);
      }
      
      if (statutData.derniere_maintenance) {
        await apiService.updateMachineMaintenance(selectedMachine.id, {
          derniere_maintenance: statutData.derniere_maintenance
        });
      }

      toast.success('Machine mise à jour avec succès');
      setShowStatutModal(false);
      setSelectedMachine(null);
      setStatutData({ statut: '', derniere_maintenance: '' });
      loadMachines();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la machine');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatutModal = (machine) => {
    setSelectedMachine(machine);
    setStatutData({
      statut: machine.statut,
      derniere_maintenance: machine.derniere_maintenance || ''
    });
    setShowStatutModal(true);
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
      derniere_maintenance: '',
      specifications_techniques: {}
    });
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'actif': 'success',
      'inactif': 'secondary',
      'maintenance': 'warning'
    };
    const labels = {
      'actif': 'Actif',
      'inactif': 'Inactif',
      'maintenance': 'Maintenance'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{labels[statut] || statut}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const items = [];
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    // Première page
    if (currentPage > 1) {
      items.push(
        <Pagination.Item key="first" onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
    }

    // Pages autour de la page actuelle
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Dernière page
    if (currentPage < totalPages) {
      items.push(
        <Pagination.Item key="last" onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.Prev 
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        />
        {items}
        <Pagination.Next 
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        />
      </Pagination>
    );
  };

  if (loading && machines.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="machines-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-cogs me-2"></i>
                Gestion des Machines
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} machine(s) trouvée(s)
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                variant="primary" 
                onClick={() => setShowModal(true)}
                className="d-flex align-items-center"
              >
                <i className="fas fa-plus me-2"></i>
                Nouvelle Machine
              </Button>
            )}
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
              <Form.Control
                type="text"
                placeholder="Rechercher une machine..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col md={2}>
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
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Localisation..."
                value={filters.localisation}
                onChange={(e) => handleFilterChange('localisation', e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Modèle..."
                value={filters.modele}
                onChange={(e) => handleFilterChange('modele', e.target.value)}
              />
            </Col>
            <Col md={1}>
              <Button variant="outline-secondary" onClick={clearFilters} title="Effacer les filtres">
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des machines */}
      <Card>
        <Card.Body className="p-0">
          {machines.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-cogs fa-3x text-muted mb-3"></i>
              <h4>Aucune machine trouvée</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucune machine ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre première machine'
                }
              </p>
              {Object.values(filters).some(filter => filter !== '') ? (
                <Button variant="outline-primary" onClick={clearFilters}>
                  <i className="fas fa-times me-2"></i>
                  Effacer les filtres
                </Button>
              ) : user?.role === 'admin' && (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <i className="fas fa-plus me-2"></i>
                  Créer une machine
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Numéro de série</th>
                      <th>Modèle</th>
                      <th>Localisation</th>
                      <th>Statut</th>
                      <th>Dernière maintenance</th>
                      <th>Composants</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => (
                      <tr key={machine.id}>
                        <td>
                          <div className="fw-bold">{machine.nom}</div>
                          {machine.description && (
                            <small className="text-muted">
                              {machine.description.length > 50 
                                ? `${machine.description.substring(0, 50)}...`
                                : machine.description
                              }
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="fw-bold text-primary">
                            {machine.numero_serie}
                          </span>
                        </td>
                        <td>{machine.modele}</td>
                        <td>{machine.localisation || '-'}</td>
                        <td>
                          {getStatutBadge(machine.statut)}
                        </td>
                        <td>
                          {formatDate(machine.derniere_maintenance)}
                        </td>
                        <td>
                          <Badge bg="info">
                            {machine.composants_count || 0}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/machines/${machine.id}`}
                              variant="outline-primary"
                              size="sm"
                              title="Voir les détails"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            
                            {user?.role === 'admin' && (
                              <>
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  title="Modifier le statut"
                                  onClick={() => openStatutModal(machine)}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="text-muted">
                    Affichage de {((pagination.currentPage - 1) * pagination.perPage) + 1} à{' '}
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur {pagination.total} machines
                  </div>
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus me-2"></i>
            Nouvelle Machine
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    placeholder="Nom de la machine"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Numéro de série <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleFormChange}
                    placeholder="Numéro de série"
                    maxLength={50}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Modèle</Form.Label>
                  <Form.Control
                    type="text"
                    name="modele"
                    value={formData.modele}
                    onChange={handleFormChange}
                    placeholder="Modèle de la machine"
                    maxLength={50}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Localisation</Form.Label>
                  <Form.Control
                    type="text"
                    name="localisation"
                    value={formData.localisation}
                    onChange={handleFormChange}
                    placeholder="Localisation de la machine"
                    maxLength={100}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    name="statut"
                    value={formData.statut}
                    onChange={handleFormChange}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date d'installation</Form.Label>
                  <Form.Control
                    type="date"
                    name="date_installation"
                    value={formData.date_installation}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Description de la machine"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Création...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Créer la machine
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de modification du statut */}
      <Modal show={showStatutModal} onHide={() => setShowStatutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Modifier {selectedMachine?.nom}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStatutChange}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={statutData.statut}
                    onChange={(e) => setStatutData(prev => ({ ...prev, statut: e.target.value }))}
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Dernière maintenance</Form.Label>
                  <Form.Control
                    type="date"
                    value={statutData.derniere_maintenance}
                    onChange={(e) => setStatutData(prev => ({ ...prev, derniere_maintenance: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStatutModal(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Mettre à jour
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Machines;