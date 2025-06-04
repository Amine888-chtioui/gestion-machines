// src/pages/MachineDetail.js - Version simplifiée
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Tab, Tabs, Image, Form } from 'react-bootstrap';
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
      const response = await apiService.getMachine(id);
      setMachine(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
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
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await apiService.deleteMachineImage(machine.id);
      toast.success('Image supprimée');
      loadMachine();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
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

  const DemandeStatutBadge = ({ statut }) => (
    <Badge bg={
      statut === 'acceptee' ? 'success' :
      statut === 'refusee' ? 'danger' :
      statut === 'en_cours' ? 'info' :
      statut === 'terminee' ? 'secondary' : 'warning'
    }>
      {statut.replace('_', ' ')}
    </Badge>
  );

  const PrioriteBadge = ({ priorite }) => (
    <Badge bg={
      priorite === 'critique' ? 'danger' :
      priorite === 'haute' ? 'warning' :
      priorite === 'normale' ? 'info' : 'secondary'
    }>
      {priorite}
    </Badge>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Chargement...</p>
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
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1><i className="fas fa-cog me-2"></i>{machine.nom}</h1>
        <Button as={Link} to="/machines" variant="outline-secondary">
          <i className="fas fa-arrow-left me-2"></i>Retour
        </Button>
      </div>

      <Row className="mb-4">
        {/* Image */}
        {machine.has_image && (
          <Col lg={4} className="mb-3">
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Image</h5>
                {user?.role === 'admin' && (
                  <Button variant="outline-danger" size="sm" onClick={handleDeleteImage}>
                    <i className="fas fa-trash"></i>
                  </Button>
                )}
              </Card.Header>
              <Card.Body className="text-center p-3">
                <Image
                  src={machine.image_url}
                  alt={machine.nom}
                  fluid
                  className="rounded"
                  style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
                />
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Informations */}
        <Col lg={machine.has_image ? 8 : 12}>
          <Row>
            <Col lg={8} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Informations générales</h5>
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
                        <div><StatutBadge statut={machine.statut} /></div>
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
                      <div className="mt-2 p-3 bg-light rounded">{machine.description}</div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Statistiques */}
            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Statistiques</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3 d-flex justify-content-between">
                    <span>Composants total:</span>
                    <Badge bg="info">{machine.statistiques?.composants_total || 0}</Badge>
                  </div>
                  <div className="mb-3 d-flex justify-content-between">
                    <span>En bon état:</span>
                    <Badge bg="success">{machine.statistiques?.composants_bon || 0}</Badge>
                  </div>
                  <div className="mb-3 d-flex justify-content-between">
                    <span>En usure:</span>
                    <Badge bg="warning">{machine.statistiques?.composants_usure || 0}</Badge>
                  </div>
                  <div className="mb-3 d-flex justify-content-between">
                    <span>Défaillants:</span>
                    <Badge bg="danger">{machine.statistiques?.composants_defaillant || 0}</Badge>
                  </div>
                  <hr />
                  <div className="mb-3 d-flex justify-content-between">
                    <span>Demandes total:</span>
                    <Badge bg="secondary">{machine.statistiques?.demandes_total || 0}</Badge>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>En attente:</span>
                    <Badge bg="warning">{machine.statistiques?.demandes_en_attente || 0}</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Onglets */}
      <Card>
        <Card.Body>
          <Tabs defaultActiveKey="composants" className="mb-3">
            {/* Composants */}
            <Tab eventKey="composants" title={
              <span>
                <i className="fas fa-puzzle-piece me-2"></i>
                Composants ({machine.composants?.length || 0}
                {hasActiveFilters() && ` - ${filteredComposants.length} filtrés`})
              </span>
            }>
              {machine.composants?.length > 0 ? (
                <>
                  {/* Filtres */}
                  <Card className="mb-4 border-light">
                    <Card.Header className="bg-light py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Filtres</h6>
                        {hasActiveFilters() && (
                          <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                            Effacer
                          </Button>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body className="py-3">
                      <Row className="g-3">
                        <Col md={3}>
                          <Form.Control
                            type="text"
                            placeholder="Rechercher par nom..."
                            value={composantFilters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                          />
                        </Col>
                        <Col md={3}>
                          <Form.Control
                            type="text"
                            placeholder="Rechercher par référence..."
                            value={composantFilters.reference}
                            onChange={(e) => handleFilterChange('reference', e.target.value)}
                          />
                        </Col>
                        <Col md={3}>
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
                    </Card.Body>
                  </Card>

                  {/* Tableau */}
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
                              <td><span className="fw-bold text-primary">{composant.reference}</span></td>
                              <td>
                                {composant.type && (
                                  <Badge bg="secondary" style={{ backgroundColor: composant.type.couleur }}>
                                    {composant.type.nom}
                                  </Badge>
                                )}
                              </td>
                              <td><ComposantStatutBadge statut={composant.statut} /></td>
                              <td><Badge bg="info">{composant.quantite}</Badge></td>
                              <td>
                                <Button as={Link} to={`/composants/${composant.id}`} variant="outline-primary" size="sm">
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
                      <p className="text-muted">Aucun composant ne correspond aux critères.</p>
                      <Button variant="outline-primary" onClick={clearFilters}>Effacer les filtres</Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
                  <h5>Aucun composant</h5>
                  <p className="text-muted">Cette machine n'a pas encore de composants.</p>
                </div>
              )}
            </Tab>

            {/* Demandes */}
            <Tab eventKey="demandes" title={
              <span>
                <i className="fas fa-file-alt me-2"></i>
                Demandes ({machine.demandes?.length || 0})
              </span>
            }>
              {machine.demandes?.length > 0 ? (
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
                          <td><span className="fw-bold text-primary">{demande.numero_demande}</span></td>
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
                          <td><Badge bg="info">{demande.type_demande}</Badge></td>
                          <td><PrioriteBadge priorite={demande.priorite} /></td>
                          <td><DemandeStatutBadge statut={demande.statut} /></td>
                          <td>
                            <div>
                              <div className="fw-bold">{demande.user?.name}</div>
                              <small className="text-muted">{demande.user?.email}</small>
                            </div>
                          </td>
                          <td>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                          <td>
                            <Button as={Link} to={`/demandes/${demande.id}`} variant="outline-primary" size="sm">
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
                  <p className="text-muted">Aucune demande pour cette machine.</p>
                  <Button as={Link} to="/demandes" variant="primary">Créer une demande</Button>
                </div>
              )}
            </Tab>

            {/* Spécifications */}
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
                  <p className="text-muted">Aucune spécification technique renseignée.</p>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Actions rapides */}
      {user?.role === 'admin' && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">Actions rapides</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline-primary">
                <i className="fas fa-edit me-2"></i>Modifier
              </Button>
              <Button variant="outline-info">
                <i className="fas fa-wrench me-2"></i>Maintenance
              </Button>
              <Button as={Link} to={`/composants?machine_id=${machine.id}`} variant="outline-success">
                <i className="fas fa-puzzle-piece me-2"></i>Voir composants
              </Button>
              <Button as={Link} to={`/demandes?machine_id=${machine.id}`} variant="outline-warning">
                <i className="fas fa-file-alt me-2"></i>Voir demandes
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default MachineDetail;