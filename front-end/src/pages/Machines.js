// src/pages/Machines.js - Version complète mise à jour avec gestion d'images corrigée
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Modal, Form, Alert, Spinner, Pagination, Image, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const Machines = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    localisation: '',
    modele: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 12
  });
  const [formData, setFormData] = useState({
    nom: '',
    numero_serie: '',
    modele: 'TELSOSPLICE TS3',
    description: '',
    localisation: '',
    statut: 'actif',
    date_installation: '',
    derniere_maintenance: '',
    specifications_techniques: {},
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [statutData, setStatutData] = useState({
    statut: '',
    derniere_maintenance: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMachines();
  }, [filters, pagination.currentPage]);

  // Debug des images quand les machines changent
  useEffect(() => {
    if (machines.length > 0 && process.env.NODE_ENV === 'development') {
      console.group('🖼️ Debug Images');
      machines.forEach(machine => {
        console.log(`Machine ${machine.id} (${machine.nom}):`, {
          has_image: machine.has_image,
          image_url: machine.image_url,
          image_path: machine.image_path
        });
      });
      console.groupEnd();
    }
  }, [machines]);

  const loadMachines = async () => {
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

      console.log('🔄 Chargement des machines avec params:', params);
      const response = await apiService.getMachines(params);
      console.log('📥 Réponse API machines:', response.data);
      
      if (response.data && response.data.data) {
        const machinesData = response.data.data.data || response.data.data;
        
        setMachines(machinesData);
        setPagination(prev => ({
          ...prev,
          currentPage: response.data.data.current_page || 1,
          totalPages: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        }));
      } else {
        setMachines([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des machines:', error);
      setError('Erreur lors du chargement des machines');
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMachines();
    setRefreshing(false);
    toast.success('Données actualisées');
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
      statut: '',
      localisation: '',
      modele: ''
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

    // Validation côté client renforcée
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
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
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
        specifications_techniques: formData.specifications_techniques || {}
      };

      console.log('📤 Envoi des données machine:', {
        ...dataToSubmit,
        has_image: !!formData.image,
        image_size: formData.image?.size
      });

      const response = await apiService.createMachine(dataToSubmit);
      console.log('✅ Machine créée:', response.data);
      
      toast.success('Machine créée avec succès');
      setShowModal(false);
      resetForm();
      
      // Rechargement avec délai pour laisser le temps au serveur
      setTimeout(() => {
        loadMachines();
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
      
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors).flat().forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors de la création de la machine');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatutChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (statutData.statut) {
        await apiService.updateMachineStatut(selectedMachine.id, statutData.statut);
      }
      
      if (statutData.derniere_maintenance) {
        await apiService.updateMachineMaintenance(selectedMachine.id, {
          derniere_maintenance: statutData.derniere_maintenance
        });
      }

      toast.success('Machine mise à jour avec succès');
      setShowStatutModal(false);
      setSelectedMachine(null);
      setStatutData({ statut: '', derniere_maintenance: '' });
      
      // Rechargement des données
      setTimeout(() => {
        loadMachines();
      }, 300);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImage = async (machineId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      return;
    }

    try {
      console.log('🗑️ Suppression image pour machine:', machineId);
      
      const response = await apiService.deleteMachineImage(machineId);
      console.log('✅ Image supprimée:', response.data);
      
      toast.success('Image supprimée avec succès');
      
      // Mise à jour immédiate de l'état local
      setMachines(prevMachines => 
        prevMachines.map(machine => 
          machine.id === machineId 
            ? { 
                ...machine, 
                image_url: null, 
                has_image: false, 
                image_path: null 
              }
            : machine
        )
      );
      
      // Rechargement pour être sûr
      setTimeout(() => {
        loadMachines();
      }, 300);
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  const openStatutModal = (machine) => {
    setSelectedMachine(machine);
    setStatutData({
      statut: machine.statut,
      derniere_maintenance: machine.derniere_maintenance || ''
    });
    setShowStatutModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      numero_serie: '',
      modele: 'TELSOSPLICE TS3',
      description: '',
      localisation: '',
      statut: 'actif',
      date_installation: '',
      derniere_maintenance: '',
      specifications_techniques: {},
      image: null
    });
    setImagePreview(null);
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'actif': 'success',
      'inactif': 'secondary',
      'maintenance': 'warning'
    };
    const labels = {
      'actif': 'Actif',
      'inactif': 'Inactif',
      'maintenance': 'Maintenance'
    };
    return <Badge bg={variants[statut] || 'secondary'}>{labels[statut] || statut}</Badge>;
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

  // Composant MachineCard avec gestion d'erreurs améliorée
  const MachineCard = ({ machine }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState(false);

    const toggleDebug = () => {
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(!debugInfo);
      }
    };

    const handleImageError = (e) => {
      console.error('❌ Erreur chargement image:', {
        machine_id: machine.id,
        image_url: machine.image_url,
        has_image: machine.has_image,
        image_path: machine.image_path,
        error: e
      });
      setImageError(true);
      setImageLoading(false);
    };

    const handleImageLoad = () => {
      console.log('✅ Image chargée:', {
        machine_id: machine.id,
        image_url: machine.image_url
      });
      setImageLoading(false);
      setImageError(false);
    };

    const isValidImageUrl = machine.image_url && 
      (machine.image_url.startsWith('http') || machine.image_url.startsWith('/'));

    return (
      <Col lg={4} md={6} className="mb-4">
        <Card className="h-100 machine-card shadow-sm">
          {/* Conteneur d'image avec gestion d'erreurs */}
          <div className="machine-image-container position-relative">
            {machine.has_image && isValidImageUrl && !imageError ? (
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
                  src={machine.image_url}
                  alt={machine.nom}
                  className={`machine-image ${imageLoading ? 'opacity-50' : ''}`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
              </>
            ) : (
              <div className="machine-image-placeholder d-flex align-items-center justify-content-center bg-light">
                <div className="text-center text-muted">
                  <i className="fas fa-cogs fa-3x mb-2"></i>
                  <div>
                    {imageError ? 'Erreur image' : 'Aucune image'}
                  </div>
                  
                  {/* Debug en mode développement */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2">
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={toggleDebug}
                        className="text-muted p-0"
                      >
                        <i className="fas fa-bug"></i> Debug
                      </Button>
                      {debugInfo && (
                        <div className="small text-start mt-2 p-2 bg-dark text-white rounded" style={{ fontSize: '10px' }}>
                          <div><strong>ID:</strong> {machine.id}</div>
                          <div><strong>has_image:</strong> {String(machine.has_image)}</div>
                          <div><strong>image_path:</strong> {machine.image_path || 'null'}</div>
                          <div><strong>image_url:</strong> {machine.image_url || 'null'}</div>
                          <div><strong>isValidUrl:</strong> {String(isValidImageUrl)}</div>
                          <div><strong>imageError:</strong> {String(imageError)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Badge de statut */}
            <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 3 }}>
              {getStatutBadge(machine.statut)}
            </div>

            {/* Bouton de suppression d'image */}
            {user?.role === 'admin' && machine.has_image && !imageError && (
              <Button
                variant="danger"
                size="sm"
                className="position-absolute machine-delete-image-btn"
                style={{
                  top: '10px',
                  left: '10px',
                  width: '30px',
                  height: '30px',
                  padding: '0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3
                }}
                onClick={() => handleDeleteImage(machine.id)}
                title="Supprimer l'image"
              >
                <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
              </Button>
            )}
          </div>

          {/* Corps de la carte */}
          <Card.Body className="d-flex flex-column">
            <div className="mb-3">
              <Card.Title className="h5 mb-1">{machine.nom}</Card.Title>
              <Card.Subtitle className="text-primary fw-bold mb-2">
                {machine.numero_serie}
              </Card.Subtitle>
            </div>

            <div className="machine-info mb-3 flex-grow-1">
              <Row className="g-2">
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-tag text-muted me-1"></i>
                    <small className="text-muted">Modèle:</small>
                    <div className="fw-semibold">{machine.modele}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-map-marker-alt text-muted me-1"></i>
                    <small className="text-muted">Localisation:</small>
                    <div className="fw-semibold">{machine.localisation || '-'}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-wrench text-muted me-1"></i>
                    <small className="text-muted">Maintenance:</small>
                    <div className="fw-semibold">{formatDate(machine.derniere_maintenance)}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="info-item">
                    <i className="fas fa-puzzle-piece text-muted me-1"></i>
                    <small className="text-muted">Composants:</small>
                    <div className="fw-semibold">
                      <Badge bg="info">{machine.composants_count || 0}</Badge>
                    </div>
                  </div>
                </Col>
              </Row>

              {machine.description && (
                <div className="mt-3">
                  <small className="text-muted">Description:</small>
                  <p className="small mb-0" style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {machine.description}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex gap-2">
              <Button
                as={Link}
                to={`/machines/${machine.id}`}
                variant="primary"
                size="sm"
                className="flex-grow-1"
              >
                <i className="fas fa-eye me-1"></i>
                Voir détails
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
                    <Dropdown.Item onClick={() => openStatutModal(machine)}>
                      <i className="fas fa-edit me-2"></i>
                      Modifier
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item 
                      onClick={() => toast.info('Fonctionnalité à implémenter')}
                      className="text-warning"
                    >
                      <i className="fas fa-wrench me-2"></i>
                      Maintenance
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

  // Fonction de diagnostic pour debug
  const diagnoseMachineImages = async () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('🔍 Diagnostic des images des machines');
    
    for (const machine of machines) {
      console.log(`\n📋 Machine ${machine.id} (${machine.nom}):`);
      console.log('  has_image:', machine.has_image);
      console.log('  image_path:', machine.image_path);
      console.log('  image_url:', machine.image_url);
      
      if (machine.image_url) {
        try {
          const response = await fetch(machine.image_url, { method: 'HEAD' });
          console.log('  URL accessible:', response.ok, `(${response.status})`);
        } catch (error) {
          console.log('  URL accessible:', false, error.message);
        }
      }
    }
    
    console.groupEnd();
  };

  if (loading && machines.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Chargement des machines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="machines-page">
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-cogs me-2"></i>
                Gestion des Machines
              </h2>
              <p className="text-muted mb-0">
                {pagination.total} machine(s) trouvée(s)
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

              {/* Debug button (développement) */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={diagnoseMachineImages}
                  title="Diagnostiquer les images"
                >
                  <i className="fas fa-bug"></i>
                </Button>
              )}

              {/* Boutons de vue */}
              <div className="btn-group" role="group">
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
                <Button 
                  variant="primary" 
                  onClick={() => setShowModal(true)}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-plus me-2"></i>
                  Nouvelle Machine
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
                placeholder="Rechercher une machine..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="maintenance">Maintenance</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Localisation..."
                value={filters.localisation}
                onChange={(e) => handleFilterChange('localisation', e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Modèle..."
                value={filters.modele}
                onChange={(e) => handleFilterChange('modele', e.target.value)}
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

      {/* Liste des machines */}
      {machines.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-5">
              <i className="fas fa-cogs fa-3x text-muted mb-3"></i>
              <h4>Aucune machine trouvée</h4>
              <p className="text-muted mb-4">
                {Object.values(filters).some(filter => filter !== '') 
                  ? 'Aucune machine ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre première machine'
                }
              </p>
              {Object.values(filters).some(filter => filter !== '') ? (
                <Button variant="outline-primary" onClick={clearFilters}>
                  <i className="fas fa-times me-2"></i>
                  Effacer les filtres
                </Button>
              ) : user?.role === 'admin' && (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <i className="fas fa-plus me-2"></i>
                  Créer une machine
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
              {machines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </Row>
          ) : (
            /* Affichage en tableau */
            <Card>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Nom</th>
                        <th>Numéro de série</th>
                        <th>Statut</th>
                        <th>Localisation</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machines.map((machine) => (
                        <tr key={machine.id}>
                          <td>
                            {machine.has_image && machine.image_url ? (
                              <img
                                src={machine.image_url}
                                alt={machine.nom}
                                width="50"
                                height="50"
                                className="rounded"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                <i className="fas fa-image text-muted"></i>
                              </div>
                            )}
                            {/* Fallback pour erreur d'image */}
                            <div 
                              className="bg-light rounded d-flex align-items-center justify-content-center" 
                              style={{ width: '50px', height: '50px', display: 'none' }}
                            >
                              <i className="fas fa-exclamation-triangle text-warning"></i>
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold">{machine.nom}</div>
                            <small className="text-muted">{machine.modele}</small>
                          </td>
                          <td>
                            <span className="fw-bold text-primary">{machine.numero_serie}</span>
                          </td>
                          <td>{getStatutBadge(machine.statut)}</td>
                          <td>{machine.localisation || '-'}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                as={Link}
                                to={`/machines/${machine.id}`}
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
                                    onClick={() => openStatutModal(machine)}
                                    title="Modifier"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                  {machine.has_image && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDeleteImage(machine.id)}
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
                  </table>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div className="text-muted">
                Affichage de {((pagination.currentPage - 1) * pagination.perPage) + 1} à{' '}
                {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} sur {pagination.total} machines
              </div>
              {renderPagination()}
            </div>
          )}
        </>
      )}

      {/* Modal de création */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-plus me-2"></i>
            Nouvelle Machine
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
                    Image de la machine
                  </Form.Label>
                  <div className="d-flex align-items-start gap-3">
                    <div className="flex-grow-1">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mb-2"
                      />
                      <Form.Text className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        Formats acceptés: JPG, PNG, GIF. Taille max: 2MB. Dimensions recommandées: 800x600px
                      </Form.Text>
                    </div>
                    {imagePreview && (
                      <div className="position-relative">
                        <Image
                          src={imagePreview}
                          alt="Aperçu"
                          width="100"
                          height="100"
                          className="rounded object-cover border"
                          style={{ objectFit: 'cover' }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 p-1"
                          style={{ 
                            transform: 'translate(25%, -25%)',
                            width: '25px',
                            height: '25px',
                            fontSize: '12px'
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
                    placeholder="Nom de la machine"
                    maxLength={100}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-barcode me-2"></i>
                    Numéro de série <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="numero_serie"
                    value={formData.numero_serie}
                    onChange={handleFormChange}
                    placeholder="Numéro de série unique"
                    maxLength={50}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-cog me-2"></i>
                    Modèle
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="modele"
                    value={formData.modele}
                    onChange={handleFormChange}
                    placeholder="Modèle de la machine"
                    maxLength={50}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-map-marker-alt me-2"></i>
                    Localisation
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="localisation"
                    value={formData.localisation}
                    onChange={handleFormChange}
                    placeholder="Localisation de la machine"
                    maxLength={100}
                  />
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
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </Form.Select>
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
                    placeholder="Description détaillée de la machine"
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
                  Création...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Créer la machine
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
            Modifier {selectedMachine?.nom}
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
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    <i className="fas fa-wrench me-2"></i>
                    Dernière maintenance
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={statutData.derniere_maintenance}
                    onChange={(e) => setStatutData(prev => ({ ...prev, derniere_maintenance: e.target.value }))}
                  />
                  <Form.Text className="text-muted">
                    Mettre à jour la date de dernière maintenance (optionnel)
                  </Form.Text>
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

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        .machine-card {
          transition: all 0.3s ease;
          border-radius: 12px;
          overflow: hidden;
          border: none;
          animation: fadeInUp 0.5s ease-out;
        }

        .machine-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }

        .machine-image-container {
          height: 200px;
          overflow: hidden;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          position: relative;
        }

        .machine-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .machine-card:hover .machine-image {
          transform: scale(1.05);
        }

        .machine-image-placeholder {
          height: 200px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid rgba(0,0,0,0.125);
        }

        .machine-delete-image-btn {
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .machine-card:hover .machine-delete-image-btn {
          opacity: 1;
        }

        .info-item {
          margin-bottom: 0.5rem;
        }

        .info-item .fw-semibold {
          font-size: 0.9rem;
          color: #495057;
        }

        .info-item small {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-title {
          color: #2c3e50;
          font-weight: 600;
        }

        .card-subtitle {
          font-size: 0.9rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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
          border-radius: 0;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa;
          color: #007bff;
        }

        .form-control:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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

        .machine-card:nth-child(1) { animation-delay: 0.1s; }
        .machine-card:nth-child(2) { animation-delay: 0.2s; }
        .machine-card:nth-child(3) { animation-delay: 0.3s; }
        .machine-card:nth-child(4) { animation-delay: 0.4s; }
        .machine-card:nth-child(5) { animation-delay: 0.5s; }
        .machine-card:nth-child(6) { animation-delay: 0.6s; }

        /* Responsive */
        @media (max-width: 768px) {
          .machine-card {
            margin-bottom: 1rem;
          }
          
          .machine-image-container {
            height: 150px;
          }
          
          .card-title {
            font-size: 1.1rem;
          }
          
          .info-item {
            margin-bottom: 0.25rem;
          }
          
          .btn-group .btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
          }

          .machine-delete-image-btn {
            opacity: 1; /* Toujours visible sur mobile */
          }
        }

        @media (max-width: 576px) {
          .machine-image-container {
            height: 120px;
          }
          
          .card-body {
            padding: 1rem;
          }
          
          .info-item .fw-semibold {
            font-size: 0.8rem;
          }
          
          .info-item small {
            font-size: 0.7rem;
          }
        }

        /* Accessibilité */
        .machine-card:focus-within {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        .btn:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* Styles pour l'impression */
        @media print {
          .machine-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          
          .btn, .dropdown {
            display: none !important;
          }
          
          .machine-image-container {
            height: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Machines;