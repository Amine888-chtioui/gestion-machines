// src/pages/Composants.js - Version optimisée
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner, Image } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Composants = () => {
  const { user } = useAuth();
  const [composants, setComposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingComposant, setEditingComposant] = useState(null);
  const [machines, setMachines] = useState([]);
  const [types, setTypes] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [filters, setFilters] = useState({
    search: '', machine_id: '', type_id: '', statut: ''
  });
  const [formData, setFormData] = useState({
    nom: '', reference: '', machine_id: '', type_id: '', description: '',
    statut: 'bon', quantite: 1, prix_unitaire: '', fournisseur: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComposants();
    loadMachines();
    loadTypes();
  }, [filters]);

  const loadComposants = async () => {
    try {
      setLoading(true);
      const response = await apiService.getComposants(filters);
      setComposants(response.data.data.data || response.data.data);
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

  const loadTypes = async () => {
    try {
      const response = await apiService.getTypesActifs();
      setTypes(response.data.data || []);
    } catch (error) {
      console.error('Erreur types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingComposant) {
        await apiService.updateComposant(editingComposant.id, formData);
        toast.success('Composant mis à jour');
      } else {
        await apiService.createComposant(formData);
        toast.success('Composant créé');
      }
      setShowModal(false);
      resetForm();
      loadComposants();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = apiService.validateImage(file);
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    try {
      const preview = await apiService.createImagePreview(file);
      setImagePreview(preview);
      setFormData(prev => ({ ...prev, image: file }));
    } catch (error) {
      toast.error('Erreur image');
    }
  };

  const handleDeleteImage = async (composantId) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await apiService.deleteComposantImage(composantId);
      toast.success('Image supprimée');
      loadComposants();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  const openModal = (composant = null) => {
    if (composant) {
      setEditingComposant(composant);
      setFormData({
        nom: composant.nom,
        reference: composant.reference,
        machine_id: composant.machine_id,
        type_id: composant.type_id,
        description: composant.description || '',
        statut: composant.statut,
        quantite: composant.quantite,
        prix_unitaire: composant.prix_unitaire || '',
        fournisseur: composant.fournisseur || '',
        image: null
      });
    } else {
      setEditingComposant(null);
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '', reference: '', machine_id: '', type_id: '', description: '',
      statut: 'bon', quantite: 1, prix_unitaire: '', fournisseur: '',
      image: null
    });
    setImagePreview(null);
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

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const ComposantCard = ({ composant }) => (
    <Col lg={4} md={6} className="mb-4">
      <Card className="h-100">
        <div style={{ height: '180px', overflow: 'hidden' }} className="position-relative">
          {composant.has_image ? (
            <>
              <Card.Img src={composant.image_url} style={{ height: '180px', objectFit: 'cover' }} />
              {user?.role === 'admin' && (
                <Button
                  variant="danger" size="sm"
                  className="position-absolute top-0 end-0 m-2"
                  onClick={() => handleDeleteImage(composant.id)}
                >
                  <i className="fas fa-trash"></i>
                </Button>
              )}
            </>
          ) : (
            <div className="d-flex align-items-center justify-content-center bg-light h-100">
              <i className="fas fa-puzzle-piece fa-3x text-muted"></i>
            </div>
          )}
          <div className="position-absolute top-0 start-0 m-2">
            <StatutBadge statut={composant.statut} />
          </div>
        </div>
        <Card.Body>
          <Card.Title className="h6">{composant.nom}</Card.Title>
          <Card.Subtitle className="text-primary small mb-2">{composant.reference}</Card.Subtitle>
          <p className="small mb-1"><strong>Machine:</strong> {composant.machine?.nom}</p>
          <p className="small mb-1"><strong>Type:</strong> {composant.type?.nom}</p>
          <p className="small mb-2"><strong>Prix:</strong> {formatPrice(composant.prix_unitaire)}</p>
          <div className="d-flex gap-2">
            <Button as={Link} to={`/composants/${composant.id}`} variant="primary" size="sm">
              Détails
            </Button>
            {user?.role === 'admin' && (
              <Button variant="outline-warning" size="sm" onClick={() => openModal(composant)}>
                <i className="fas fa-edit"></i>
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Chargement des composants...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-puzzle-piece me-2"></i>Composants</h2>
            <div className="d-flex gap-2">
              <div className="btn-group">
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <i className="fas fa-list"></i>
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <i className="fas fa-th-large"></i>
                </Button>
              </div>
              {user?.role === 'admin' && (
                <Button variant="primary" onClick={() => openModal()}>
                  <i className="fas fa-plus me-2"></i>Nouveau Composant
                </Button>
              )}
            </div>
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
            <Col md={3}>
              <Form.Select
                value={filters.machine_id}
                onChange={(e) => setFilters(prev => ({ ...prev, machine_id: e.target.value }))}
              >
                <option value="">Toutes les machines</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>{machine.nom}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.type_id}
                onChange={(e) => setFilters(prev => ({ ...prev, type_id: e.target.value }))}
              >
                <option value="">Tous les types</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>{type.nom}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="bon">Bon</option>
                <option value="usure">Usure</option>
                <option value="defaillant">Défaillant</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={() => setFilters({ search: '', machine_id: '', type_id: '', statut: '' })}>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste */}
      {composants.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
            <h4>Aucun composant</h4>
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => openModal()}>
                Créer un composant
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : viewMode === 'cards' ? (
        <Row>
          {composants.map(composant => <ComposantCard key={composant.id} composant={composant} />)}
        </Row>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table hover>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom / Référence</th>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {composants.map(composant => (
                  <tr key={composant.id}>
                    <td>
                      {composant.has_image ? (
                        <img src={composant.image_url} width="50" height="50" className="rounded" />
                      ) : (
                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="fas fa-puzzle-piece"></i>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-bold">{composant.nom}</div>
                      <small className="text-muted">{composant.reference}</small>
                    </td>
                    <td>{composant.machine?.nom}</td>
                    <td>
                      {composant.type && (
                        <Badge bg="secondary" style={{ backgroundColor: composant.type.couleur }}>
                          {composant.type.nom}
                        </Badge>
                      )}
                    </td>
                    <td><StatutBadge statut={composant.statut} /></td>
                    <td>{formatPrice(composant.prix_unitaire)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button as={Link} to={`/composants/${composant.id}`} variant="outline-primary" size="sm">
                          <i className="fas fa-eye"></i>
                        </Button>
                        {user?.role === 'admin' && (
                          <Button variant="outline-warning" size="sm" onClick={() => openModal(composant)}>
                            <i className="fas fa-edit"></i>
                          </Button>
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

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingComposant ? 'Modifier' : 'Nouveau'} Composant</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Image</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
                    {imagePreview && (
                      <img src={imagePreview} width="60" height="60" className="rounded" />
                    )}
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Référence *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionnez une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>{machine.nom}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, type_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionnez un type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>{type.nom}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={formData.statut}
                    onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value }))}
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
                  <Form.Label>Quantité *</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.quantite}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantite: e.target.value }))}
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
                    value={formData.prix_unitaire}
                    onChange={(e) => setFormData(prev => ({ ...prev, prix_unitaire: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => setFormData(prev => ({ ...prev, fournisseur: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
              {submitting ? <Spinner size="sm" /> : (editingComposant ? 'Modifier' : 'Créer')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Composants;