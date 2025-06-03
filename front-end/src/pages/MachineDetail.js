// src/pages/MachineDetail.js - Version avec filtration des composants
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Tab, Tabs, Image, Form, InputGroup } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const MachineDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // États pour la filtration des composants
  const [filteredComposants, setFilteredComposants] = useState([]);
  const [composantFilters, setComposantFilters] = useState({
    search: '',
    type: '',
    statut: '',
    reference: ''
  });
  const [typesDisponibles, setTypesDisponibles] = useState([]);

  useEffect(() => {
    loadMachine();
  }, [id]);

  // Effet pour appliquer les filtres quand la machine ou les filtres changent
  useEffect(() => {
    if (machine && machine.composants) {
      applyComposantFilters();
      extractTypesDisponibles();
    }
  }, [machine, composantFilters]);

  const loadMachine = async () => {
    try {
      const response = await apiService.getMachine(id);
      setMachine(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extraire les types disponibles des composants
  const extractTypesDisponibles = () => {
    if (!machine || !machine.composants) return;
    
    const types = machine.composants
      .filter(composant => composant.type)
      .map(composant => composant.type)
      .filter((type, index, self) => 
        index === self.findIndex(t => t.id === type.id)
      )
      .sort((a, b) => a.nom.localeCompare(b.nom));
    
    setTypesDisponibles(types);
  };

  // Appliquer les filtres aux composants
  const applyComposantFilters = () => {
    if (!machine || !machine.composants) return;

    let filtered = [...machine.composants];

    // Filtre par recherche (nom ou description)
    if (composantFilters.search) {
      const searchTerm = composantFilters.search.toLowerCase();
      filtered = filtered.filter(composant =>
        composant.nom.toLowerCase().includes(searchTerm) ||
        (composant.description && composant.description.toLowerCase().includes(searchTerm))
      );
    }

    // Filtre par référence
    if (composantFilters.reference) {
      const refTerm = composantFilters.reference.toLowerCase();
      filtered = filtered.filter(composant =>
        composant.reference.toLowerCase().includes(refTerm)
      );
    }

    // Filtre par type
    if (composantFilters.type) {
      filtered = filtered.filter(composant =>
        composant.type && composant.type.id.toString() === composantFilters.type
      );
    }

    // Filtre par statut
    if (composantFilters.statut) {
      filtered = filtered.filter(composant =>
        composant.statut === composantFilters.statut
      );
    }

    setFilteredComposants(filtered);
  };

  // Gérer les changements de filtres
  const handleFilterChange = (filterName, value) => {
    setComposantFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Effacer tous les filtres
  const clearFilters = () => {
    setComposantFilters({
      search: '',
      type: '',
      statut: '',
      reference: ''
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = () => {
    return Object.values(composantFilters).some(value => value !== '');
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      return;
    }

    try {
      await apiService.deleteMachineImage(machine.id);
      toast.success('Image supprimée avec succès');
      loadMachine();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'image');
    }
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-5">
        <h4>Machine non trouvée</h4>
        <Link to="/machines" className="btn btn-primary">Retour aux machines</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="fas fa-cog me-2"></i>
          {machine.nom}
        </h1>
        <Button as={Link} to="/machines" variant="outline-secondary">
          <i className="fas fa-arrow-left me-2"></i>
          Retour aux machines
        </Button>
      </div>

      <Row className="mb-4">
        {/* Image de la machine */}
        {machine.has_image && (
          <Col lg={4} className="mb-3">
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-image me-2"></i>
                  Image
                </h5>
                {user?.role === 'admin' && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteImage}
                    title="Supprimer l'image"
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                )}
              </Card.Header>
              <Card.Body className="text-center p-3">
                <Image
                  src={machine.image_url}
                  alt={machine.nom}
                  fluid
                  className="rounded shadow-sm"
                  style={{ 
                    maxHeight: '300px',
                    objectFit: 'cover',
                    width: '100%'
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Informations principales */}
        <Col lg={machine.has_image ? 8 : 12}>
          <Row>
            <Col lg={8} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Informations générales
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Numéro de série:</strong>
                        <div className="text-primary fw-bold">{machine.numero_serie}</div>
                      </div>
                      <div className="mb-3">
                        <strong>Modèle:</strong>
                        <div>{machine.modele}</div>
                      </div>
                      <div className="mb-3">
                        <strong>Localisation:</strong>
                        <div>{machine.localisation || '-'}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Statut:</strong>
                        <div>{getStatutBadge(machine.statut)}</div>
                      </div>
                      <div className="mb-3">
                        <strong>Date d'installation:</strong>
                        <div>{machine.date_installation ? new Date(machine.date_installation).toLocaleDateString('fr-FR') : '-'}</div>
                      </div>
                      <div className="mb-3">
                        <strong>Dernière maintenance:</strong>
                        <div>{machine.derniere_maintenance ? new Date(machine.derniere_maintenance).toLocaleDateString('fr-FR') : '-'}</div>
                      </div>
                    </Col>
                  </Row>
                  {machine.description && (
                    <div className="mt-3">
                      <strong>Description:</strong>
                      <div className="mt-2 p-3 bg-light rounded">
                        {machine.description}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="fas fa-chart-bar me-2"></i>
                    Statistiques
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Composants total:</span>
                      <Badge bg="info" className="fs-6">
                        {machine.statistiques?.composants_total || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>En bon état:</span>
                      <Badge bg="success" className="fs-6">
                        {machine.statistiques?.composants_bon || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>En usure:</span>
                      <Badge bg="warning" className="fs-6">
                        {machine.statistiques?.composants_usure || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Défaillants:</span>
                      <Badge bg="danger" className="fs-6">
                        {machine.statistiques?.composants_defaillant || 0}
                      </Badge>
                    </div>
                  </div>
                  <hr />
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Demandes total:</span>
                      <Badge bg="secondary" className="fs-6">
                        {machine.statistiques?.demandes_total || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>En attente:</span>
                      <Badge bg="warning" className="fs-6">
                        {machine.statistiques?.demandes_en_attente || 0}
                      </Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Onglets pour les détails */}
      <Card>
        <Card.Body>
          <Tabs defaultActiveKey="composants" id="machine-details-tabs" className="mb-3">
            {/* Onglet Composants avec filtration */}
            <Tab eventKey="composants" title={
              <span>
                <i className="fas fa-puzzle-piece me-2"></i>
                Composants ({machine.composants?.length || 0}
                {hasActiveFilters() && ` - ${filteredComposants.length} filtrés`})
              </span>
            }>
              {machine.composants && machine.composants.length > 0 ? (
                <>
                  {/* Section de filtration */}
                  <Card className="mb-4 border-light">
                    <Card.Header className="bg-light py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          <i className="fas fa-filter me-2"></i>
                          Filtres des composants
                        </h6>
                        {hasActiveFilters() && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={clearFilters}
                            title="Effacer tous les filtres"
                          >
                            <i className="fas fa-times me-2"></i>
                            Effacer
                          </Button>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body className="py-3">
                      <Row className="g-3">
                        <Col md={3}>
                          <InputGroup>
                            <InputGroup.Text>
                              <i className="fas fa-search"></i>
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              placeholder="Rechercher par nom..."
                              value={composantFilters.search}
                              onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                          </InputGroup>
                        </Col>
                        <Col md={3}>
                          <InputGroup>
                            <InputGroup.Text>
                              <i className="fas fa-barcode"></i>
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              placeholder="Rechercher par référence..."
                              value={composantFilters.reference}
                              onChange={(e) => handleFilterChange('reference', e.target.value)}
                            />
                          </InputGroup>
                        </Col>
                        <Col md={3}>
                          <Form.Select
                            value={composantFilters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                          >
                            <option value="">Tous les types</option>
                            {typesDisponibles.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.nom}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={3}>
                          <Form.Select
                            value={composantFilters.statut}
                            onChange={(e) => handleFilterChange('statut', e.target.value)}
                          >
                            <option value="">Tous les statuts</option>
                            <option value="bon">Bon</option>
                            <option value="usure">Usure</option>
                            <option value="defaillant">Défaillant</option>
                            <option value="remplace">Remplacé</option>
                          </Form.Select>
                        </Col>
                      </Row>
                      
                      {/* Indicateur de filtres actifs */}
                      {hasActiveFilters() && (
                        <div className="mt-3">
                          <div className="d-flex flex-wrap gap-2">
                            <small className="text-muted me-2">Filtres actifs:</small>
                            {composantFilters.search && (
                              <Badge 
                                bg="primary" 
                                className="d-flex align-items-center gap-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleFilterChange('search', '')}
                              >
                                Nom: "{composantFilters.search}"
                                <i className="fas fa-times"></i>
                              </Badge>
                            )}
                            {composantFilters.reference && (
                              <Badge 
                                bg="primary" 
                                className="d-flex align-items-center gap-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleFilterChange('reference', '')}
                              >
                                Réf: "{composantFilters.reference}"
                                <i className="fas fa-times"></i>
                              </Badge>
                            )}
                            {composantFilters.type && (
                              <Badge 
                                bg="info" 
                                className="d-flex align-items-center gap-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleFilterChange('type', '')}
                              >
                                Type: {typesDisponibles.find(t => t.id.toString() === composantFilters.type)?.nom}
                                <i className="fas fa-times"></i>
                              </Badge>
                            )}
                            {composantFilters.statut && (
                              <Badge 
                                bg="warning" 
                                className="d-flex align-items-center gap-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleFilterChange('statut', '')}
                              >
                                Statut: {composantFilters.statut}
                                <i className="fas fa-times"></i>
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Tableau des composants filtrés */}
                  {filteredComposants.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Référence</th>
                            <th>Type</th>
                            <th>Statut</th>
                            <th>Quantité</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredComposants.map((composant) => (
                            <tr key={composant.id}>
                              <td>
                                <div className="fw-bold">{composant.nom}</div>
                                {composant.description && (
                                  <small className="text-muted">
                                    {composant.description.length > 50 
                                      ? `${composant.description.substring(0, 50)}...`
                                      : composant.description
                                    }
                                  </small>
                                )}
                              </td>
                              <td>
                                <span className="fw-bold text-primary">
                                  {composant.reference}
                                </span>
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
                                <Badge bg={
                                  composant.statut === 'bon' ? 'success' :
                                  composant.statut === 'usure' ? 'warning' :
                                  composant.statut === 'defaillant' ? 'danger' : 'secondary'
                                }>
                                  {composant.statut}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg="info">
                                  {composant.quantite}
                                </Badge>
                              </td>
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
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fas fa-filter fa-3x text-muted mb-3"></i>
                      <h5>Aucun composant trouvé</h5>
                      <p className="text-muted">
                        Aucun composant ne correspond aux critères de filtrage sélectionnés.
                      </p>
                      <Button variant="outline-primary" onClick={clearFilters}>
                        <i className="fas fa-times me-2"></i>
                        Effacer les filtres
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
                  <h5>Aucun composant</h5>
                  <p className="text-muted">Cette machine n'a pas encore de composants enregistrés.</p>
                  {user?.role === 'admin' && (
                    <Button 
                      as={Link} 
                      to="/composants?action=create"
                      variant="primary"
                    >
                      <i className="fas fa-plus me-2"></i>
                      Ajouter un composant
                    </Button>
                  )}
                </div>
              )}
            </Tab>

            {/* Onglet Demandes */}
            <Tab eventKey="demandes" title={
              <span>
                <i className="fas fa-file-alt me-2"></i>
                Demandes récentes ({machine.demandes?.length || 0})
              </span>
            }>
              {machine.demandes && machine.demandes.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Numéro</th>
                        <th>Titre</th>
                        <th>Type</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                        <th>Demandeur</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machine.demandes.map((demande) => (
                        <tr key={demande.id}>
                          <td>
                            <span className="fw-bold text-primary">
                              {demande.numero_demande}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold">{demande.titre}</div>
                            {demande.description && (
                              <small className="text-muted">
                                {demande.description.length > 50 
                                  ? `${demande.description.substring(0, 50)}...`
                                  : demande.description
                                }
                              </small>
                            )}
                          </td>
                          <td>
                            <Badge bg="info">
                              {demande.type_demande}
                            </Badge>
                          </td>
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
                              demande.statut === 'en_cours' ? 'info' :
                              demande.statut === 'terminee' ? 'secondary' : 'warning'
                            }>
                              {demande.statut.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <div>
                              <div className="fw-bold">{demande.user?.name}</div>
                              <small className="text-muted">{demande.user?.email}</small>
                            </div>
                          </td>
                          <td>
                            {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                          </td>
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
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
                  <h5>Aucune demande</h5>
                  <p className="text-muted">Aucune demande n'a été soumise pour cette machine.</p>
                  <Button 
                    as={Link} 
                    to="/demandes?action=create"
                    variant="primary"
                  >
                    <i className="fas fa-plus me-2"></i>
                    Créer une demande
                  </Button>
                </div>
              )}
            </Tab>

            {/* Onglet Spécifications techniques */}
            <Tab eventKey="specifications" title={
              <span>
                <i className="fas fa-cog me-2"></i>
                Spécifications
              </span>
            }>
              {machine.specifications_techniques && Object.keys(machine.specifications_techniques).length > 0 ? (
                <div className="row">
                  {Object.entries(machine.specifications_techniques).map(([key, value]) => (
                    <div key={key} className="col-md-6 mb-3">
                      <div className="card border-light">
                        <div className="card-body">
                          <h6 className="card-title text-capitalize">{key.replace('_', ' ')}</h6>
                          <p className="card-text">{value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-cog fa-3x text-muted mb-3"></i>
                  <h5>Aucune spécification</h5>
                  <p className="text-muted">Aucune spécification technique n'a été renseignée pour cette machine.</p>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="outline-primary"
                      onClick={() => {
                        toast.info('Fonctionnalité de modification à implémenter');
                      }}
                    >
                      <i className="fas fa-edit me-2"></i>
                      Ajouter des spécifications
                    </Button>
                  )}
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Actions rapides */}
      {user?.role === 'admin' && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <i className="fas fa-bolt me-2"></i>
                  Actions rapides
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex gap-2 flex-wrap">
                  <Button 
                    variant="outline-primary"
                    onClick={() => {
                      toast.info('Fonctionnalité de modification à implémenter');
                    }}
                  >
                    <i className="fas fa-edit me-2"></i>
                    Modifier la machine
                  </Button>
                  
                  <Button 
                    variant="outline-info"
                    onClick={() => {
                      toast.info('Fonctionnalité de maintenance à implémenter');
                    }}
                  >
                    <i className="fas fa-wrench me-2"></i>
                    Planifier maintenance
                  </Button>
                  
                  <Button 
                    as={Link}
                    to={`/composants?machine_id=${machine.id}`}
                    variant="outline-success"
                  >
                    <i className="fas fa-puzzle-piece me-2"></i>
                    Voir tous les composants
                  </Button>
                  
                  <Button 
                    as={Link}
                    to={`/demandes?machine_id=${machine.id}`}
                    variant="outline-warning"
                  >
                    <i className="fas fa-file-alt me-2"></i>
                    Voir toutes les demandes
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Styles personnalisés pour la filtration */}
      <style jsx>{`
        .badge {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .badge:hover {
          opacity: 0.8;
          transform: scale(0.95);
        }
        
        .table th {
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          color: #495057;
        }
        
        .table tbody tr:hover {
          background-color: #f5f5f5;
        }
        
        .card.border-light {
          border: 1px solid #e9ecef !important;
        }
        
        .input-group-text {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: #6c757d;
        }
        
        .form-control:focus,
        .form-select:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
        }
        
        .filter-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        .filter-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
        }
        
        .stats-card {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .stats-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .tab-content {
          border: none;
        }
        
        .nav-tabs .nav-link {
          border: none;
          border-bottom: 3px solid transparent;
          color: #6c757d;
          font-weight: 500;
        }
        
        .nav-tabs .nav-link:hover {
          border-bottom-color: #dee2e6;
          color: #495057;
        }
        
        .nav-tabs .nav-link.active {
          background-color: transparent;
          border-bottom-color: #0d6efd;
          color: #0d6efd;
        }
        
        .empty-state {
          padding: 3rem 2rem;
          text-align: center;
          color: #6c757d;
        }
        
        .empty-state i {
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .filter-summary {
          background: rgba(13, 110, 253, 0.1);
          border: 1px solid rgba(13, 110, 253, 0.2);
          border-radius: 6px;
          padding: 0.75rem;
        }
        
        .component-row {
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
        }
        
        .component-row:hover {
          border-left-color: #0d6efd;
          background-color: rgba(13, 110, 253, 0.05);
        }
        
        .component-row.status-bon {
          border-left-color: #198754;
        }
        
        .component-row.status-usure {
          border-left-color: #ffc107;
        }
        
        .component-row.status-defaillant {
          border-left-color: #dc3545;
        }
        
        .component-row.status-remplace {
          border-left-color: #6c757d;
        }
        
        @media (max-width: 768px) {
          .d-flex.gap-2.flex-wrap {
            flex-direction: column;
          }
          
          .d-flex.gap-2.flex-wrap .btn {
            margin-bottom: 0.5rem;
          }
          
          .table-responsive {
            font-size: 0.875rem;
          }
          
          .badge {
            font-size: 0.7rem;
          }
        }
        
        /* Animation pour les filtres */
        .filter-animate {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Styles pour les badges cliquables */
        .clickable-badge {
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        
        .clickable-badge:hover {
          transform: scale(0.95);
          opacity: 0.8;
        }
        
        .clickable-badge:active {
          transform: scale(0.9);
        }
        
        /* Amélioration des boutons d'action */
        .btn-outline-primary:hover {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: #fff;
        }
        
        .btn-outline-success:hover {
          background-color: #198754;
          border-color: #198754;
          color: #fff;
        }
        
        .btn-outline-warning:hover {
          background-color: #ffc107;
          border-color: #ffc107;
          color: #000;
        }
        
        .btn-outline-info:hover {
          background-color: #0dcaf0;
          border-color: #0dcaf0;
          color: #000;
        }
        
        /* Styles pour les tooltips */
        [title] {
          position: relative;
        }
        
        /* Responsive pour les filtres */
        @media (max-width: 576px) {
          .filter-section .row .col-md-3 {
            margin-bottom: 0.75rem;
          }
          
          .filter-summary {
            font-size: 0.875rem;
          }
          
          .filter-summary .badge {
            font-size: 0.7rem;
            margin: 0.125rem;
          }
        }
        
        /* Animation au chargement */
        .component-table {
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* Amélioration de l'accessibilité */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Focus visible pour l'accessibilité */
        .btn:focus-visible,
        .form-control:focus-visible,
        .form-select:focus-visible {
          outline: 2px solid #0d6efd;
          outline-offset: 2px;
        }
        
        /* Print styles */
        @media print {
          .btn,
          .filter-section,
          .actions-section {
            display: none !important;
          }
          
          .table {
            border-collapse: collapse;
          }
          
          .table th,
          .table td {
            border: 1px solid #000 !important;
          }
          
          .badge {
            color: #000 !important;
            background: transparent !important;
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MachineDetail;