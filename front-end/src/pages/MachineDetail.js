// src/pages/MachineDetail.js - Version mise à jour avec image
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Tab, Tabs, Image } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const MachineDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMachine();
  }, [id]);

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

  const handleDeleteImage = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      return;
    }

    try {
      await apiService.deleteMachineImage(machine.id);
      toast.success('Image supprimée avec succès');
      loadMachine(); // Recharger les données
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
            {/* Onglet Composants */}
            <Tab eventKey="composants" title={
              <span>
                <i className="fas fa-puzzle-piece me-2"></i>
                Composants ({machine.composants?.length || 0})
              </span>
            }>
              {machine.composants && machine.composants.length > 0 ? (
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
                      {machine.composants.map((composant) => (
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
                        // TODO: Ouvrir un modal de modification
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
                      // TODO: Ouvrir modal de modification
                      toast.info('Fonctionnalité de modification à implémenter');
                    }}
                  >
                    <i className="fas fa-edit me-2"></i>
                    Modifier la machine
                  </Button>
                  
                  <Button 
                    variant="outline-info"
                    onClick={() => {
                      // TODO: Ouvrir modal de maintenance
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
    </div>
  );
};

export default MachineDetail;