// src/pages/Demandes.js - Version optimisée
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
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
  const [filters, setFilters] = useState({
    search: '', statut: '', type_demande: '', priorite: ''
  });
  const [formData, setFormData] = useState({
    machine_id: '', composant_id: '', type_demande: 'maintenance',
    priorite: 'normale', titre: '', description: '', justification: '',
    quantite_demandee: 1, budget_estime: '', date_souhaite: ''
  });
  const [submitting, setSubmitting] = useState(false);

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
    }
  };

  const loadComposants = async (machineId) => {
    if (!machineId) {
      setComposants([]);
      return;
    }
    try {
      // Note: Cette route n'existe pas dans votre API, à ajouter si nécessaire
      // const response = await apiService.getMachineComposants(machineId);
      // setComposants(response.data.data || []);
      setComposants([]);
    } catch (error) {
      console.error('Erreur composants:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.createDemande(formData);
      toast.success('Demande créée avec succès');
      setShowModal(false);
      resetForm();
      loadDemandes();
    } catch (error) {
      console.error('Erreur:', error);
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
      setSelectedDemande(null);
      setCommentaire('');
      loadDemandes();
    } catch (error) {
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmerRefus = async () => {
    if (!selectedDemande || !commentaire.trim()) {
      toast.error('Le motif de refus est obligatoire');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.refuserDemande(selectedDemande.id, commentaire);
      toast.success('Demande refusée');
      setShowRefuseModal(false);
      setSelectedDemande(null);
      setCommentaire('');
      loadDemandes();
    } catch (error) {
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
  };

  const StatutBadge = ({ statut }) => (
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
      priorite === 'normale' ? 'info' : 'success'
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
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Chargement des demandes...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-file-alt me-2"></i>Demandes</h2>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus me-2"></i>Nouvelle Demande
            </Button>
          </div>
        </Col>
      </Row>

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
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="acceptee">Acceptée</option>
                <option value="refusee">Refusée</option>
                <option value="terminee">Terminée</option>
              </Form.Select>
            </Col>
            <Col md={2}>
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
            <Col md={2}>
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
            <Col md={1}>
              <Button variant="outline-secondary" onClick={() => setFilters({ search: '', statut: '', type_demande: '', priorite: '' })}>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste */}
      {demandes.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
            <h4>Aucune demande</h4>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Créer une demande
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table hover>
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
                {demandes.map((demande) => (
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
                            : demande.description}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="fw-bold">{demande.machine?.nom}</div>
                      {demande.machine?.localisation && (
                        <small className="text-muted">{demande.machine.localisation}</small>
                      )}
                    </td>
                    <td>
                      <Badge bg="info">{demande.type_demande}</Badge>
                    </td>
                    <td><PrioriteBadge priorite={demande.priorite} /></td>
                    <td><StatutBadge statut={demande.statut} /></td>
                    <td>
                      <div className="fw-bold">{demande.user?.name}</div>
                      <small className="text-muted">{demande.user?.email}</small>
                    </td>
                    <td>{formatDate(demande.created_at)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          as={Link}
                          to={`/demandes/${demande.id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        {user?.role === 'admin' && demande.statut === 'en_attente' && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleAccepter(demande)}
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
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
          </Card.Body>
        </Card>
      )}

      {/* Modal création */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nouvelle Demande</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, machine_id: e.target.value, composant_id: '' }));
                      loadComposants(e.target.value);
                    }}
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
                  <Form.Label>Composant</Form.Label>
                  <Form.Select
                    value={formData.composant_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, composant_id: e.target.value }))}
                    disabled={!formData.machine_id}
                  >
                    <option value="">Aucun composant spécifique</option>
                    {composants.map(composant => (
                      <option key={composant.id} value={composant.id}>
                        {composant.nom} ({composant.reference})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type de demande *</Form.Label>
                  <Form.Select
                    value={formData.type_demande}
                    onChange={(e) => setFormData(prev => ({ ...prev, type_demande: e.target.value }))}
                    required
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="piece">Pièce</option>
                    <option value="reparation">Réparation</option>
                    <option value="inspection">Inspection</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priorité</Form.Label>
                  <Form.Select
                    value={formData.priorite}
                    onChange={(e) => setFormData(prev => ({ ...prev, priorite: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Justification</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.justification}
                    onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Quantité</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quantite_demandee}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantite_demandee: e.target.value }))}
                    min="1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Budget estimé (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.budget_estime}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_estime: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date souhaitée</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date_souhaite}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_souhaite: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
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
              {submitting ? <Spinner size="sm" /> : 'Créer la demande'}
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