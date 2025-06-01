// src/pages/Composants.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Alert, Spinner, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Composants = () => {
  const { user } = useAuth();
  const [composants, setComposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedComposant, setSelectedComposant] = useState(null);
  const [machines, setMachines] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    machine_id: '',
    type_id: '',
    statut: '',
    fournisseur: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 15
  });
  const [formData, setFormData] = useState({
    nom: '',
    reference: '',
    machine_id: '',
    type_id: '',
    description: '',
    statut: 'bon',
    quantite: 1,
    prix_unitaire: '',
    fournisseur: '',
    date_installation: '',
    derniere_inspection: '',
    prochaine_inspection: '',
    duree_vie_estimee: '',
    notes: ''
  });
  const [statutData, setStatutData] = useState({
    statut: '',
    notes: ''
  });
  const [inspectionData, setInspectionData] = useState({
    derniere_inspection: '',
    prochaine_inspection: '',
    statut: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComposants();
    loadMachines();
    loadTypes();
  }, [filters, pagination.currentPage]);

  const loadComposants = async () => {
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

      console.log('Chargement des composants avec params:', params);
      const response = await apiService.getComposants(params);
      console.log('Réponse API composants:', response.data);
      
      if (response.data && response.data.data) {
        setComposants(response.data.data.data || response.data.data);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        }));
      } else {
        setComposants([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des composants:', error);
      setError('Erreur lors du chargement des composants');
      setComposants([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await apiService.getMachinesActives();
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des machines:', error);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await apiService.getTypesActifs();
      setTypes(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
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
      machine_id: '',
      type_id: '',
      statut: '',
      fournisseur: ''
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
        quantite: parseInt(formData.quantite) || 1,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null,
        duree_vie_estimee: formData.duree_vie_estimee ? parseInt(formData.duree_vie_estimee) : null
      };

      await apiService.createComposant(dataToSubmit);
      toast.success('Composant créé avec succès');
      setShowModal(false);
      resetForm();
      loadComposants();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création du composant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatutChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.updateComposantStatut(selectedComposant.id, statutData);
      toast.success('Statut mis à jour avec succès');
      setShowStatutModal(false);
      setSelectedComposant(null);
      setStatutData({ statut: '', notes: '' });
      loadComposants();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectionUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.updateComposantInspection(selectedComposant.id, inspectionData);
      toast.success('Inspection mise à jour avec succès');
      setShowInspectionModal(false);
      setSelectedComposant(null);
      setInspectionData({
        derniere_inspection: '',
        prochaine_inspection: '',
        statut: '',
        notes: ''
      });
      loadComposants();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatutModal = (composant) => {
    setSelectedComposant(composant);
    setStatutData({
      statut: composant.statut,
      notes: composant.notes || ''
    });
    setShowStatutModal(true);
  };

  const openInspectionModal = (composant) => {
    setSelectedComposant(composant);
    setInspectionData({
      derniere_inspection: composant.derniere_inspection || '',
      prochaine_inspection: composant.prochaine_inspection || '',
      statut: composant.statut,
      notes: composant.notes || ''
    });
    setShowInspectionModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      reference: '',
      machine_id: '',
      type_id: '',
      description: '',
      statut: 'bon',
      quantite: 1,
      prix_unitaire: '',
      fournisseur: '',
      date_installation: '',
      derniere_inspection: '',
      prochaine_inspection: '',
      duree_vie_estimee: '',
      notes: ''
    });
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'bon': 'success',
      'usure': 'warning',
      'defaillant': 'danger',
      'remplace': 'secondary'
    };
    const labels = {
      'bon': 'Bon',
      'usure': 'Usure',
      'defaillant': 'Défaillant',
      'remplace': 'Remplacé'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{labels[statut] || statut}</Badge>;
  };

  const getInspectionBadge = (composant) => {
    if (!composant.prochaine_inspection) {
      return <Badge bg="secondary">Non programmé</Badge>;
    }

    const today = new Date();
    const prochaine = new Date(composant.prochaine_inspection);
    const diffDays = Math.ceil((prochaine - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge bg="danger">En retard</Badge>;
    } else if (diffDays <= 7) {
      return <Badge bg="warning">Urgent</Badge>;
    } else if (diffDays <= 30) {
      return <Badge bg="info">Bientôt</Badge>;
    } else {
      return <Badge bg="success">OK</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
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

  if (loading && composants.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="composants-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-puzzle-piece me-2"></i>
                Gestion des Composants
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} composant(s) trouvé(s)
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                variant="primary" 
                onClick={() => setShowModal(true)}
                className="d-flex align-items-center"
              >
                <i className="fas fa-plus me-2"></i>
                Nouveau Composant
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
                placeholder="Rechercher un composant..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.machine_id}
                onChange={(e) => handleFilterChange('machine_id', e.target.value)}
              >
                <option value="">Toutes les machines</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.type_id}
                onChange={(e) => handleFilterChange('type_id', e.target.value)}
              >
                <option value="">Tous les types</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="bon">Bon</option>
                <option value="usure">Usure</option>
                <option value="defaillant">Défaillant</option>
                <option value="remplace">Remplacé</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                type="text"
                placeholder="Fournisseur..."
                value={filters.fournisseur}
                onChange={(e) => handleFilterChange('fournisseur', e.target.value)}
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

      {/* Liste des composants */}
      <Card>
        <Card.Body className="p-0">
          {composants.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
              <h4>Aucun composant trouvé</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucun composant ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier composant'
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
                  Créer un composant
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Nom / Référence</th>
                      <th>Machine</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Quantité</th>
                      <th>Prix</th>
                      <th>Inspection</th>
                      <th>Fournisseur</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {composants.map((composant) => (
                      <tr key={composant.id}>
                        <td>
                          <div>
                            <div className="fw-bold">{composant.nom}</div>
                            <small className="text-muted">{composant.reference}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{composant.machine?.nom}</div>
                            {composant.machine?.localisation && (
                              <small className="text-muted">
                                {composant.machine.localisation}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          {composant.type && (
                            <Badge 
                              bg="secondary" 
                              style={{ backgroundColor: composant.type.couleur }}
                            >
                              {composant.type.nom}
                            </Badge>
                          )}
                        </td>
                        <td>
                          {getStatutBadge(composant.statut)}
                        </td>
                        <td>
                          <Badge bg="info">
                            {composant.quantite}
                          </Badge>
                        </td>
                        <td>
                          {formatPrice(composant.prix_unitaire)}
                        </td>
                        <td>
                          {getInspectionBadge(composant)}
                        </td>
                        <td>
                          {composant.fournisseur || '-'}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              as={Link}
                              to={`/composants/${composant.id}`}
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
                                  onClick={() => openStatutModal(composant)}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  title="Mise à jour inspection"
                                  onClick={() => openInspectionModal(composant)}
                                >
                                  <i className="fas fa-search"></i>
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
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur {pagination.total} composants
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
            Nouveau Composant
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
                    placeholder="Nom du composant"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Référence <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleFormChange}
                    placeholder="Référence unique"
                    maxLength={50}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Machine <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Sélectionnez une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.nom} - {machine.localisation}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="type_id"
                    value={formData.type_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Sélectionnez un type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.nom}
                      </option>
                    ))}
                  </Form.Select>
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
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Quantité <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="quantite"
                    value={formData.quantite}
                    onChange={handleFormChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Prix unitaire (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="prix_unitaire"
                    value={formData.prix_unitaire}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Control
                    type="text"
                    name="fournisseur"
                    value={formData.fournisseur}
                    onChange={handleFormChange}
                    placeholder="Nom du fournisseur"
                    maxLength={100}
                  />
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Durée de vie estimée (mois)</Form.Label>
                  <Form.Control
                    type="number"
                    name="duree_vie_estimee"
                    value={formData.duree_vie_estimee}
                    onChange={handleFormChange}
                    placeholder="Nombre de mois"
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
                    placeholder="Description du composant"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Notes additionnelles"
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
                  Créer le composant
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
            Modifier le statut - {selectedComposant?.nom}
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
                    required
                  >
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={statutData.notes}
                    onChange={(e) => setStatutData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes sur le changement de statut"
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

      {/* Modal d'inspection */}
      <Modal show={showInspectionModal} onHide={() => setShowInspectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-search me-2"></i>
            Inspection - {selectedComposant?.nom}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInspectionUpdate}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Dernière inspection <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={inspectionData.derniere_inspection}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, derniere_inspection: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Prochaine inspection</Form.Label>
                  <Form.Control
                    type="date"
                    value={inspectionData.prochaine_inspection}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, prochaine_inspection: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Statut après inspection</Form.Label>
                  <Form.Select
                    value={inspectionData.statut}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, statut: e.target.value }))}
                  >
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes d'inspection</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={inspectionData.notes}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observations et notes de l'inspection"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInspectionModal(false)}>
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

export default Composants;