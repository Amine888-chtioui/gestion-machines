import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner, Image, Alert } from 'react-bootstrap';
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
  const [formErrors, setFormErrors] = useState({});

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
      toast.error('Erreur lors du chargement des composants');
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

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.reference.trim()) {
      newErrors.reference = 'La référence est requise';
    }

    if (!formData.machine_id) {
      newErrors.machine_id = 'La machine est requise';
    }

    if (!formData.type_id) {
      newErrors.type_id = 'Le type est requis';
    }

    // Description optionnelle - seulement vérifier la longueur minimale si remplie
    if (formData.description.trim() && formData.description.trim().length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères si remplie';
    }

    if (!formData.quantite || formData.quantite < 1) {
      newErrors.quantite = 'La quantité doit être au moins 1';
    }

    // Validation de l'image si présente
    if (formData.image) {
      const validation = apiService.validateImage(formData.image);
      if (!validation.valid) {
        newErrors.image = validation.errors.join(', ');
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation du formulaire
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      
      // Ajouter tous les champs requis
      submitData.append('nom', formData.nom.trim());
      submitData.append('reference', formData.reference.trim());
      submitData.append('machine_id', formData.machine_id);
      submitData.append('type_id', formData.type_id);
      submitData.append('description', formData.description.trim());
      submitData.append('statut', formData.statut);
      submitData.append('quantite', formData.quantite);
      
      // Champs optionnels
      if (formData.prix_unitaire) {
        submitData.append('prix_unitaire', formData.prix_unitaire);
      }
      if (formData.fournisseur) {
        submitData.append('fournisseur', formData.fournisseur.trim());
      }
      if (formData.description.trim()) {
        submitData.append('description', formData.description.trim());
      }
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (editingComposant) {
        await apiService.updateComposant(editingComposant.id, submitData);
        toast.success('Composant mis à jour avec succès');
      } else {
        await apiService.createComposant(submitData);
        toast.success('Composant créé avec succès');
      }
      
      setShowModal(false);
      resetForm();
      loadComposants();
    } catch (error) {
      console.error('Erreur:', error);
      
      // Gestion des erreurs de validation du serveur
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        Object.values(serverErrors).flat().forEach(err => toast.error(err));
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
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
      
      // Effacer l'erreur d'image si elle existe
      if (formErrors.image) {
        setFormErrors(prev => ({ ...prev, image: '' }));
      }
    } catch (error) {
      toast.error('Erreur lors du traitement de l\'image');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce composant ?')) return;
    try {
      await apiService.deleteComposant(id);
      toast.success('Composant supprimé');
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
      setImagePreview(composant.image_url || null);
    } else {
      setEditingComposant(null);
      resetForm();
    }
    setFormErrors({});
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '', reference: '', machine_id: '', type_id: '', description: '',
      statut: 'bon', quantite: 1, prix_unitaire: '', fournisseur: '',
      image: null
    });
    setImagePreview(null);
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
            <Image 
              src={composant.image_url} 
              className="w-100 h-100" 
              style={{ objectFit: 'cover' }} 
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 bg-light">
              <i className="fas fa-cog fa-3x text-muted"></i>
            </div>
          )}
          <div className="position-absolute top-0 end-0 p-2">
            <StatutBadge statut={composant.statut} />
          </div>
        </div>
        <Card.Body>
          <Card.Title className="h6">{composant.nom}</Card.Title>
          <Card.Text className="small text-muted mb-2">
            Réf: {composant.reference}
          </Card.Text>
          <Card.Text className="small">
            <strong>Machine:</strong> {composant.machine?.nom}<br/>
            <strong>Type:</strong> {composant.type?.nom}<br/>
            <strong>Quantité:</strong> {composant.quantite}<br/>
            <strong>Prix:</strong> {formatPrice(composant.prix_unitaire)}
          </Card.Text>
        </Card.Body>
        <Card.Footer className="bg-transparent">
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-primary" as={Link} to={`/composants/${composant.id}`}>
              <i className="fas fa-eye"></i>
            </Button>
            {user?.role === 'admin' && (
              <>
                <Button size="sm" variant="outline-secondary" onClick={() => openModal(composant)}>
                  <i className="fas fa-edit"></i>
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(composant.id)}>
                  <i className="fas fa-trash"></i>
                </Button>

              </>
            )}
          </div>
        </Card.Footer>
      </Card>
    </Col>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3">Chargement des composants...</div>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Composants</h1>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            <i className={`fas ${viewMode === 'table' ? 'fa-th' : 'fa-table'}`}></i>
          </Button>
          {user?.role === 'admin' && (
            <Button variant="primary" onClick={() => openModal()}>
              <i className="fas fa-plus me-2"></i>Nouveau Composant
            </Button>
          )}
        </div>
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
                value={filters.machine_id}
                onChange={(e) => setFilters(prev => ({ ...prev, machine_id: e.target.value }))}
              >
                <option value="">Toutes les machines</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>{machine.nom}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
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
            <Col md={3}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="bon">Bon</option>
                <option value="usure">Usure</option>
                <option value="defaillant">Défaillant</option>
                <option value="remplace">Remplacé</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Contenu */}
      {viewMode === 'cards' ? (
        <Row>
          {composants.map(composant => (
            <ComposantCard key={composant.id} composant={composant} />
          ))}
        </Row>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Nom</th>
                  <th>Référence</th>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Quantité</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {composants.map(composant => (
                  <tr key={composant.id}>
                    <td>
                      {composant.has_image ? (
                        <Image 
                          src={composant.image_url} 
                          width="50" 
                          height="50" 
                          className="rounded" 
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="fas fa-cog text-muted"></i>
                        </div>
                      )}
                    </td>
                    <td>{composant.nom}</td>
                    <td>{composant.reference}</td>
                    <td>{composant.machine?.nom}</td>
                    <td>{composant.type?.nom}</td>
                    <td><StatutBadge statut={composant.statut} /></td>
                    <td>{composant.quantite}</td>
                    <td>{formatPrice(composant.prix_unitaire)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" as={Link} to={`/composants/${composant.id}`}>
                          <i className="fas fa-eye"></i>
                        </Button>
                        {user?.role === 'admin' && (
                          <>
                            <Button size="sm" variant="outline-secondary" onClick={() => openModal(composant)}>
                              <i className="fas fa-edit"></i>
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

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingComposant ? 'Modifier' : 'Nouveau'} Composant
          </Modal.Title>
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
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Image</Form.Label>
                  <div className="d-flex gap-3 align-items-center">
                    <Form.Control 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      isInvalid={!!formErrors.image}
                    />
                    {imagePreview && (
                      <div className="position-relative">
                        <img src={imagePreview} width="60" height="60" className="rounded" style={{ objectFit: 'cover' }} />
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="position-absolute top-0 end-0"
                          onClick={() => {
                            setImagePreview(null);
                            setFormData(prev => ({ ...prev, image: null }));
                          }}
                          style={{ transform: 'translate(50%, -50%)' }}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </div>
                  {formErrors.image && (
                    <div className="text-danger small mt-1">{formErrors.image}</div>
                  )}
                  <Form.Text className="text-muted">
                    Formats acceptés: JPG, PNG, GIF (max 5MB)
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nom *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleFieldChange('nom', e.target.value)}
                    isInvalid={!!formErrors.nom}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.nom}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Référence *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.reference}
                    onChange={(e) => handleFieldChange('reference', e.target.value)}
                    isInvalid={!!formErrors.reference}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.reference}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Machine *</Form.Label>
                  <Form.Select
                    value={formData.machine_id}
                    onChange={(e) => handleFieldChange('machine_id', e.target.value)}
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
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type_id}
                    onChange={(e) => handleFieldChange('type_id', e.target.value)}
                    isInvalid={!!formErrors.type_id}
                    required
                  >
                    <option value="">Sélectionnez un type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>{type.nom}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.type_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Statut</Form.Label>
                  <Form.Select
                    value={formData.statut}
                    onChange={(e) => handleFieldChange('statut', e.target.value)}
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
                    onChange={(e) => handleFieldChange('quantite', e.target.value)}
                    min="1"
                    isInvalid={!!formErrors.quantite}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.quantite}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Prix unitaire (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.prix_unitaire}
                    onChange={(e) => handleFieldChange('prix_unitaire', e.target.value)}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.fournisseur}
                    onChange={(e) => handleFieldChange('fournisseur', e.target.value)}
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
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    isInvalid={!!formErrors.description}
                    placeholder="Décrivez le composant en détail... (optionnel)"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.description}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Optionnel
                  </Form.Text>
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
                  {editingComposant ? 'Modification...' : 'Création...'}
                </>
              ) : (
                editingComposant ? 'Modifier' : 'Créer'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Composants;