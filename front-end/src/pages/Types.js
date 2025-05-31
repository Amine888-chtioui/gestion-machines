// src/pages/Types.js - Version corrigée
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Badge, Modal, Form, Row, Col, 
  InputGroup, Dropdown, Spinner, Alert, Pagination 
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Types = () => {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    actif: ''
  });
  const [sortBy, setSortBy] = useState('nom');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#007bff',
    actif: true
  });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadTypes();
  }, [currentPage, filters, sortBy, sortOrder, searchTerm]);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters
      };

      const response = await apiService.getTypes(params);
      setTypes(response.data.data.data);
      setTotalPages(response.data.data.last_page);
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
      toast.error('Erreur lors du chargement des types');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      actif: ''
    });
    setSearchTerm('');
    setSortBy('nom');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormErrors({});
      await apiService.createType(formData);
      toast.success('Type créé avec succès');
      setShowCreateModal(false);
      resetForm();
      loadTypes();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast.error('Erreur lors de la création du type');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormErrors({});
      await apiService.updateType(selectedType.id, formData);
      toast.success('Type mis à jour avec succès');
      setShowEditModal(false);
      setSelectedType(null);
      resetForm();
      loadTypes();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast.error('Erreur lors de la mise à jour du type');
      }
    }
  };

  const handleToggleActif = async (id) => {
    try {
      await apiService.patch(`/types/${id}/toggle-actif`);
      toast.success('Statut du type mis à jour avec succès');
      loadTypes();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteType(selectedType.id);
      toast.success('Type supprimé avec succès');
      setShowDeleteModal(false);
      setSelectedType(null);
      loadTypes();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditModal = (type) => {
    setSelectedType(type);
    setFormData({
      nom: type.nom,
      description: type.description || '',
      couleur: type.couleur,
      actif: type.actif
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      couleur: '#007bff',
      actif: true
    });
    setFormErrors({});
  };

  const getStatutBadge = (actif) => {
    return actif ? (
      <Badge bg="success">Actif</Badge>
    ) : (
      <Badge bg="secondary">Inactif</Badge>
    );
  };

  // Couleurs prédéfinies pour faciliter la sélection
  const couleursPredefines = [
    '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', 
    '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
  ];

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-tags text-primary me-2"></i>
            Gestion des Types
          </h1>
          <p className="text-muted mb-0">
            {types.length} type(s) trouvé(s)
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus me-2"></i>
            Nouveau Type
          </Button>
        )}
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6} className="mb-3">
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher un type..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </InputGroup>
            </Col>
            <Col md={3} className="mb-3">
              <Form.Select
                value={filters.actif}
                onChange={(e) => handleFilterChange('actif', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs seulement</option>
                <option value="false">Inactifs seulement</option>
              </Form.Select>
            </Col>
            <Col md={2} className="mb-3">
              <Button
                variant="outline-secondary"
                onClick={resetFilters}
                title="Réinitialiser les filtres"
                className="w-100"
              >
                <i className="fas fa-times me-2"></i>
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table des types */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : types.length > 0 ? (
            <>
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('nom')}
                    >
                      Nom
                      {sortBy === 'nom' && (
                        <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Description</th>
                    <th>Couleur</th>
                    <th>Statut</th>
                    <th>Composants</th>
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
                          <span className="fw-bold">{type.nom}</span>
                        </div>
                      </td>
                      <td>
                        {type.description ? (
                          <span className="text-muted">
                            {type.description.length > 50 
                              ? `${type.description.substring(0, 50)}...` 
                              : type.description}
                          </span>
                        ) : (
                          <span className="text-muted fst-italic">Aucune description</span>
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
                          <code className="small">{type.couleur}</code>
                        </div>
                      </td>
                      <td>{getStatutBadge(type.actif)}</td>
                      <td>
                        <Badge bg="info">
                          {type.composants_count || 0}
                        </Badge>
                        {type.composants_count > 0 && (
                          <Link 
                            to={`/composants?type_id=${type.id}`} 
                            className="ms-2 small text-decoration-none"
                          >
                            Voir les composants
                          </Link>
                        )}
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="outline-secondary" 
                            size="sm"
                            id={`dropdown-${type.id}`}
                          >
                            <i className="fas fa-ellipsis-v"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item as={Link} to={`/types/${type.id}`}>
                              <i className="fas fa-eye me-2"></i>
                              Voir détails
                            </Dropdown.Item>
                            
                            {isAdmin && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => openEditModal(type)}>
                                  <i className="fas fa-edit me-2"></i>
                                  Modifier
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleToggleActif(type.id)}
                                >
                                  <i className={`fas ${type.actif ? 'fa-pause' : 'fa-play'} me-2`}></i>
                                  {type.actif ? 'Désactiver' : 'Activer'}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => {
                                    setSelectedType(type);
                                    setShowDeleteModal(true);
                                  }}
                                  disabled={type.composants_count > 0}
                                >
                                  <i className="fas fa-trash me-2"></i>
                                  Supprimer
                                  {type.composants_count > 0 && (
                                    <small className="d-block text-muted">
                                      (Impossible - composants associés)
                                    </small>
                                  )}
                                </Dropdown.Item>
                              </>
                            )}
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center p-3">
                  <Pagination>
                    <Pagination.First 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    />
                    <Pagination.Prev 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    />
                    
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      const page = currentPage <= 3 ? index + 1 : currentPage - 2 + index;
                      if (page <= totalPages) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    />
                    <Pagination.Last 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-tags fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Aucun type trouvé</h5>
              <p className="text-muted">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par créer votre premier type de composant'}
              </p>
              {isAdmin && !searchTerm && !Object.values(filters).some(f => f) && (
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Créer un type
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus text-primary me-2"></i>
            Nouveau Type
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Nom du type (ex: Moteur, Capteur, etc.)"
                isInvalid={!!formErrors.nom}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.nom?.[0]}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du type de composant..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Couleur</Form.Label>
              <div className="d-flex align-items-center mb-2">
                <Form.Control
                  type="color"
                  value={formData.couleur}
                  onChange={(e) => setFormData({...formData, couleur: e.target.value})}
                  style={{ width: '60px', height: '40px' }}
                  className="me-3"
                />
                <Form.Control
                  type="text"
                  value={formData.couleur}
                  onChange={(e) => setFormData({...formData, couleur: e.target.value})}
                  placeholder="#007bff"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-grow-1"
                />
              </div>
              
              {/* Couleurs prédéfinies */}
              <div className="mb-2">
                <small className="text-muted">Couleurs prédéfinies :</small>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {couleursPredefines.map((couleur) => (
                    <button
                      key={couleur}
                      type="button"
                      className={`btn p-1 ${formData.couleur === couleur ? 'border border-dark' : 'border'}`}
                      style={{ 
                        backgroundColor: couleur, 
                        width: '30px', 
                        height: '30px',
                        borderRadius: '4px'
                      }}
                      onClick={() => setFormData({...formData, couleur: couleur})}
                      title={couleur}
                    />
                  ))}
                </div>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Type actif"
                checked={formData.actif}
                onChange={(e) => setFormData({...formData, actif: e.target.checked})}
              />
              <Form.Text className="text-muted">
                Les types inactifs ne peuvent pas être assignés à de nouveaux composants
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              Créer le type
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de modification */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit text-primary me-2"></i>
            Modifier le Type
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Nom du type"
                isInvalid={!!formErrors.nom}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.nom?.[0]}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description du type de composant..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Couleur</Form.Label>
              <div className="d-flex align-items-center mb-2">
                <Form.Control
                  type="color"
                  value={formData.couleur}
                  onChange={(e) => setFormData({...formData, couleur: e.target.value})}
                  style={{ width: '60px', height: '40px' }}
                  className="me-3"
                />
                <Form.Control
                  type="text"
                  value={formData.couleur}
                  onChange={(e) => setFormData({...formData, couleur: e.target.value})}
                  placeholder="#007bff"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-grow-1"
                />
              </div>
              
              {/* Couleurs prédéfinies */}
              <div className="mb-2">
                <small className="text-muted">Couleurs prédéfinies :</small>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {couleursPredefines.map((couleur) => (
                    <button
                      key={couleur}
                      type="button"
                      className={`btn p-1 ${formData.couleur === couleur ? 'border border-dark' : 'border'}`}
                      style={{ 
                        backgroundColor: couleur, 
                        width: '30px', 
                        height: '30px',
                        borderRadius: '4px'
                      }}
                      onClick={() => setFormData({...formData, couleur: couleur})}
                      title={couleur}
                    />
                  ))}
                </div>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Type actif"
                checked={formData.actif}
                onChange={(e) => setFormData({...formData, actif: e.target.checked})}
              />
              <Form.Text className="text-muted">
                Les types inactifs ne peuvent pas être assignés à de nouveaux composants
              </Form.Text>
            </Form.Group>

            {selectedType?.composants_count > 0 && (
              <Alert variant="info">
                <Alert.Heading className="h6">
                  <i className="fas fa-info-circle me-2"></i>
                  Information
                </Alert.Heading>
                Ce type est utilisé par <strong>{selectedType.composants_count}</strong> composant(s). 
                Les modifications seront appliquées à tous les composants associés.
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              Mettre à jour
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de suppression */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Confirmer la suppression
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <Alert.Heading className="h6">Attention !</Alert.Heading>
            Êtes-vous sûr de vouloir supprimer le type <strong>{selectedType?.nom}</strong> ?
            <hr />
            <p className="mb-0">
              Cette action est irréversible et ne peut être effectuée que si aucun composant 
              n'utilise ce type.
            </p>
          </Alert>
          
          {selectedType?.composants_count > 0 && (
            <Alert variant="danger" className="mt-3">
              <strong>Impossible de supprimer !</strong><br />
              Ce type est utilisé par {selectedType.composants_count} composant(s). 
              Vous devez d'abord réassigner ces composants à un autre type.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={selectedType?.composants_count > 0}
          >
            <i className="fas fa-trash me-2"></i>
            Supprimer définitivement
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .table th {
          border-top: none;
          font-weight: 600;
          color: #495057;
          background-color: #f8f9fa;
        }

        .table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .dropdown-toggle::after {
          display: none;
        }

        .card {
          border-radius: 12px;
        }

        .btn {
          border-radius: 8px;
        }

        .form-control, .form-select {
          border-radius: 8px;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        /* Style pour les boutons de couleur */
        .btn-couleur {
          transition: all 0.2s ease;
        }

        .btn-couleur:hover {
          transform: scale(1.1);
        }

        .btn-couleur.selected {
          transform: scale(1.1);
          box-shadow: 0 0 0 2px #000;
        }

        /* Animation pour les cartes */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card {
          animation: fadeIn 0.3s ease-out;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 0.9rem;
          }
          
          .btn-group {
            flex-direction: column;
          }
          
          .couleurs-predefinies {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Types;