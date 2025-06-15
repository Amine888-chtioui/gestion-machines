import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Demandes = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [machines, setMachines] = useState([]);
  const [composants, setComposants] = useState([]);
  const [loadingComposants, setLoadingComposants] = useState(false);
  const [filters, setFilters] = useState({
    search: '', statut: '', type_demande: '', priorite: ''
  });
  const [formData, setFormData] = useState({
    machine_id: '', composant_id: '', type_demande: 'maintenance',
    priorite: 'normale', titre: '', description: '', justification: '',
    quantite_demandee: 1, budget_estime: '', date_souhaite: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadDemandes();
    loadMachines();
  }, [filters]);

  const loadDemandes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDemandes(filters);
      setDemandes(response.data.data.data || response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await apiService.getMachinesActives();
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Erreur machines:', error);
      toast.error('Erreur lors du chargement des machines');
    }
  };

  const loadComposants = async (machineId) => {
    if (!machineId) {
      setComposants([]);
      return;
    }
    
    try {
      setLoadingComposants(true);
      console.log('Chargement des composants pour la machine ID:', machineId);
      
      const response = await apiService.getMachineComposants(machineId);
      console.log('Composants reçus:', response.data.data);
      
      setComposants(response.data.data || []);
    } catch (error) {
      console.error('Erreur composants:', error);
      toast.error('Erreur lors du chargement des composants');
      setComposants([]);
    } finally {
      setLoadingComposants(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.machine_id) errors.machine_id = 'La machine est requise';
    if (!formData.type_demande) errors.type_demande = 'Le type de demande est requis';
    if (!formData.titre.trim()) errors.titre = 'Le titre est requis';
    if (!formData.description.trim()) errors.description = 'La description est requise';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.createDemande(formData);
      toast.success('Demande créée avec succès');
      setShowModal(false);
      resetForm();
      loadDemandes();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        Object.values(serverErrors).flat().forEach(err => toast.error(err));
      } else {
        toast.error('Erreur lors de la création de la demande');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccepter = (demande) => {
    setSelectedDemande(demande);
    setCommentaire('');
    setShowAcceptModal(true);
  };

  const handleRefuser = (demande) => {
    setSelectedDemande(demande);
    setCommentaire('');
    setShowRefuseModal(true);
  };

  const confirmerAcceptation = async () => {
    if (!selectedDemande) return;
    
    setSubmitting(true);
    try {
      await apiService.accepterDemande(selectedDemande.id, commentaire);
      toast.success('Demande acceptée');
      setShowAcceptModal(false);
      loadDemandes();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmerRefus = async () => {
    if (!selectedDemande || !commentaire.trim()) return;
    
    setSubmitting(true);
    try {
      await apiService.refuserDemande(selectedDemande.id, commentaire);
      toast.success('Demande refusée');
      setShowRefuseModal(false);
      loadDemandes();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du refus');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: '', composant_id: '', type_demande: 'maintenance',
      priorite: 'normale', titre: '', description: '', justification: '',
      quantite_demandee: 1, budget_estime: '', date_souhaite: ''
    });
    setComposants([]);
    setFormErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur si l'utilisateur corrige
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const StatutBadge = ({ statut }) => (
    <Badge bg={
      statut === 'en_attente' ? 'warning' :
      statut === 'acceptee' ? 'success' :
      statut === 'refusee' ? 'danger' :
      statut === 'en_cours' ? 'info' :
      statut === 'terminee' ? 'secondary' : 'secondary'
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3">Chargement des demandes...</div>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="fas fa-file-alt me-2 text-primary"></i>
          Demandes
        </h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus me-2"></i>Nouvelle Demande
        </Button>
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="acceptee">Acceptée</option>
                <option value="refusee">Refusée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.type_demande}
                onChange={(e) => setFilters(prev => ({ ...prev, type_demande: e.target.value }))}
              >
                <option value="">Tous les types</option>
                <option value="maintenance">Maintenance</option>
                <option value="piece">Pièce</option>
                <option value="reparation">Réparation</option>
                <option value="inspection">Inspection</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.priorite}
                onChange={(e) => setFilters(prev => ({ ...prev, priorite: e.target.value }))}
              >
                <option value="">Toutes les priorités</option>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des demandes */}
      <Card>
        <Card.Body>
          {demandes.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Titre</th>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Demandeur</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandes.map(demande => (
                  <tr key={demande.id}>
                    <td className="fw-bold text-primary">{demande.numero_demande}</td>
                    <td>{demande.titre}</td>
                    <td>{demande.machine?.nom}</td>
                    <td>
                      <Badge bg="info">{demande.type_demande}</Badge>
                    </td>
                    <td><PrioriteBadge priorite={demande.priorite} /></td>
                    <td><StatutBadge statut={demande.statut} /></td>
                    <td>{demande.user?.name}</td>
                    <td>{formatDate(demande.created_at)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          as={Link}
                          to={`/demandes/${demande.id}`}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        {user?.role === 'admin' && demande.statut === 'en_attente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleAccepter(demande)}
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleRefuser(demande)}
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="fas fa-file-alt fa-3x mb-3"></i>
              <h5>Aucune demande trouvée</h5>
              <p>Il n'y a pas encore de demandes dans le système.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal création */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nouvelle Demande</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {Object.keys(formErrors).length > 0 && (
              <Alert variant="danger">
                <strong>Veuillez corriger les erreurs suivantes :</strong>
                <ul className="mb-0 mt-2">
                  {Object.values(formErrors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => {
                      handleFieldChange('machine_id', e.target.value);
                      handleFieldChange('composant_id', ''); // Reset composant
                      loadComposants(e.target.value);
                    }}
                    isInvalid={!!formErrors.machine_id}
                    required
                  >
                    <option value="">Sélectionnez une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.nom} - {machine.localisation}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.machine_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Composant</Form.Label>
                  <Form.Select
                    value={formData.composant_id}
                    onChange={(e) => handleFieldChange('composant_id', e.target.value)}
                    disabled={!formData.machine_id || loadingComposants}
                  >
                    <option value="">
                      {loadingComposants ? 'Chargement...' : 'Aucun composant spécifique'}
                    </option>
                    {composants.map(composant => (
                      <option key={composant.id} value={composant.id}>
                        {composant.nom} ({composant.reference})
                      </option>
                    ))}
                  </Form.Select>
                  {loadingComposants && (
                    <Form.Text className="text-muted">
                      <Spinner size="sm" className="me-1" />
                      Chargement des composants...
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type de demande *</Form.Label>
                  <Form.Select
                    value={formData.type_demande}
                    onChange={(e) => handleFieldChange('type_demande', e.target.value)}
                    isInvalid={!!formErrors.type_demande}
                    required
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="piece">Pièce</option>
                    <option value="reparation">Réparation</option>
                    <option value="inspection">Inspection</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.type_demande}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priorité</Form.Label>
                  <Form.Select
                    value={formData.priorite}
                    onChange={(e) => handleFieldChange('priorite', e.target.value)}
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Titre *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.titre}
                    onChange={(e) => handleFieldChange('titre', e.target.value)}
                    placeholder="Titre de la demande"
                    isInvalid={!!formErrors.titre}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.titre}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Description détaillée de la demande"
                    isInvalid={!!formErrors.description}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.description}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Justification</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.justification}
                    onChange={(e) => handleFieldChange('justification', e.target.value)}
                    placeholder="Justification de la demande (optionnel)"
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Quantité demandée</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.quantite_demandee}
                    onChange={(e) => handleFieldChange('quantite_demandee', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Budget estimé (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_estime}
                    onChange={(e) => handleFieldChange('budget_estime', e.target.value)}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date souhaitée</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date_souhaite}
                    onChange={(e) => handleFieldChange('date_souhaite', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Création...
                </>
              ) : (
                'Créer la demande'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal acceptation */}
      <Modal show={showAcceptModal} onHide={() => setShowAcceptModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-success">Accepter la demande</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDemande && (
            <>
              <div className="mb-3">
                <strong>Demande:</strong> #{selectedDemande.numero_demande}
              </div>
              <div className="mb-3">
                <strong>Titre:</strong> {selectedDemande.titre}
              </div>
              <Form.Group>
                <Form.Label>Commentaire (optionnel)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAcceptModal(false)}>
            Annuler
          </Button>
          <Button variant="success" onClick={confirmerAcceptation} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : 'Accepter'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal refus */}
      <Modal show={showRefuseModal} onHide={() => setShowRefuseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Refuser la demande</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDemande && (
            <>
              <div className="mb-3">
                <strong>Demande:</strong> #{selectedDemande.numero_demande}
              </div>
              <div className="mb-3">
                <strong>Titre:</strong> {selectedDemande.titre}
              </div>
              <Form.Group>
                <Form.Label>Motif du refus *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Expliquer le motif du refus..."
                  required
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefuseModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmerRefus} 
            disabled={submitting || !commentaire.trim()}
          >
            {submitting ? <Spinner size="sm" /> : 'Refuser'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Demandes;