import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Tab, Tabs, Image, Form, Table, Modal, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const MachineDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filteredComposants, setFilteredComposants] = useState([]);
  const [composantFilters, setComposantFilters] = useState({
    search: '', type: '', statut: '', reference: ''
  });
  const [typesDisponibles, setTypesDisponibles] = useState([]);
  
  // États pour le modal de modification
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nom: '', numero_serie: '', modele: '', description: '', 
    localisation: '', statut: 'actif', date_installation: '', 
    derniere_maintenance: '', image: null
  });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});

  useEffect(() => {
    loadMachine();
  }, [id]);

  useEffect(() => {
    if (machine?.composants) {
      applyFilters();
      extractTypes();
    }
  }, [machine, composantFilters]);

  const loadMachine = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMachine(id);
      setMachine(response.data.data);
      console.log('Machine rechargée:', response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement de la machine');
    } finally {
      setLoading(false);
    }
  };

  const extractTypes = () => {
    if (!machine?.composants) return;
    const types = machine.composants
      .filter(c => c.type)
      .map(c => c.type)
      .filter((type, index, self) => index === self.findIndex(t => t.id === type.id))
      .sort((a, b) => a.nom.localeCompare(b.nom));
    setTypesDisponibles(types);
  };

  const applyFilters = () => {
    if (!machine?.composants) return;
    let filtered = [...machine.composants];

    if (composantFilters.search) {
      const term = composantFilters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.nom.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
      );
    }

    if (composantFilters.reference) {
      const term = composantFilters.reference.toLowerCase();
      filtered = filtered.filter(c => c.reference.toLowerCase().includes(term));
    }

    if (composantFilters.type) {
      filtered = filtered.filter(c => c.type?.id.toString() === composantFilters.type);
    }

    if (composantFilters.statut) {
      filtered = filtered.filter(c => c.statut === composantFilters.statut);
    }

    setFilteredComposants(filtered);
  };

  const handleFilterChange = (name, value) => {
    setComposantFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setComposantFilters({ search: '', type: '', statut: '', reference: '' });
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;
    
    try {
      await apiService.deleteMachineImage(machine.id);
      toast.success('Image supprimée avec succès');
      // Recharger les données de la machine après suppression
      await loadMachine();
    } catch (error) {
      console.error('Erreur suppression image:', error);
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  const handleEdit = () => {
    // Remplir le formulaire avec les données actuelles
    setEditFormData({
      nom: machine.nom || '',
      numero_serie: machine.numero_serie || '',
      modele: machine.modele || '',
      description: machine.description || '',
      localisation: machine.localisation || '',
      statut: machine.statut || 'actif',
      date_installation: machine.date_installation || '',
      derniere_maintenance: machine.derniere_maintenance || '',
      image: null
    });
    setEditImagePreview(machine.image_url || null);
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Validation basique
    const errors = {};
    if (!editFormData.nom.trim()) errors.nom = 'Le nom est requis';
    if (!editFormData.numero_serie.trim()) errors.numero_serie = 'Le numéro de série est requis';
    
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await apiService.updateMachine(id, editFormData);
      toast.success('Machine modifiée avec succès');
      setShowEditModal(false);
      // Recharger les données de la machine
      await loadMachine();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        Object.values(serverErrors).flat().forEach(err => toast.error(err));
      } else {
        toast.error('Erreur lors de la modification');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = apiService.validateImage(file);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    try {
      const preview = await apiService.createImagePreview(file);
      setEditImagePreview(preview);
      setEditFormData(prev => ({ ...prev, image: file }));
      
      // Effacer l'erreur d'image si elle existe
      if (editFormErrors.image) {
        setEditFormErrors(prev => ({ ...prev, image: '' }));
      }
    } catch (error) {
      toast.error('Erreur lors du traitement de l\'image');
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur si l'utilisateur corrige
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const hasActiveFilters = () => Object.values(composantFilters).some(v => v !== '');

  const StatutBadge = ({ statut }) => (
    <Badge bg={statut === 'actif' ? 'success' : statut === 'maintenance' ? 'warning' : 'secondary'}>
      {statut}
    </Badge>
  );

  const ComposantStatutBadge = ({ statut }) => (
    <Badge bg={statut === 'bon' ? 'success' : statut === 'usure' ? 'warning' : statut === 'defaillant' ? 'danger' : 'secondary'}>
      {statut}
    </Badge>
  );

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement des détails de la machine...</p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-5">
        <h4>Machine non trouvée</h4>
        <Button as={Link} to="/machines" variant="primary">
          Retour aux machines
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>
            <i className="fas fa-cog me-2 text-primary"></i>
            {machine.nom}
          </h1>
          <p className="text-muted mb-0">Numéro de série: {machine.numero_serie}</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" as={Link} to="/machines">
            <i className="fas fa-arrow-left me-2"></i>Retour
          </Button>
          {user?.role === 'admin' && (
            <Button variant="outline-primary" onClick={handleEdit}>
              <i className="fas fa-edit me-2"></i>Modifier
            </Button>
          )}
        </div>
      </div>

      <Row className="mb-4">
        {/* Image */}
        <Col lg={4} className="mb-3">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Image</h5>
              {user?.role === 'admin' && machine.has_image && (
                <Button variant="outline-danger" size="sm" onClick={handleDeleteImage}>
                  <i className="fas fa-trash" title="Supprimer l'image"></i>
                </Button>
              )}
            </Card.Header>
            <Card.Body className="text-center p-3">
              {machine.has_image ? (
                <Image
                  src={machine.image_url}
                  alt={machine.nom}
                  fluid
                  className="rounded"
                  style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
                />
              ) : (
                <div className="py-5 text-muted">
                  <i className="fas fa-cogs fa-4x mb-3"></i>
                  <p>Aucune image disponible</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Informations générales */}
        <Col lg={4} className="mb-3">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Informations générales</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Numéro de série:</strong>
                <div className="text-primary">{machine.numero_serie}</div>
              </div>
              
              <div className="mb-3">
                <strong>Modèle:</strong>
                <div>{machine.modele || '-'}</div>
              </div>
              
              <div className="mb-3">
                <strong>Localisation:</strong>
                <div>{machine.localisation || '-'}</div>
              </div>
              
              <div className="mb-3">
                <strong>Statut:</strong>
                <div><StatutBadge statut={machine.statut} /></div>
              </div>
              
              <div className="mb-3">
                <strong>Date d'installation:</strong>
                <div>{formatDate(machine.date_installation)}</div>
              </div>
              
              <div className="mb-0">
                <strong>Dernière maintenance:</strong>
                <div>{formatDate(machine.derniere_maintenance)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Statistiques */}
        <Col lg={4} className="mb-3">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Statistiques</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Composants total:</strong>
                <Badge bg="info" className="ms-2">{machine.composants?.length || 0}</Badge>
              </div>
              
              <div className="mb-3">
                <strong>En bon état:</strong>
                <Badge bg="success" className="ms-2">
                  {machine.composants?.filter(c => c.statut === 'bon').length || 0}
                </Badge>
              </div>
              
              <div className="mb-3">
                <strong>En usure:</strong>
                <Badge bg="warning" className="ms-2">
                  {machine.composants?.filter(c => c.statut === 'usure').length || 0}
                </Badge>
              </div>
              
              <div className="mb-3">
                <strong>Défaillants:</strong>
                <Badge bg="danger" className="ms-2">
                  {machine.composants?.filter(c => c.statut === 'defaillant').length || 0}
                </Badge>
              </div>
              
              <div className="mb-3">
                <strong>Demandes total:</strong>
                <Badge bg="secondary" className="ms-2">{machine.demandes?.length || 0}</Badge>
              </div>
              
              <div className="mb-0">
                <strong>En attente:</strong>
                <Badge bg="warning" className="ms-2">
                  {machine.demandes?.filter(d => d.statut === 'en_attente').length || 0}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Description */}
      {machine.description && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Description</h5>
          </Card.Header>
          <Card.Body>
            <p className="mb-0">{machine.description}</p>
          </Card.Body>
        </Card>
      )}

      {/* Onglets */}
      <Tabs defaultActiveKey="composants" className="mb-3">
        {/* Onglet Composants */}
        <Tab eventKey="composants" title={`Composants (${machine.composants?.length || 0})`}>
          <Card>
            <Card.Header>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Control
                    placeholder="Recherche"
                    value={composantFilters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Control
                    placeholder="Référence..."
                    value={composantFilters.reference}
                    onChange={(e) => handleFilterChange('reference', e.target.value)}
                  />
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={composantFilters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">Tous les types</option>
                    {typesDisponibles.map(type => (
                      <option key={type.id} value={type.id}>{type.nom}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={composantFilters.statut}
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  {hasActiveFilters() && (
                    <Button variant="outline-secondary" onClick={clearFilters}>
                      <i className="fas fa-times me-1"></i>Effacer
                    </Button>
                  )}
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {filteredComposants.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Référence</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComposants.map(composant => (
                      <tr key={composant.id}>
                        <td>{composant.nom}</td>
                        <td>{composant.reference}</td>
                        <td>{composant.type?.nom || '-'}</td>
                        <td><ComposantStatutBadge statut={composant.statut} /></td>
                        <td>
                          <Button
                            as={Link}
                            to={`/composants/${composant.id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted">
                  {hasActiveFilters() ? 'Aucun composant ne correspond aux filtres' : 'Aucun composant trouvé'}
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Demandes */}
        <Tab eventKey="demandes" title={`Demandes (${machine.demandes?.length || 0})`}>
          <Card>
            <Card.Body>
              {machine.demandes && machine.demandes.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Titre</th>
                      <th>Type</th>
                      <th>Priorité</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machine.demandes.map(demande => (
                      <tr key={demande.id}>
                        <td>{demande.numero_demande}</td>
                        <td>{demande.titre}</td>
                        <td>{demande.type_demande}</td>
                        <td>
                          <Badge bg={
                            demande.priorite === 'critique' ? 'danger' :
                            demande.priorite === 'haute' ? 'warning' :
                            demande.priorite === 'normale' ? 'info' : 'secondary'
                          }>
                            {demande.priorite}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={
                            demande.statut === 'acceptee' ? 'success' :
                            demande.statut === 'refusee' ? 'danger' :
                            demande.statut === 'en_cours' ? 'info' : 'warning'
                          }>
                            {demande.statut.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td>{formatDate(demande.created_at)}</td>
                        <td>
                          <Button
                            as={Link}
                            to={`/demandes/${demande.id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted">
                  Aucune demande trouvée pour cette machine
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Spécifications */}
        <Tab eventKey="specifications" title="Spécifications">
          <Card>
            <Card.Body>
              {machine.specifications_techniques && Object.keys(machine.specifications_techniques).length > 0 ? (
                <Table>
                  <tbody>
                    {Object.entries(machine.specifications_techniques).map(([key, value]) => (
                      <tr key={key}>
                        <td><strong>{key}:</strong></td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted">
                  Aucune spécification technique disponible
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal de modification */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Modifier la machine</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            {Object.keys(editFormErrors).length > 0 && (
              <Alert variant="danger">
                <strong>Veuillez corriger les erreurs suivantes :</strong>
                <ul className="mb-0 mt-2">
                  {Object.values(editFormErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
            
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Image</Form.Label>
                  <div className="d-flex gap-3 align-items-center">
                    <Form.Control 
                      type="file" 
                      accept="image/*" 
                      onChange={handleEditImageChange}
                      isInvalid={!!editFormErrors.image}
                    />
                    {editImagePreview && (
                      <div className="position-relative">
                        <img 
                          src={editImagePreview} 
                          width="60" 
                          height="60" 
                          className="rounded" 
                          style={{ objectFit: 'cover' }} 
                        />
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="position-absolute top-0 end-0"
                          onClick={() => {
                            setEditImagePreview(null);
                            setEditFormData(prev => ({ ...prev, image: null }));
                          }}
                          style={{ transform: 'translate(50%, -50%)' }}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </div>
                  {editFormErrors.image && (
                    <div className="text-danger small mt-1">{editFormErrors.image}</div>
                  )}
                  <Form.Text className="text-muted">
                    Formats acceptés: JPG, PNG, GIF (max 5MB)
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.nom}
                    onChange={(e) => handleEditFieldChange('nom', e.target.value)}
                    isInvalid={!!editFormErrors.nom}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {editFormErrors.nom}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Numéro de série *</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.numero_serie}
                    onChange={(e) => handleEditFieldChange('numero_serie', e.target.value)}
                    isInvalid={!!editFormErrors.numero_serie}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {editFormErrors.numero_serie}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Modèle</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.modele}
                    onChange={(e) => handleEditFieldChange('modele', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Localisation</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.localisation}
                    onChange={(e) => handleEditFieldChange('localisation', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={editFormData.statut}
                    onChange={(e) => handleEditFieldChange('statut', e.target.value)}
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
                    value={editFormData.date_installation}
                    onChange={(e) => handleEditFieldChange('date_installation', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Dernière maintenance</Form.Label>
                  <Form.Control
                    type="date"
                    value={editFormData.derniere_maintenance}
                    onChange={(e) => handleEditFieldChange('derniere_maintenance', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) => handleEditFieldChange('description', e.target.value)}
                    placeholder="Description de la machine..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Modification...
                </>
              ) : (
                'Modifier'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MachineDetail;