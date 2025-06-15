// front-end/src/pages/ComposantDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Image, Tab, Tabs } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';
import ComposantDeleteModal from '../components/ComposantDeleteModal';
import ComposantEditForm from '../components/ComposantEditForm';

const ComposantDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [composant, setComposant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadComposant();
  }, [id]);

  const loadComposant = async () => {
    try {
      const response = await apiService.getComposant(id);
      setComposant(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComposant = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    // Rediriger vers la liste des composants après suppression
    navigate('/composants');
  };

  const handleEditComposant = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    loadComposant(); // Recharger les données du composant
    setShowEditModal(false);
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Supprimer cette image ?')) return;
    
    try {
      await apiService.deleteComposantImage(composant.id);
      toast.success('Image supprimée');
      loadComposant();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const StatutBadge = ({ statut }) => (
    <Badge bg={
      statut === 'bon' ? 'success' : 
      statut === 'usure' ? 'warning' : 
      statut === 'defaillant' ? 'danger' : 'secondary'
    }>
      {statut}
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Chargement...</p>
      </div>
    );
  }

  if (!composant) {
    return (
      <div className="text-center py-5">
        <h4>Composant non trouvé</h4>
        <Link to="/composants" className="btn btn-primary">Retour aux composants</Link>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête avec boutons d'action */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1><i className="fas fa-puzzle-piece me-2"></i>{composant.nom}</h1>
        <div>
          {user?.role === 'admin' && (
            <>
              <Button 
                variant="outline-primary" 
                className="me-2"
                onClick={handleEditComposant}
              >
                <i className="fas fa-edit me-2"></i>Modifier
              </Button>
              <Button 
                variant="outline-danger" 
                className="me-2"
                onClick={handleDeleteComposant}
              >
                <i className="fas fa-trash me-2"></i>Supprimer
              </Button>
            </>
          )}
          <Button as={Link} to="/composants" variant="outline-secondary">
            <i className="fas fa-arrow-left me-2"></i>Retour
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        {/* Image */}
        {composant.has_image && (
          <Col lg={4} className="mb-3">
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Image</h5>
              </Card.Header>
              <Card.Body className="text-center p-3">
                <Image
                  src={composant.image_url}
                  alt={composant.nom}
                  fluid
                  className="rounded"
                  style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
                />
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Informations principales */}
        <Col lg={composant.has_image ? 8 : 12}>
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
                        <strong>Référence:</strong>
                        <div className="text-primary fw-bold">{composant.reference}</div>
                      </div>
                      <div className="mb-3">
                        <strong>Type:</strong>
                        <div>
                          {composant.type ? (
                            <Badge bg="info">{composant.type.nom}</Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Statut:</strong>
                        <div><StatutBadge statut={composant.statut} /></div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Machine:</strong>
                        <div>
                          {composant.machine ? (
                            <Link to={`/machines/${composant.machine.id}`} className="text-decoration-none">
                              {composant.machine.nom}
                            </Link>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Quantité:</strong>
                        <div><Badge bg="secondary">{composant.quantite}</Badge></div>
                      </div>
                      <div className="mb-3">
                        <strong>Prix unitaire:</strong>
                        <div>
                          {composant.prix_unitaire ? 
                            `${parseFloat(composant.prix_unitaire).toFixed(2)} €` : 
                            '-'
                          }
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {composant.description && (
                    <div className="mt-3">
                      <strong>Description:</strong>
                      <div className="mt-2 p-3 bg-light rounded">{composant.description}</div>
                    </div>
                  )}

                  {composant.fournisseur && (
                    <div className="mt-3">
                      <strong>Fournisseur:</strong>
                      <div className="mt-1">{composant.fournisseur}</div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Informations techniques */}
            <Col lg={4} className="mb-3">
              <Card className="h-100">
                <Card.Header>
                  <h5 className="mb-0">Informations techniques</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <strong>Date d'installation:</strong>
                    <div>
                      {composant.date_installation ? 
                        new Date(composant.date_installation).toLocaleDateString('fr-FR') : 
                        '-'
                      }
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong>Prochaine inspection:</strong>
                    <div>
                      {composant.prochaine_inspection ? 
                        new Date(composant.prochaine_inspection).toLocaleDateString('fr-FR') : 
                        '-'
                      }
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong>Durée de vie estimée:</strong>
                    <div>
                      {composant.duree_vie_estimee ? 
                        `${composant.duree_vie_estimee} mois` : 
                        '-'
                      }
                    </div>
                  </div>
                  <div>
                    <strong>Valeur totale:</strong>
                    <div className="fw-bold text-success">
                      {composant.prix_unitaire ? 
                        `${(parseFloat(composant.prix_unitaire) * composant.quantite).toFixed(2)} €` : 
                        '-'
                      }
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Onglets pour demandes */}
      {composant.demandes && composant.demandes.length > 0 && (
        <Card>
          <Card.Body>
            <Tabs defaultActiveKey="demandes" className="mb-3">
              <Tab 
                eventKey="demandes" 
                title={
                  <span>
                    <i className="fas fa-file-alt me-2"></i>
                    Demandes ({composant.demandes.length})
                  </span>
                }
              >
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Titre</th>
                        <th>Demandeur</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {composant.demandes.map((demande) => (
                        <tr key={demande.id}>
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
                          <td>{demande.user?.name || '-'}</td>
                          <td>
                            <PrioriteBadge priorite={demande.priorite} />
                          </td>
                          <td>
                            <DemandeStatutBadge statut={demande.statut} />
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
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      )}

      {/* Actions rapides */}
      {user?.role === 'admin' && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">Actions rapides</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline-primary" onClick={handleEditComposant}>
                <i className="fas fa-edit me-2"></i>Modifier
              </Button>
              <Button variant="outline-danger" onClick={handleDeleteComposant}>
                <i className="fas fa-trash me-2"></i>Supprimer
              </Button>
              <Button as={Link} to={`/machines/${composant.machine?.id}`} variant="outline-info">
                <i className="fas fa-cogs me-2"></i>Voir machine
              </Button>
              <Button as={Link} to={`/demandes?composant_id=${composant.id}`} variant="outline-primary">
                <i className="fas fa-file-alt me-2"></i>Voir demandes
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Modal de suppression */}
      <ComposantDeleteModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        composant={composant}
        onSuccess={handleDeleteSuccess}
      />

      {/* Modal de modification */}
      <ComposantEditForm
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        composant={composant}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default ComposantDetail;