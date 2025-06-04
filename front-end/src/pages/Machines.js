// src/pages/Machines.js - Version simplifiée
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Modal, Form, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Machines = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [filters, setFilters] = useState({ search: '', statut: '' });
  const [formData, setFormData] = useState({
    nom: '', numero_serie: '', modele: 'TELSOSPLICE TS3',
    description: '', localisation: '', statut: 'actif',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMachines();
  }, [filters]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMachines(filters);
      setMachines(response.data.data.data || response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.createMachine(formData);
      toast.success('Machine créée avec succès');
      setShowModal(false);
      resetForm();
      loadMachines();
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
      toast.error('Erreur lors du chargement de l\'image');
    }
  };

  const handleDeleteImage = async (machineId) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await apiService.deleteMachineImage(machineId);
      toast.success('Image supprimée');
      loadMachines();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '', numero_serie: '', modele: 'TELSOSPLICE TS3',
      description: '', localisation: '', statut: 'actif',
      image: null
    });
    setImagePreview(null);
  };

  const StatutBadge = ({ statut }) => (
    <Badge bg={statut === 'actif' ? 'success' : statut === 'maintenance' ? 'warning' : 'secondary'}>
      {statut}
    </Badge>
  );

  const MachineCard = ({ machine }) => (
    <Col lg={4} md={6} className="mb-4">
      <Card className="h-100">
        <div style={{ height: '200px', overflow: 'hidden' }}>
          {machine.has_image ? (
            <div className="position-relative">
              <Card.Img src={machine.image_url} style={{ height: '200px', objectFit: 'cover' }} />
              {user?.role === 'admin' && (
                <Button
                  variant="danger" size="sm"
                  className="position-absolute top-0 end-0 m-2"
                  onClick={() => handleDeleteImage(machine.id)}
                >
                  <i className="fas fa-trash"></i>
                </Button>
              )}
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-center bg-light h-100">
              <i className="fas fa-cogs fa-3x text-muted"></i>
            </div>
          )}
        </div>
        <Card.Body>
          <Card.Title>{machine.nom}</Card.Title>
          <Card.Subtitle className="mb-2 text-primary">{machine.numero_serie}</Card.Subtitle>
          <div className="mb-2">
            <StatutBadge statut={machine.statut} />
          </div>
          <p><strong>Localisation:</strong> {machine.localisation || '-'}</p>
          <div className="d-flex gap-2">
            <Button as={Link} to={`/machines/${machine.id}`} variant="primary" size="sm">
              Détails
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-cogs me-2"></i>Machines</h2>
            <div className="d-flex gap-2">
              <div className="btn-group">
                <Button
                  variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <i className="fas fa-th-large"></i>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <i className="fas fa-list"></i>
                </Button>
              </div>
              {user?.role === 'admin' && (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <i className="fas fa-plus me-2"></i>Nouvelle Machine
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="maintenance">Maintenance</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={() => setFilters({ search: '', statut: '' })}>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste */}
      {machines.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-cogs fa-3x text-muted mb-3"></i>
            <h4>Aucune machine</h4>
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                Créer une machine
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : viewMode === 'cards' ? (
        <Row>
          {machines.map(machine => <MachineCard key={machine.id} machine={machine} />)}
        </Row>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table hover>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th>Localisation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(machine => (
                  <tr key={machine.id}>
                    <td>
                      {machine.has_image ? (
                        <img src={machine.image_url} width="50" height="50" className="rounded" />
                      ) : (
                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="fas fa-cogs"></i>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-bold">{machine.nom}</div>
                      <small className="text-muted">{machine.numero_serie}</small>
                    </td>
                    <td><StatutBadge statut={machine.statut} /></td>
                    <td>{machine.localisation || '-'}</td>
                    <td>
                      <Button as={Link} to={`/machines/${machine.id}`} variant="outline-primary" size="sm">
                        <i className="fas fa-eye"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Modal création */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Nouvelle Machine</Modal.Title>
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
                  <Form.Label>Numéro de série *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Modèle</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Localisation</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.localisation}
                    onChange={(e) => setFormData(prev => ({ ...prev, localisation: e.target.value }))}
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
              {submitting ? <Spinner size="sm" /> : 'Créer'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Machines;