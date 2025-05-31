// src/pages/Composants.js - Version corrigée
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Form, Badge, Modal, Row, Col, 
  InputGroup, Dropdown, Spinner, Alert, Pagination 
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Composants = () => {
  const { user } = useAuth();
  const [composants, setComposants] = useState([]);
  const [machines, setMachines] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    machine_id: '',
    type_id: '',
    statut: '',
    fournisseur: ''
  });
  const [sortBy, setSortBy] = useState('nom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedComposant, setSelectedComposant] = useState(null);
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
    notes: '',
    caracteristiques: {}
  });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [currentPage, filters, sortBy, sortOrder, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters
      };

      const [composantsResponse, machinesResponse, typesResponse] = await Promise.all([
        apiService.getComposants(params),
        apiService.getMachinesActives(),
        apiService.getTypesActifs()
      ]);

      setComposants(composantsResponse.data.data.data);
      setTotalPages(composantsResponse.data.data.last_page);
      setMachines(machinesResponse.data.data);
      setTypes(typesResponse.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
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
      machine_id: '',
      type_id: '',
      statut: '',
      fournisseur: ''
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
      
      // Préparer les données du formulaire
      const submitData = {
        ...formData,
        quantite: parseInt(formData.quantite) || 1,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null,
        duree_vie_estimee: formData.duree_vie_estimee ? parseInt(formData.duree_vie_estimee) : null
      };

      await apiService.createComposant(submitData);
      toast.success('Composant créé avec succès');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast.error('Erreur lors de la création du composant');
      }
    }
  };

  const handleUpdateStatut = async (id, newStatut, notes = '') => {
    try {
      await apiService.updateComposantStatut(id, { statut: newStatut, notes });
      toast.success('Statut mis à jour avec succès');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteComposant(selectedComposant.id);
      toast.success('Composant supprimé avec succès');
      setShowDeleteModal(false);
      setSelectedComposant(null);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
      notes: '',
      caracteristiques: {}
    });
    setFormErrors({});
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'bon': 'success',
      'usure': 'warning',
      'defaillant': 'danger',
      'remplace': 'secondary'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{statut}</Badge>;
  };

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-puzzle-piece text-primary me-2"></i>
            Gestion des Composants
          </h1>
          <p className="text-muted mb-0">
            {composants.length} composant(s) trouvé(s)
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus me-2"></i>
            Nouveau Composant
          </Button>
        )}
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={3} className="mb-3">
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher un composant..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </InputGroup>
            </Col>
            <Col md={2} className="mb-3">
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
            <Col md={2} className="mb-3">
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
            <Col md={2} className="mb-3">
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
            <Col md={2} className="mb-3">
              <Form.Control
                type="text"
                placeholder="Fournisseur"
                value={filters.fournisseur}
                onChange={(e) => handleFilterChange('fournisseur', e.target.value)}
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

      {/* Table des composants */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : composants.length > 0 ? (
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
                    <th>Référence</th>
                    <th>Machine</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Quantité</th>
                    <th>Prix</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {composants.map((composant) => (
                    <tr key={composant.id}>
                      <td>
                        <div>
                          <Link 
                            to={`/composants/${composant.id}`}
                            className="fw-bold text-decoration-none"
                          >
                            {composant.nom}
                          </Link>
                          {composant.description && (
                            <div className="small text-muted">
                              {composant.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <code>{composant.reference}</code>
                      </td>
                      <td>
                        <Link to={`/machines/${composant.machine?.id}`} className="text-decoration-none">
                          <i className="fas fa-cog text-muted me-1"></i>
                          {composant.machine?.nom}
                        </Link>
                      </td>
                      <td>
                        <span 
                          className="badge" 
                          style={{ 
                            backgroundColor: composant.type?.couleur || '#6c757d',
                            color: 'white'
                          }}
                        >
                          {composant.type?.nom}
                        </span>
                      </td>
                      <td>{getStatutBadge(composant.statut)}</td>
                      <td>
                        <Badge bg="info">{composant.quantite}</Badge>
                      </td>
                      <td>
                        {composant.prix_unitaire ? (
                          <span className="text-success fw-bold">
                            {new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            }).format(composant.prix_unitaire)}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="outline-secondary" 
                            size="sm"
                            id={`dropdown-${composant.id}`}
                          >
                            <i className="fas fa-ellipsis-v"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item as={Link} to={`/composants/${composant.id}`}>
                              <i className="fas fa-eye me-2"></i>
                              Voir détails
                            </Dropdown.Item>
                            
                            {isAdmin && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Header>Changer le statut</Dropdown.Header>
                                {composant.statut !== 'bon' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(composant.id, 'bon')}
                                  >
                                    <i className="fas fa-check text-success me-2"></i>
                                    Marquer comme bon
                                  </Dropdown.Item>
                                )}
                                {composant.statut !== 'usure' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(composant.id, 'usure')}
                                  >
                                    <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                                    Marquer en usure
                                  </Dropdown.Item>
                                )}
                                {composant.statut !== 'defaillant' && (
                                  <Dropdown.Item 
                                    onClick={() => handleUpdateStatut(composant.id, 'defaillant')}
                                  >
                                    <i className="fas fa-times text-danger me-2"></i>
                                    Marquer défaillant
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => {
                                    setSelectedComposant(composant);
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
              <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Aucun composant trouvé</h5>
              <p className="text-muted">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par ajouter votre premier composant'}
              </p>
              {isAdmin && !searchTerm && !Object.values(filters).some(f => f) && (
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Ajouter un composant
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
            Nouveau Composant
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
                  <Form.Label>Référence *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    isInvalid={!!formErrors.reference}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.reference?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                    isInvalid={!!formErrors.machine_id}
                  >
                    <option value="">Sélectionner une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.nom} - {machine.numero_serie}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.machine_id?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type_id}
                    onChange={(e) => setFormData({...formData, type_id: e.target.value})}
                    isInvalid={!!formErrors.type_id}
                  >
                    <option value="">Sélectionner un type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.nom}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.type_id?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={formData.statut}
                    onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  >
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Quantité *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                    isInvalid={!!formErrors.quantite}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.quantite?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Prix unitaire (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData({...formData, prix_unitaire: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                  />
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

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Dernière inspection</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.derniere_inspection}
                    onChange={(e) => setFormData({...formData, derniere_inspection: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prochaine inspection</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.prochaine_inspection}
                    onChange={(e) => setFormData({...formData, prochaine_inspection: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Durée de vie estimée (mois)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.duree_vie_estimee}
                    onChange={(e) => setFormData({...formData, duree_vie_estimee: e.target.value})}
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

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              Créer le composant
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
            Êtes-vous sûr de vouloir supprimer le composant <strong>{selectedComposant?.nom}</strong> ?
            <hr />
            <p className="mb-0">
              Cette action est irréversible et supprimera également toutes les demandes associées.
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
    </div>
  );
};

export default Composants;