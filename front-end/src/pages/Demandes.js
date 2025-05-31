// src/pages/Demandes.js - Version corrigée
import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Badge, Modal, Form, Row, Col, 
  InputGroup, Dropdown, Spinner, Alert, Pagination 
} from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Demandes = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [demandes, setDemandes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [composants, setComposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    statut: searchParams.get('statut') || '',
    type_demande: '',
    priorite: '',
    machine_id: '',
    user_id: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTraiterModal, setShowTraiterModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [actionType, setActionType] = useState(''); // 'accepter' ou 'refuser'
  const [formData, setFormData] = useState({
    machine_id: '',
    composant_id: '',
    type_demande: 'maintenance',
    priorite: 'normale',
    titre: '',
    description: '',
    justification: '',
    quantite_demandee: '',
    budget_estime: '',
    date_souhaite: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [commentaireAdmin, setCommentaireAdmin] = useState('');

  const isAdmin = user?.role === 'admin';

  // Détecter si on doit ouvrir le modal de création
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [currentPage, filters, sortBy, sortOrder, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters
      };

      const [demandesResponse, machinesResponse] = await Promise.all([
        apiService.getDemandes(params),
        apiService.getMachinesActives()
      ]);

      setDemandes(demandesResponse.data.data.data);
      setTotalPages(demandesResponse.data.data.last_page);
      setMachines(machinesResponse.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Charger les composants quand une machine est sélectionnée
  const loadComposants = async (machineId) => {
    if (!machineId) {
      setComposants([]);
      return;
    }
    
    try {
      const response = await apiService.getComposants({ machine_id: machineId });
      setComposants(response.data.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement des composants:', error);
      setComposants([]);
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
      statut: '',
      type_demande: '',
      priorite: '',
      machine_id: '',
      user_id: ''
    });
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormErrors({});
      
      // Préparer les données du formulaire
      const submitData = {
        ...formData,
        quantite_demandee: formData.quantite_demandee ? parseInt(formData.quantite_demandee) : null,
        budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
        composant_id: formData.composant_id || null
      };

      await apiService.createDemande(submitData);
      toast.success('Demande créée avec succès');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        toast.error('Erreur lors de la création de la demande');
      }
    }
  };

  const handleTraiterDemande = async () => {
    try {
      if (actionType === 'accepter') {
        await apiService.accepterDemande(selectedDemande.id, commentaireAdmin);
        toast.success('Demande acceptée avec succès');
      } else if (actionType === 'refuser') {
        await apiService.refuserDemande(selectedDemande.id, commentaireAdmin);
        toast.success('Demande refusée avec succès');
      }
      
      setShowTraiterModal(false);
      setSelectedDemande(null);
      setActionType('');
      setCommentaireAdmin('');
      loadData();
    } catch (error) {
      toast.error('Erreur lors du traitement de la demande');
    }
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteDemande(selectedDemande.id);
      toast.success('Demande supprimée avec succès');
      setShowDeleteModal(false);
      setSelectedDemande(null);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      machine_id: '',
      composant_id: '',
      type_demande: 'maintenance',
      priorite: 'normale',
      titre: '',
      description: '',
      justification: '',
      quantite_demandee: '',
      budget_estime: '',
      date_souhaite: ''
    });
    setFormErrors({});
    setComposants([]);
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'en_attente': 'warning',
      'en_cours': 'info',
      'acceptee': 'success',
      'refusee': 'danger',
      'terminee': 'secondary'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{statut.replace('_', ' ')}</Badge>;
  };

  const getPrioriteBadge = (priorite) => {
    const variants = {
      'basse': 'success',
      'normale': 'info',
      'haute': 'warning',
      'critique': 'danger'
    };
    return <Badge bg={variants[priorite] || 'secondary'}>{priorite}</Badge>;
  };

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-file-alt text-primary me-2"></i>
            Gestion des Demandes
          </h1>
          <p className="text-muted mb-0">
            {demandes.length} demande(s) trouvée(s)
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fas fa-plus me-2"></i>
          Nouvelle Demande
        </Button>
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={3} className="mb-3">
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Rechercher une demande..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </InputGroup>
            </Col>
            <Col md={2} className="mb-3">
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="acceptee">Acceptée</option>
                <option value="refusee">Refusée</option>
                <option value="terminee">Terminée</option>
              </Form.Select>
            </Col>
            <Col md={2} className="mb-3">
              <Form.Select
                value={filters.type_demande}
                onChange={(e) => handleFilterChange('type_demande', e.target.value)}
              >
                <option value="">Tous les types</option>
                <option value="maintenance">Maintenance</option>
                <option value="piece">Pièce</option>
                <option value="reparation">Réparation</option>
                <option value="inspection">Inspection</option>
              </Form.Select>
            </Col>
            <Col md={2} className="mb-3">
              <Form.Select
                value={filters.priorite}
                onChange={(e) => handleFilterChange('priorite', e.target.value)}
              >
                <option value="">Toutes les priorités</option>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </Form.Select>
            </Col>
            <Col md={2} className="mb-3">
              <Form.Select
                value={filters.machine_id}
                onChange={(e) => handleFilterChange('machine_id', e.target.value)}
              >
                <option value="">Toutes les machines</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={1} className="mb-3">
              <Button
                variant="outline-secondary"
                onClick={resetFilters}
                title="Réinitialiser les filtres"
              >
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table des demandes */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : demandes.length > 0 ? (
            <>
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('numero_demande')}
                    >
                      Numéro
                      {sortBy === 'numero_demande' && (
                        <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Titre</th>
                    {isAdmin && <th>Utilisateur</th>}
                    <th>Machine</th>
                    <th>Type</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('created_at')}
                    >
                      Date
                      {sortBy === 'created_at' && (
                        <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((demande) => (
                    <tr key={demande.id}>
                      <td>
                        <Link 
                          to={`/demandes/${demande.id}`}
                          className="fw-bold text-decoration-none"
                        >
                          {demande.numero_demande}
                        </Link>
                      </td>
                      <td>
                        <div>
                          {demande.titre}
                          {demande.description && (
                            <div className="small text-muted">
                              {demande.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="fas fa-user-circle text-muted me-2"></i>
                            {demande.user?.name}
                          </div>
                        </td>
                      )}
                      <td>
                        <Link to={`/machines/${demande.machine?.id}`} className="text-decoration-none">
                          <i className="fas fa-cog text-muted me-1"></i>
                          {demande.machine?.nom}
                        </Link>
                      </td>
                      <td>
                        <Badge bg="secondary">{demande.type_demande}</Badge>
                      </td>
                      <td>{getPrioriteBadge(demande.priorite)}</td>
                      <td>{getStatutBadge(demande.statut)}</td>
                      <td>
                        <small className="text-muted">
                          {new Date(demande.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                      </td>
                      <td>
                        <Dropdown>
                          <Dropdown.Toggle 
                            variant="outline-secondary" 
                            size="sm"
                            id={`dropdown-${demande.id}`}
                          >
                            <i className="fas fa-ellipsis-v"></i>
                          </Dropdown.Toggle>

                          <Dropdown.Menu>
                            <Dropdown.Item as={Link} to={`/demandes/${demande.id}`}>
                              <i className="fas fa-eye me-2"></i>
                              Voir détails
                            </Dropdown.Item>
                            
                            {/* Actions pour admin */}
                            {isAdmin && demande.statut === 'en_attente' && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Header>Actions administrateur</Dropdown.Header>
                                <Dropdown.Item 
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setActionType('accepter');
                                    setShowTraiterModal(true);
                                  }}
                                >
                                  <i className="fas fa-check text-success me-2"></i>
                                  Accepter
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setActionType('refuser');
                                    setShowTraiterModal(true);
                                  }}
                                >
                                  <i className="fas fa-times text-danger me-2"></i>
                                  Refuser
                                </Dropdown.Item>
                              </>
                            )}
                            
                            {/* Actions pour utilisateur (ses propres demandes en attente) */}
                            {(!isAdmin && demande.user_id === user?.id && demande.statut === 'en_attente') && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  <i className="fas fa-trash me-2"></i>
                                  Supprimer
                                </Dropdown.Item>
                              </>
                            )}

                            {/* Actions pour admin - suppression */}
                            {isAdmin && (
                              <>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => {
                                    setSelectedDemande(demande);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  <i className="fas fa-trash me-2"></i>
                                  Supprimer
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
              <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Aucune demande trouvée</h5>
              <p className="text-muted">
                {searchTerm || Object.values(filters).some(f => f) 
                  ? 'Essayez de modifier vos critères de recherche' 
                  : 'Commencez par créer votre première demande'}
              </p>
              {!searchTerm && !Object.values(filters).some(f => f) && (
                <Button 
                  variant="primary" 
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Créer une demande
                </Button>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus text-primary me-2"></i>
            Nouvelle Demande
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => {
                      const machineId = e.target.value;
                      setFormData({...formData, machine_id: machineId, composant_id: ''});
                      loadComposants(machineId);
                    }}
                    isInvalid={!!formErrors.machine_id}
                  >
                    <option value="">Sélectionner une machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.nom} - {machine.numero_serie}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.machine_id?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Composant (optionnel)</Form.Label>
                  <Form.Select
                    value={formData.composant_id}
                    onChange={(e) => setFormData({...formData, composant_id: e.target.value})}
                    disabled={!formData.machine_id}
                  >
                    <option value="">Sélectionner un composant</option>
                    {composants.map(composant => (
                      <option key={composant.id} value={composant.id}>
                        {composant.nom} - {composant.reference}
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.machine_id && (
                    <Form.Text className="text-muted">
                      Sélectionnez d'abord une machine
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type de demande *</Form.Label>
                  <Form.Select
                    value={formData.type_demande}
                    onChange={(e) => setFormData({...formData, type_demande: e.target.value})}
                    isInvalid={!!formErrors.type_demande}
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="piece">Pièce</option>
                    <option value="reparation">Réparation</option>
                    <option value="inspection">Inspection</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.type_demande?.[0]}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priorité</Form.Label>
                  <Form.Select
                    value={formData.priorite}
                    onChange={(e) => setFormData({...formData, priorite: e.target.value})}
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Titre *</Form.Label>
              <Form.Control
                type="text"
                value={formData.titre}
                onChange={(e) => setFormData({...formData, titre: e.target.value})}
                placeholder="Titre de la demande"
                isInvalid={!!formErrors.titre}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.titre?.[0]}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez en détail votre demande"
                isInvalid={!!formErrors.description}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.description?.[0]}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Justification</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.justification}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
                placeholder="Justifiez pourquoi cette demande est nécessaire"
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Quantité demandée</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.quantite_demandee}
                    onChange={(e) => setFormData({...formData, quantite_demandee: e.target.value})}
                    placeholder="1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget estimé (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_estime}
                    onChange={(e) => setFormData({...formData, budget_estime: e.target.value})}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Date souhaitée</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date_souhaite}
                    onChange={(e) => setFormData({...formData, date_souhaite: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              Créer la demande
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de traitement (accepter/refuser) */}
      <Modal show={showTraiterModal} onHide={() => setShowTraiterModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className={actionType === 'accepter' ? 'text-success' : 'text-danger'}>
            <i className={`fas ${actionType === 'accepter' ? 'fa-check' : 'fa-times'} me-2`}></i>
            {actionType === 'accepter' ? 'Accepter' : 'Refuser'} la demande
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Êtes-vous sûr de vouloir <strong>{actionType}</strong> la demande{' '}
            <strong>{selectedDemande?.numero_demande}</strong> ?
          </p>
          
          <Form.Group>
            <Form.Label>
              Commentaire {actionType === 'refuser' ? '(requis)' : '(optionnel)'}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={commentaireAdmin}
              onChange={(e) => setCommentaireAdmin(e.target.value)}
              placeholder={`Ajoutez un commentaire pour ${actionType === 'accepter' ? 'expliquer les prochaines étapes' : 'expliquer les raisons du refus'}`}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTraiterModal(false)}>
            Annuler
          </Button>
          <Button 
            variant={actionType === 'accepter' ? 'success' : 'danger'} 
            onClick={handleTraiterDemande}
            disabled={actionType === 'refuser' && !commentaireAdmin.trim()}
          >
            <i className={`fas ${actionType === 'accepter' ? 'fa-check' : 'fa-times'} me-2`}></i>
            {actionType === 'accepter' ? 'Accepter' : 'Refuser'} définitivement
          </Button>
        </Modal.Footer>
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
            Êtes-vous sûr de vouloir supprimer la demande <strong>{selectedDemande?.numero_demande}</strong> ?
            <hr />
            <p className="mb-0">
              Cette action est irréversible.
            </p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <i className="fas fa-trash me-2"></i>
            Supprimer définitivement
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Demandes;