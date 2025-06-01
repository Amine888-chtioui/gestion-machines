// src/pages/Types.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Alert, Spinner, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Types = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    actif: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 15
  });
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#007bff',
    actif: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTypes();
  }, [filters, pagination.currentPage]);

  const loadTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      console.log('Chargement des types avec params:', params);
      const response = await apiService.getTypes(params);
      console.log('Réponse API types:', response.data);
      
      if (response.data && response.data.data) {
        setTypes(response.data.data.data || response.data.data);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        }));
      } else {
        setTypes([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
      setError('Erreur lors du chargement des types');
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      actif: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingType) {
        await apiService.updateType(editingType.id, formData);
        toast.success('Type mis à jour avec succès');
      } else {
        await apiService.createType(formData);
        toast.success('Type créé avec succès');
      }
      setShowModal(false);
      resetForm();
      setEditingType(null);
      loadTypes();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(editingType ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActif = async (typeId) => {
    try {
      await apiService.toggleTypeActif(typeId);
      toast.success('Statut mis à jour avec succès');
      loadTypes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce type ?')) {
      return;
    }

    try {
      await apiService.deleteType(typeId);
      toast.success('Type supprimé avec succès');
      loadTypes();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      if (error.response?.status === 409) {
        toast.error('Impossible de supprimer ce type car il est utilisé par des composants');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      couleur: '#007bff',
      actif: true
    });
  };

  const getActifBadge = (actif) => {
    return actif ? (
      <Badge bg="success">Actif</Badge>
    ) : (
      <Badge bg="secondary">Inactif</Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const items = [];
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    // Première page
    if (currentPage > 1) {
      items.push(
        <Pagination.Item key="first" onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
    }

    // Pages autour de la page actuelle
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Dernière page
    if (currentPage < totalPages) {
      items.push(
        <Pagination.Item key="last" onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center">
        <Pagination.Prev 
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        />
        {items}
        <Pagination.Next 
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        />
      </Pagination>
    );
  };

  if (loading && types.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="types-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-tags me-2"></i>
                Gestion des Types
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} type(s) trouvé(s)
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                variant="primary" 
                onClick={() => openModal()}
                className="d-flex align-items-center"
              >
                <i className="fas fa-plus me-2"></i>
                Nouveau Type
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Rechercher un type..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={filters.actif}
                onChange={(e) => handleFilterChange('actif', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" onClick={clearFilters} title="Effacer les filtres">
                <i className="fas fa-times me-2"></i>
                Effacer
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des types */}
      <Card>
        <Card.Body className="p-0">
          {types.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-tags fa-3x text-muted mb-3"></i>
              <h4>Aucun type trouvé</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucun type ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier type'
                }
              </p>
              {Object.values(filters).some(filter => filter !== '') ? (
                <Button variant="outline-primary" onClick={clearFilters}>
                  <i className="fas fa-times me-2"></i>
                  Effacer les filtres
                </Button>
              ) : user?.role === 'admin' && (
                <Button variant="primary" onClick={() => openModal()}>
                  <i className="fas fa-plus me-2"></i>
                  Créer un type
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
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
                          {getActifBadge(type.actif)}
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
                          <div className="d-flex gap-1">
                            {user?.role === 'admin' && (
                              <>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  title="Modifier"
                                  onClick={() => openModal(type)}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                                
                                <Button
                                  variant={type.actif ? "outline-warning" : "outline-success"}
                                  size="sm"
                                  title={type.actif ? "Désactiver" : "Activer"}
                                  onClick={() => handleToggleActif(type.id)}
                                >
                                  <i className={`fas ${type.actif ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </Button>

                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  title="Supprimer"
                                  onClick={() => handleDelete(type.id)}
                                  disabled={type.composants_count > 0}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                  <div className="text-muted">
                    Affichage de {((pagination.currentPage - 1) * pagination.perPage) + 1} à{' '}
                    {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur {pagination.total} types
                  </div>
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création/modification */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingType ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingType ? 'Modifier le type' : 'Nouveau type'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Nom <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    placeholder="Nom du type"
                    maxLength={100}
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
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Description du type (optionnel)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Couleur</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="color"
                      name="couleur"
                      value={formData.couleur}
                      onChange={handleFormChange}
                      style={{ width: '60px', height: '38px' }}
                    />
                    <Form.Control
                      type="text"
                      name="couleur"
                      value={formData.couleur}
                      onChange={handleFormChange}
                      placeholder="#007bff"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                  <Form.Text className="text-muted">
                    Couleur d'affichage du type en format hexadécimal
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <div className="pt-2">
                    <Form.Check
                      type="checkbox"
                      name="actif"
                      checked={formData.actif}
                      onChange={handleFormChange}
                      label="Type actif"
                    />
                  </div>
                  <Form.Text className="text-muted">
                    Les types inactifs ne peuvent pas être utilisés pour de nouveaux composants
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  {editingType ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingType ? 'Mettre à jour' : 'Créer'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Types;