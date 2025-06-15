// front-end/src/components/ComposantEditForm.js
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Image } from 'react-bootstrap';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const ComposantEditForm = ({ show, onHide, composant, onSuccess }) => {
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
    prochaine_inspection: '',
    duree_vie_estimee: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [machines, setMachines] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    if (show) {
      loadMachines();
      loadTypes();
    }
  }, [show]);

  useEffect(() => {
    if (composant) {
      setFormData({
        nom: composant.nom || '',
        reference: composant.reference || '',
        machine_id: composant.machine_id || '',
        type_id: composant.type_id || '',
        description: composant.description || '',
        statut: composant.statut || 'bon',
        quantite: composant.quantite || 1,
        prix_unitaire: composant.prix_unitaire || '',
        fournisseur: composant.fournisseur || '',
        date_installation: composant.date_installation || '',
        prochaine_inspection: composant.prochaine_inspection || '',
        duree_vie_estimee: composant.duree_vie_estimee || ''
      });
      setImagePreview(composant.has_image ? composant.image_url : null);
    }
  }, [composant]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = apiService.validateImage(file);
      if (validation.valid) {
        try {
          const compressed = await apiService.compressImage(file);
          setImage(compressed);
          const preview = await apiService.createImagePreview(compressed);
          setImagePreview(preview);
          setErrors(prev => ({ ...prev, image: null }));
        } catch (error) {
          console.error('Erreur compression:', error);
          setErrors(prev => ({ ...prev, image: 'Erreur lors du traitement de l\'image' }));
          e.target.value = '';
        }
      } else {
        setErrors(prev => ({ ...prev, image: validation.errors.join(', ') }));
        e.target.value = '';
      }
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(composant?.has_image ? composant.image_url : null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.reference.trim()) newErrors.reference = 'La référence est requise';
    if (!formData.machine_id) newErrors.machine_id = 'La machine est requise';
    if (!formData.quantite || formData.quantite < 1) newErrors.quantite = 'La quantité doit être supérieure à 0';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (image) {
        submitData.image = image;
      }

      await apiService.updateComposant(composant.id, submitData);
      toast.success('Composant modifié avec succès');
      onSuccess?.();
      onHide();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erreur lors de la modification');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
      prochaine_inspection: '',
      duree_vie_estimee: ''
    });
    setImage(null);
    setImagePreview(null);
    setErrors({});
    
    // Nettoyer le champ de fichier
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
    
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-edit me-2"></i>
          Modifier le composant
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nom <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  isInvalid={!!errors.nom}
                  placeholder="Nom du composant"
                />
                <Form.Control.Feedback type="invalid">{errors.nom}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Référence <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  isInvalid={!!errors.reference}
                  placeholder="Référence unique"
                />
                <Form.Control.Feedback type="invalid">{errors.reference}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Machine <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="machine_id"
                  value={formData.machine_id}
                  onChange={handleInputChange}
                  isInvalid={!!errors.machine_id}
                >
                  <option value="">Sélectionner une machine</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>{machine.nom}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.machine_id}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select
                  name="type_id"
                  value={formData.type_id}
                  onChange={handleInputChange}
                >
                  <option value="">Sélectionner un type</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>{type.nom}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Statut</Form.Label>
                <Form.Select
                  name="statut"
                  value={formData.statut}
                  onChange={handleInputChange}
                >
                  <option value="bon">Bon</option>
                  <option value="usure">Usure</option>
                  <option value="defaillant">Défaillant</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Quantité <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="quantite"
                  value={formData.quantite}
                  onChange={handleInputChange}
                  isInvalid={!!errors.quantite}
                  min="1"
                />
                <Form.Control.Feedback type="invalid">{errors.quantite}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Prix unitaire (€)</Form.Label>
                <Form.Control
                  type="number"
                  name="prix_unitaire"
                  value={formData.prix_unitaire}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Fournisseur</Form.Label>
                <Form.Control
                  type="text"
                  name="fournisseur"
                  value={formData.fournisseur}
                  onChange={handleInputChange}
                  placeholder="Nom du fournisseur"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Date d'installation</Form.Label>
                <Form.Control
                  type="date"
                  name="date_installation"
                  value={formData.date_installation}
                  onChange={handleInputChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Prochaine inspection</Form.Label>
                <Form.Control
                  type="date"
                  name="prochaine_inspection"
                  value={formData.prochaine_inspection}
                  onChange={handleInputChange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Durée de vie estimée (mois)</Form.Label>
                <Form.Control
                  type="number"
                  name="duree_vie_estimee"
                  value={formData.duree_vie_estimee}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="En mois"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description du composant..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Image</Form.Label>
            <Form.Control
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handleImageChange}
              isInvalid={!!errors.image}
            />
            <Form.Text className="text-muted">
              Formats acceptés: JPG, PNG, GIF (max 5MB)
            </Form.Text>
            <Form.Control.Feedback type="invalid">{errors.image}</Form.Control.Feedback>
            
            {imagePreview && (
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Aperçu:</span>
                  {image && (
                    <Button variant="outline-danger" size="sm" onClick={removeImage}>
                      <i className="fas fa-times"></i> Supprimer
                    </Button>
                  )}
                </div>
                <Image
                  src={imagePreview}
                  alt="Aperçu"
                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                  className="border rounded"
                />
                {image && (
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="fas fa-check me-1"></i>
                      Nouvelle image sélectionnée ({(image.size / 1024).toFixed(1)} KB)
                    </small>
                  </div>
                )}
              </div>
            )}
          </Form.Group>

          {Object.keys(errors).length > 0 && (
            <Alert variant="danger">
              <small>Veuillez corriger les erreurs ci-dessus</small>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                Modification...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Modifier
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ComposantEditForm;