// src/pages/Types.js - Version optimisée
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Types = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [filters, setFilters] = useState({ search: '', actif: '' });
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#007bff',
    actif: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTypes();
  }, [filters]);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTypes(filters);
      setTypes(response.data.data.data || response.data.data);
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
      if (editingType) {
        await apiService.updateType(editingType.id, formData);
        toast.success('Type mis à jour');
      } else {
        await apiService.createType(formData);
        toast.success('Type créé');
      }
      setShowModal(false);
      resetForm();
      setEditingType(null);
      loadTypes();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActif = async (typeId) => {
    try {
      await apiService.toggleTypeActif(typeId);
      toast.success('Statut mis à jour');
      loadTypes();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Supprimer ce type ?')) return;
    try {
      await apiService.deleteType(typeId);
      toast.success('Type supprimé');
      loadTypes();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Impossible de supprimer ce type car il est utilisé');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const openModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        nom: type.nom,
        description: type.description || '',
        couleur: type.couleur || '#007bff',
        actif: type.actif
      });
    } else {
      setEditingType(null);
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      couleur: '#007bff',
      actif: true
    });
  };

  const ActifBadge = ({ actif }) => (
    <Badge bg={actif ? 'success' : 'secondary'}>
      {actif ? 'Actif' : 'Inactif'}
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
        <p className="mt-3">Chargement des types...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-tags me-2"></i>Types</h2>
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => openModal()}>
                <i className="fas fa-plus me-2"></i>Nouveau Type
              </Button>
            )}
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
                placeholder="Rechercher un type..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.actif}
                onChange={(e) => setFilters(prev => ({ ...prev, actif: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={() => setFilters({ search: '', actif: '' })}>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste */}
      {types.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-tags fa-3x text-muted mb-3"></i>
            <h4>Aucun type trouvé</h4>
            {user?.role === 'admin' && (
              <Button variant="primary" onClick={() => openModal()}>
                Créer un type
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table hover>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Couleur</th>
                  <th>Statut</th>
                  <th>Composants</th>
                  <th>Créé le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => (
                  <tr key={type.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div
                          className="me-2"
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: type.couleur,
                            borderRadius: '4px',
                            border: '1px solid #dee2e6'
                          }}
                        ></div>
                        <div className="fw-bold">{type.nom}</div>
                      </div>
                    </td>
                    <td>
                      {type.description ? (
                        <span className="text-muted">
                          {type.description.length > 50 
                            ? `${type.description.substring(0, 50)}...`
                            : type.description
                          }
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div
                          className="me-2"
                          style={{
                            width: '30px',
                            height: '20px',
                            backgroundColor: type.couleur,
                            borderRadius: '4px',
                            border: '1px solid #dee2e6'
                          }}
                        ></div>
                        <small className="text-muted">{type.couleur}</small>
                      </div>
                    </td>
                    <td>
                      <ActifBadge actif={type.actif} />
                    </td>
                    <td>
                      <Badge bg="info">
                        {type.composants_count || 0}
                      </Badge>
                    </td>
                    <td>
                      {formatDate(type.created_at)}
                    </td>
                    <td>
                      {user?.role === 'admin' && (
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openModal(type)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          
                          <Button
                            variant={type.actif ? "outline-warning" : "outline-success"}
                            size="sm"
                            onClick={() => handleToggleActif(type.id)}
                          >
                            <i className={`fas ${type.actif ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(type.id)}
                            disabled={type.composants_count > 0}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingType ? 'Modifier' : 'Nouveau'} Type
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Couleur</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="color"
                      value={formData.couleur}
                      onChange={(e) => setFormData(prev => ({ ...prev, couleur: e.target.value }))}
                      style={{ width: '60px', height: '38px' }}
                    />
                    <Form.Control
                      type="text"
                      value={formData.couleur}
                      onChange={(e) => setFormData(prev => ({ ...prev, couleur: e.target.value }))}
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <div className="pt-2">
                    <Form.Check
                      type="checkbox"
                      checked={formData.actif}
                      onChange={(e) => setFormData(prev => ({ ...prev, actif: e.target.checked }))}
                      label="Type actif"
                    />
                  </div>
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
                <Spinner size="sm" />
              ) : (
                editingType ? 'Mettre à jour' : 'Créer'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Types;