// src/pages/Composants.js - Version complète mise à jour avec gestion d'images
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Alert, Spinner, Pagination, Image, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Composants = () => {
  const { user } = useAuth();
  const [composants, setComposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [editingComposant, setEditingComposant] = useState(null);
  const [selectedComposant, setSelectedComposant] = useState(null);
  const [machines, setMachines] = useState([]);
  const [types, setTypes] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'cards'
  const [filters, setFilters] = useState({
    search: '',
    machine_id: '',
    type_id: '',
    statut: '',
    fournisseur: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 15
  });
  const [formData, setFormData] = useState({
    nom: '',
    reference: '',
    machine_id: '',
    type_id: '',
    description: '',
    statut: 'bon',
    quantite: 1,
    prix_unitaire: '',
    fournisseur: '',
    date_installation: '',
    derniere_inspection: '',
    prochaine_inspection: '',
    duree_vie_estimee: '',
    notes: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [statutData, setStatutData] = useState({
    statut: '',
    notes: ''
  });
  const [inspectionData, setInspectionData] = useState({
    derniere_inspection: '',
    prochaine_inspection: '',
    statut: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadComposants();
    loadMachines();
    loadTypes();
  }, [filters, pagination.currentPage]);

  // Debug des images quand les composants changent
  useEffect(() => {
    if (composants.length > 0 && process.env.NODE_ENV === 'development') {
      console.group('🖼️ Debug Images Composants');
      composants.forEach(composant => {
        console.log(`Composant ${composant.id} (${composant.nom}):`, {
          has_image: composant.has_image,
          image_url: composant.image_url,
          image_path: composant.image_path
        });
      });
      console.groupEnd();
    }
  }, [composants]);

  const loadComposants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage,
        _t: Date.now(), // Anti-cache
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      console.log('🔄 Chargement des composants avec params:', params);
      const response = await apiService.getComposants(params);
      console.log('📥 Réponse API composants:', response.data);
      
      if (response.data && response.data.data) {
        const composantsData = response.data.data.data || response.data.data;
        setComposants(composantsData);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        }));
      } else {
        setComposants([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des composants:', error);
      setError('Erreur lors du chargement des composants');
      setComposants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComposants();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  const loadMachines = async () => {
    try {
      const response = await apiService.getMachinesActives();
      setMachines(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des machines:', error);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await apiService.getTypesActifs();
      setTypes(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
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
      machine_id: '',
      type_id: '',
      statut: '',
      fournisseur: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Gestion améliorée de l'image
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setFormData(prev => ({ ...prev, image: null }));
      setImagePreview(null);
      return;
    }

    // Validation côté client
    const validation = apiService.validateImage(file);
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      e.target.value = '';
      return;
    }

    console.log('📁 Fichier sélectionné:', {
      name: file.name,
      size: file.size,
      type: file.type,
      size_mb: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    });

    try {
      // Compression si nécessaire
      let processedFile = file;
      if (file.size > 1024 * 1024) { // Plus de 1MB
        console.log('🗜️ Compression de l\'image...');
        processedFile = await apiService.compressImage(file, 0.8);
        console.log('✅ Image compressée:', {
          original_size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
          compressed_size: (processedFile.size / 1024 / 1024).toFixed(2) + 'MB',
          reduction: Math.round((1 - processedFile.size / file.size) * 100) + '%'
        });
      }

      // Créer le preview
      const preview = await apiService.createImagePreview(processedFile);
      setImagePreview(preview);
      setFormData(prev => ({ ...prev, image: processedFile }));
      
      toast.success('Image chargée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'image:', error);
      toast.error('Erreur lors du chargement de l\'image');
      e.target.value = '';
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    const fileInput = document.querySelector('input[type="file"][name="image"]');
    if (fileInput) fileInput.value = '';
  };

  const handleDeleteImage = async (composantId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      return;
    }

    try {
      console.log('🗑️ Suppression image pour composant:', composantId);
      
      const response = await apiService.deleteComposantImage(composantId);
      console.log('✅ Image supprimée:', response.data);
      
      toast.success('Image supprimée avec succès');
      
      // Mise à jour immédiate de l'état local
      setComposants(prevComposants => 
        prevComposants.map(composant => 
          composant.id === composantId 
            ? { 
                ...composant, 
                image_url: null, 
                has_image: false, 
                image_path: null 
              }
            : composant
        )
      );
      
      // Rechargement pour être sûr
      setTimeout(() => {
        loadComposants();
      }, 300);
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation côté client
      if (formData.image) {
        const validation = apiService.validateImage(formData.image);
        if (!validation.valid) {
          validation.errors.forEach(error => toast.error(error));
          return;
        }
      }

      const dataToSubmit = {
        ...formData,
        quantite: parseInt(formData.quantite) || 1,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null,
        duree_vie_estimee: formData.duree_vie_estimee ? parseInt(formData.duree_vie_estimee) : null
      };

      console.log('📤 Envoi des données composant:', {
        ...dataToSubmit,
        has_image: !!formData.image,
        image_size: formData.image?.size
      });

      if (editingComposant) {
        await apiService.updateComposant(editingComposant.id, dataToSubmit);
        toast.success('Composant mis à jour avec succès');
      } else {
        await apiService.createComposant(dataToSubmit);
        toast.success('Composant créé avec succès');
      }
      
      setShowModal(false);
      resetForm();
      setEditingComposant(null);
      
      // Rechargement avec délai
      setTimeout(() => {
        loadComposants();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors).flat().forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde du composant');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatutChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.updateComposantStatut(selectedComposant.id, statutData);
      toast.success('Statut mis à jour avec succès');
      setShowStatutModal(false);
      setSelectedComposant(null);
      setStatutData({ statut: '', notes: '' });
      loadComposants();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectionUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.updateComposantInspection(selectedComposant.id, inspectionData);
      toast.success('Inspection mise à jour avec succès');
      setShowInspectionModal(false);
      setSelectedComposant(null);
      setInspectionData({
        derniere_inspection: '',
        prochaine_inspection: '',
        statut: '',
        notes: ''
      });
      loadComposants();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'inspection');
    } finally {
      setSubmitting(false);
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
        date_installation: composant.date_installation || '',
        derniere_inspection: composant.derniere_inspection || '',
        prochaine_inspection: composant.prochaine_inspection || '',
        duree_vie_estimee: composant.duree_vie_estimee || '',
        notes: composant.notes || '',
        image: null
      });
    } else {
      setEditingComposant(null);
      resetForm();
    }
    setShowModal(true);
  };

  const openStatutModal = (composant) => {
    setSelectedComposant(composant);
    setStatutData({
      statut: composant.statut,
      notes: composant.notes || ''
    });
    setShowStatutModal(true);
  };

  const openInspectionModal = (composant) => {
    setSelectedComposant(composant);
    setInspectionData({
      derniere_inspection: composant.derniere_inspection || '',
      prochaine_inspection: composant.prochaine_inspection || '',
      statut: composant.statut,
      notes: composant.notes || ''
    });
    setShowInspectionModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      reference: '',
      machine_id: '',
      type_id: '',
      description: '',
      statut: 'bon',
      quantite: 1,
      prix_unitaire: '',
      fournisseur: '',
      date_installation: '',
      derniere_inspection: '',
      prochaine_inspection: '',
      duree_vie_estimee: '',
      notes: '',
      image: null
    });
    setImagePreview(null);
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'bon': 'success',
      'usure': 'warning',
      'defaillant': 'danger',
      'remplace': 'secondary'
    };
    const labels = {
      'bon': 'Bon',
      'usure': 'Usure',
      'defaillant': 'Défaillant',
      'remplace': 'Remplacé'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{labels[statut] || statut}</Badge>;
  };

  const getInspectionBadge = (composant) => {
    if (!composant.prochaine_inspection) {
      return <Badge bg="secondary">Non programmé</Badge>;
    }

    const today = new Date();
    const prochaine = new Date(composant.prochaine_inspection);
    const diffDays = Math.ceil((prochaine - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge bg="danger">En retard</Badge>;
    } else if (diffDays <= 7) {
      return <Badge bg="warning">Urgent</Badge>;
    } else if (diffDays <= 30) {
      return <Badge bg="info">Bientôt</Badge>;
    } else {
      return <Badge bg="success">OK</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const items = [];
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    if (currentPage > 1) {
      items.push(
        <Pagination.Item key="first" onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
    }

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

  // Composant ComposantCard pour l'affichage en cartes
  const ComposantCard = ({ composant }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const handleImageError = (e) => {
      console.error('❌ Erreur chargement image composant:', {
        composant_id: composant.id,
        image_url: composant.image_url,
        has_image: composant.has_image,
        error: e
      });
      setImageError(true);
      setImageLoading(false);
    };

    const handleImageLoad = () => {
      setImageLoading(false);
      setImageError(false);
    };

    const isValidImageUrl = composant.image_url && 
      (composant.image_url.startsWith('http') || composant.image_url.startsWith('/'));

    return (
      <Col lg={4} md={6} className="mb-4">
        <Card className="h-100 composant-card shadow-sm">
          {/* Conteneur d'image */}
          <div className="composant-image-container position-relative">
            {composant.has_image && isValidImageUrl && !imageError ? (
              <>
                {imageLoading && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light" style={{ zIndex: 2 }}>
                    <div className="text-center">
                      <Spinner animation="border" size="sm" />
                      <div className="small text-muted mt-2">Chargement...</div>
                    </div>
                  </div>
                )}
                <Card.Img 
                  variant="top" 
                  src={composant.image_url}
                  alt={composant.nom}
                  className={`composant-image ${imageLoading ? 'opacity-50' : ''}`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover'
                  }}
                />
              </>
            ) : (
              <div className="composant-image-placeholder d-flex align-items-center justify-content-center bg-light">
                <div className="text-center text-muted">
                  <i className="fas fa-puzzle-piece fa-3x mb-2"></i>
                  <div>
                    {imageError ? 'Erreur image' : 'Aucune image'}
                  </div>
                </div>
              </div>
            )}

            {/* Badge de statut */}
            <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 3 }}>
              {getStatutBadge(composant.statut)}
            </div>

            {/* Bouton de suppression d'image */}
            {user?.role === 'admin' && composant.has_image && !imageError && (
              <Button
                variant="danger"
                size="sm"
                className="position-absolute composant-delete-image-btn"
                style={{
                  top: '10px',
                  left: '10px',
                  width: '25px',
                  height: '25px',
                  padding: '0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3
                }}
                onClick={() => handleDeleteImage(composant.id)}
                title="Supprimer l'image"
              >
                <i className="fas fa-trash" style={{ fontSize: '10px' }}></i>
              </Button>
            )}
          </div>

          {/* Corps de la carte */}
          <Card.Body className="d-flex flex-column">
            <div className="mb-3">
              <Card.Title className="h6 mb-1">{composant.nom}</Card.Title>
              <Card.Subtitle className="text-primary fw-bold mb-2 small">
                {composant.reference}
              </Card.Subtitle>
            </div>

            <div className="composant-info mb-3 flex-grow-1">
              <Row className="g-2">
                <Col xs={12}>
                  <div className="info-item">
                    <i className="fas fa-cog text-muted me-1"></i>
                    <small className="text-muted">Machine:</small>
                    <div className="fw-semibold small">{composant.machine?.nom}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-tag text-muted me-1"></i>
                    <small className="text-muted">Type:</small>
                    <div>
                      {composant.type && (
                        <Badge 
                          bg="secondary" 
                          style={{ backgroundColor: composant.type.couleur, fontSize: '0.7rem' }}
                        >
                          {composant.type.nom}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-sort-numeric-up text-muted me-1"></i>
                    <small className="text-muted">Quantité:</small>
                    <div>
                      <Badge bg="info" className="small">{composant.quantite}</Badge>
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-euro-sign text-muted me-1"></i>
                    <small className="text-muted">Prix:</small>
                    <div className="fw-semibold small">{formatPrice(composant.prix_unitaire)}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-search text-muted me-1"></i>
                    <small className="text-muted">Inspection:</small>
                    <div>{getInspectionBadge(composant)}</div>
                  </div>
                </Col>
              </Row>

              {composant.fournisseur && (
                <div className="mt-2">
                  <small className="text-muted">Fournisseur:</small>
                  <div className="small fw-semibold">{composant.fournisseur}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex gap-2">
              <Button
                as={Link}
                to={`/composants/${composant.id}`}
                variant="primary"
                size="sm"
                className="flex-grow-1"
              >
                <i className="fas fa-eye me-1"></i>
                Détails
              </Button>
              
              {user?.role === 'admin' && (
                <Dropdown>
                  <Dropdown.Toggle 
                    variant="outline-secondary" 
                    size="sm"
                    className="px-2"
                  >
                    <i className="fas fa-ellipsis-v"></i>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => openModal(composant)}>
                      <i className="fas fa-edit me-2"></i>
                      Modifier
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => openStatutModal(composant)}>
                      <i className="fas fa-toggle-on me-2"></i>
                      Statut
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => openInspectionModal(composant)}>
                      <i className="fas fa-search me-2"></i>
                      Inspection
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
    );
  };

  if (loading && composants.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Chargement des composants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="composants-page">
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-puzzle-piece me-2"></i>
                Gestion des Composants
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} composant(s) trouvé(s)
              </p>
            </div>
            <div className="d-flex gap-2">
              {/* Bouton de rafraîchissement */}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Actualiser les données"
              >
                {refreshing ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : (
                  <i className="fas fa-sync-alt"></i>
                )}
              </Button>

              {/* Boutons de vue */}
              <div className="btn-group" role="group">
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
                <Button 
                  variant="primary" 
                  onClick={() => openModal()}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-plus me-2"></i>
                  Nouveau Composant
                </Button>
              )}
            </div>
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
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Rechercher un composant..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col md={2}>
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
            <Col md={2}>
              <Form.Select
                value={filters.type_id}
                onChange={(e) => handleFilterChange('type_id', e.target.value)}
              >
                <option value="">Tous les types</option>
                {types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="bon">Bon</option>
                <option value="usure">Usure</option>
                <option value="defaillant">Défaillant</option>
                <option value="remplace">Remplacé</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                type="text"
                placeholder="Fournisseur..."
                value={filters.fournisseur}
                onChange={(e) => handleFilterChange('fournisseur', e.target.value)}
              />
            </Col>
            <Col md={1}>
              <Button variant="outline-secondary" onClick={clearFilters} title="Effacer les filtres">
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Liste des composants */}
      {composants.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-5">
              <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
              <h4>Aucun composant trouvé</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucun composant ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier composant'
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
                  Créer un composant
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Affichage en cartes */}
          {viewMode === 'cards' ? (
            <Row>
              {composants.map((composant) => (
                <ComposantCard key={composant.id} composant={composant} />
              ))}
            </Row>
          ) : (
            /* Affichage en tableau */
            <Card>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Nom / Référence</th>
                        <th>Machine</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Quantité</th>
                        <th>Prix</th>
                        <th>Inspection</th>
                        <th>Fournisseur</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {composants.map((composant) => (
                        <tr key={composant.id}>
                          <td>
                            {composant.has_image && composant.image_url ? (
                              <div className="position-relative">
                                <img
                                  src={composant.image_url}
                                  alt={composant.nom}
                                  width="50"
                                  height="50"
                                  className="rounded"
                                  style={{ objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                {/* Fallback pour erreur d'image */}
                                <div 
                                  className="bg-light rounded d-flex align-items-center justify-content-center" 
                                  style={{ width: '50px', height: '50px', display: 'none' }}
                                >
                                  <i className="fas fa-exclamation-triangle text-warning"></i>
                                </div>
                                {user?.role === 'admin' && (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="position-absolute top-0 end-0 p-1"
                                    style={{ 
                                      transform: 'translate(25%, -25%)',
                                      width: '20px',
                                      height: '20px',
                                      fontSize: '10px'
                                    }}
                                    onClick={() => handleDeleteImage(composant.id)}
                                    title="Supprimer l'image"
                                  >
                                    <i className="fas fa-times"></i>
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                <i className="fas fa-puzzle-piece text-muted"></i>
                              </div>
                            )}
                          </td>
                          <td>
                            <div>
                              <div className="fw-bold">{composant.nom}</div>
                              <small className="text-muted">{composant.reference}</small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div className="fw-bold">{composant.machine?.nom}</div>
                              {composant.machine?.localisation && (
                                <small className="text-muted">
                                  {composant.machine.localisation}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            {composant.type && (
                              <Badge 
                                bg="secondary" 
                                style={{ backgroundColor: composant.type.couleur }}
                              >
                                {composant.type.nom}
                              </Badge>
                            )}
                          </td>
                          <td>
                            {getStatutBadge(composant.statut)}
                          </td>
                          <td>
                            <Badge bg="info">
                              {composant.quantite}
                            </Badge>
                          </td>
                          <td>
                            {formatPrice(composant.prix_unitaire)}
                          </td>
                          <td>
                            {getInspectionBadge(composant)}
                          </td>
                          <td>
                            {composant.fournisseur || '-'}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                as={Link}
                                to={`/composants/${composant.id}`}
                                variant="outline-primary"
                                size="sm"
                                title="Voir les détails"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              
                              {user?.role === 'admin' && (
                                <>
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    title="Modifier"
                                    onClick={() => openModal(composant)}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                  <Button
                                    variant="outline-info"
                                    size="sm"
                                    title="Mise à jour inspection"
                                    onClick={() => openInspectionModal(composant)}
                                  >
                                    <i className="fas fa-search"></i>
                                  </Button>
                                  {composant.has_image && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDeleteImage(composant.id)}
                                      title="Supprimer l'image"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted">
                Affichage de {((pagination.currentPage - 1) * pagination.perPage) + 1} à{' '}
                {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur {pagination.total} composants
              </div>
              {renderPagination()}
            </div>
          )}
        </>
      )}

      {/* Modal de création/modification */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`fas ${editingComposant ? 'fa-edit' : 'fa-plus'} me-2`}></i>
            {editingComposant ? 'Modifier le composant' : 'Nouveau Composant'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              {/* Upload d'image */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-image me-2"></i>
                    Image du composant
                  </Form.Label>
                  <div className="d-flex align-items-start gap-3">
                    <div className="flex-grow-1">
                      <Form.Control
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mb-2"
                      />
                      <Form.Text className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        Formats acceptés: JPG, PNG, GIF. Taille max: 2MB
                      </Form.Text>
                    </div>
                    {imagePreview && (
                      <div className="position-relative">
                        <Image
                          src={imagePreview}
                          alt="Aperçu"
                          width="80"
                          height="80"
                          className="rounded object-cover border"
                          style={{ objectFit: 'cover' }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 p-1"
                          style={{ 
                            transform: 'translate(25%, -25%)',
                            width: '20px',
                            height: '20px',
                            fontSize: '10px'
                          }}
                          onClick={removeImage}
                          title="Supprimer l'image"
                        >
                          <i className="fas fa-times"></i>
                        </Button>
                      </div>
                    )}
                  </div>
                </Form.Group>
              </Col>

              {/* Informations de base */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-tag me-2"></i>
                    Nom <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    placeholder="Nom du composant"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-barcode me-2"></i>
                    Référence <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleFormChange}
                    placeholder="Référence unique"
                    maxLength={50}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-cog me-2"></i>
                    Machine <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleFormChange}
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
                  <Form.Label>
                    <i className="fas fa-folder me-2"></i>
                    Type <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="type_id"
                    value={formData.type_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Sélectionnez un type</option>
                    {types.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.nom}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-toggle-on me-2"></i>
                    Statut
                  </Form.Label>
                  <Form.Select
                    name="statut"
                    value={formData.statut}
                    onChange={handleFormChange}
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
                  <Form.Label>
                    <i className="fas fa-sort-numeric-up me-2"></i>
                    Quantité <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="quantite"
                    value={formData.quantite}
                    onChange={handleFormChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-euro-sign me-2"></i>
                    Prix unitaire (€)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="prix_unitaire"
                    value={formData.prix_unitaire}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-building me-2"></i>
                    Fournisseur
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="fournisseur"
                    value={formData.fournisseur}
                    onChange={handleFormChange}
                    placeholder="Nom du fournisseur"
                    maxLength={100}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-calendar-alt me-2"></i>
                    Date d'installation
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="date_installation"
                    value={formData.date_installation}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-hourglass-half me-2"></i>
                    Durée de vie estimée (mois)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="duree_vie_estimee"
                    value={formData.duree_vie_estimee}
                    onChange={handleFormChange}
                    placeholder="Nombre de mois"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-file-text me-2"></i>
                    Description
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Description du composant"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-sticky-note me-2"></i>
                    Notes
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Notes additionnelles"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              <i className="fas fa-times me-2"></i>
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
                  {editingComposant ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {editingComposant ? 'Mettre à jour' : 'Créer le composant'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de modification du statut */}
      <Modal show={showStatutModal} onHide={() => setShowStatutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Modifier le statut - {selectedComposant?.nom}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStatutChange}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-toggle-on me-2"></i>
                    Statut
                  </Form.Label>
                  <Form.Select
                    value={statutData.statut}
                    onChange={(e) => setStatutData(prev => ({ ...prev, statut: e.target.value }))}
                    required
                  >
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-sticky-note me-2"></i>
                    Notes
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={statutData.notes}
                    onChange={(e) => setStatutData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes sur le changement de statut"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStatutModal(false)}>
              <i className="fas fa-times me-2"></i>
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
                  Mise à jour...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Mettre à jour
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal d'inspection */}
      <Modal show={showInspectionModal} onHide={() => setShowInspectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-search me-2"></i>
            Inspection - {selectedComposant?.nom}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInspectionUpdate}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-calendar-check me-2"></i>
                    Dernière inspection <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={inspectionData.derniere_inspection}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, derniere_inspection: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-calendar-plus me-2"></i>
                    Prochaine inspection
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={inspectionData.prochaine_inspection}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, prochaine_inspection: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-toggle-on me-2"></i>
                    Statut après inspection
                  </Form.Label>
                  <Form.Select
                    value={inspectionData.statut}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, statut: e.target.value }))}
                  >
                    <option value="bon">Bon</option>
                    <option value="usure">Usure</option>
                    <option value="defaillant">Défaillant</option>
                    <option value="remplace">Remplacé</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-file-text me-2"></i>
                    Notes d'inspection
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={inspectionData.notes}
                    onChange={(e) => setInspectionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observations et notes de l'inspection"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInspectionModal(false)}>
              <i className="fas fa-times me-2"></i>
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
                  Mise à jour...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Mettre à jour
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        .composant-card {
          transition: all 0.3s ease;
          border-radius: 12px;
          overflow: hidden;
          border: none;
          animation: fadeInUp 0.5s ease-out;
        }

        .composant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }

        .composant-image-container {
          height: 180px;
          overflow: hidden;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          position: relative;
        }

        .composant-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .composant-card:hover .composant-image {
          transform: scale(1.05);
        }

        .composant-image-placeholder {
          height: 180px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid rgba(0,0,0,0.125);
        }

        .composant-delete-image-btn {
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .composant-card:hover .composant-delete-image-btn {
          opacity: 1;
        }

        .info-item {
          margin-bottom: 0.5rem;
        }

        .info-item .fw-semibold {
          font-size: 0.85rem;
          color: #495057;
        }

        .info-item small {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-title {
          color: #2c3e50;
          font-weight: 600;
        }

        .card-subtitle {
          font-size: 0.8rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .table th {
          border-top: none;
          border-bottom: 2px solid #e9ecef;
          font-weight: 600;
          color: #495057;
          background-color: #f8f9fa;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table td {
          border-top: 1px solid #f1f3f4;
          vertical-align: middle;
        }

        .table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
          border-radius: 0.375rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .alert {
          border-radius: 10px;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .pagination .page-link {
          border-radius: 8px;
          margin: 0 0.125rem;
          border: 1px solid #dee2e6;
          color: #007bff;
          transition: all 0.2s ease;
        }

        .pagination .page-link:hover {
          background-color: #007bff;
          border-color: #007bff;
          color: white;
          transform: translateY(-1px);
        }

        .pagination .page-item.active .page-link {
          background-color: #007bff;
          border-color: #007bff;
        }

        .dropdown-menu {
          border: none;
          border-radius: 8px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          padding: 0.5rem 0;
        }

        .dropdown-item {
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa;
          color: #007bff;
        }

        .btn-primary {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          border: none;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-outline-primary:hover {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          border-color: transparent;
        }

        .btn-group .btn {
          border-radius: 0;
        }

        .btn-group .btn:first-child {
          border-top-left-radius: 0.375rem;
          border-bottom-left-radius: 0.375rem;
        }

        .btn-group .btn:last-child {
          border-top-right-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }

        /* Animation d'apparition des cartes */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .composant-card:nth-child(1) { animation-delay: 0.1s; }
        .composant-card:nth-child(2) { animation-delay: 0.2s; }
        .composant-card:nth-child(3) { animation-delay: 0.3s; }
        .composant-card:nth-child(4) { animation-delay: 0.4s; }
        .composant-card:nth-child(5) { animation-delay: 0.5s; }
        .composant-card:nth-child(6) { animation-delay: 0.6s; }

        /* Responsive */
        @media (max-width: 768px) {
          .composant-card {
            margin-bottom: 1rem;
          }
          
          .composant-image-container {
            height: 150px;
          }
          
          .card-title {
            font-size: 1rem;
          }
          
          .info-item {
            margin-bottom: 0.25rem;
          }
          
          .btn-group .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }

          .composant-delete-image-btn {
            opacity: 1; /* Toujours visible sur mobile */
          }
        }

        @media (max-width: 576px) {
          .composant-image-container {
            height: 120px;
          }
          
          .card-body {
            padding: 1rem;
          }
          
          .info-item .fw-semibold {
            font-size: 0.75rem;
          }
          
          .info-item small {
            font-size: 0.65rem;
          }
        }

        /* Accessibilité */
        .composant-card:focus-within {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        .btn:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* Styles pour l'impression */
        @media print {
          .composant-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          
          .btn, .dropdown {
            display: none !important;
          }
          
          .composant-image-container {
            height: auto;
          }
        }

        /* Animation pour le spinner de rafraîchissement */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .fa-sync-alt {
          transition: transform 0.3s ease;
        }

        .fa-sync-alt:hover {
          transform: rotate(180deg);
        }

        /* Styles pour les modals */
        .modal-content {
          border-radius: 12px;
          border: none;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }

        .modal-header {
          border-bottom: 1px solid #f1f3f4;
          background-color: #f8f9fa;
          border-radius: 12px 12px 0 0;
        }

        .modal-footer {
          border-top: 1px solid #f1f3f4;
          background-color: #f8f9fa;
          border-radius: 0 0 12px 12px;
        }

        /* Styles pour les labels avec icônes */
        .form-label i {
          color: #6c757d;
          width: 16px;
          text-align: center;
        }

        /* Amélioration des inputs */
        .form-control, .form-select {
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .form-control:focus, .form-select:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.15);
        }

        /* Animation des tooltips */
        [title]:hover::after {
          content: attr(title);
          position: absolute;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          white-space: nowrap;
          z-index: 1000;
          transform: translateY(-100%);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Styles pour les badges avec couleurs personnalisées */
        .badge[style*="background"] {
          color: white !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        /* Amélioration des alertes */
        .alert {
          border-left: 4px solid;
        }

        .alert-danger {
          border-left-color: #dc3545;
        }

        /* Styles pour les images avec erreur */
        img[src=""]:after {
          content: "Image non disponible";
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          color: #6c757d;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
};

export default Composants;