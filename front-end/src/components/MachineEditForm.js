// front-end/src/components/MachineEditForm.js
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Image } from 'react-bootstrap';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const MachineEditForm = ({ show, onHide, machine, onSuccess }) => {
  const [formData, setFormData] = useState({
    nom: '',
    numero_serie: '',
    modele: 'TELSOSPLICE TS3',
    description: '',
    localisation: '',
    statut: 'actif',
    date_installation: '',
    specifications_techniques: {}
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (machine) {
      setFormData({
        nom: machine.nom || '',
        numero_serie: machine.numero_serie || '',
        modele: machine.modele || 'TELSOSPLICE TS3',
        description: machine.description || '',
        localisation: machine.localisation || '',
        statut: machine.statut || 'actif',
        date_installation: machine.date_installation || '',
        specifications_techniques: machine.specifications_techniques || {}
      });
      setImagePreview(machine.has_image ? machine.image_url : null);
    }
  }, [machine]);

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
        const compressed = await apiService.compressImage(file);
        setImage(compressed);
        const preview = await apiService.createImagePreview(compressed);
        setImagePreview(preview);
        setErrors(prev => ({ ...prev, image: null }));
      } else {
        setErrors(prev => ({ ...prev, image: validation.errors.join(', ') }));
        e.target.value = '';
      }
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(machine?.has_image ? machine.image_url : null);
    document.querySelector('input[type="file"]').value = '';
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.numero_serie.trim()) newErrors.numero_serie = 'Le numéro de série est requis';
    if (!formData.modele.trim()) newErrors.modele = 'Le modèle est requis';
    
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

      await apiService.updateMachine(machine.id, submitData);
      toast.success('Machine modifiée avec succès');
      onSuccess?.();
      onHide();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
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
      numero_serie: '',
      modele: 'TELSOSPLICE TS3',
      description: '',
      localisation: '',
      statut: 'actif',
      date_installation: '',
      specifications_techniques: {}
    });
    setImage(null);
    setImagePreview(null);
    setErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-edit me-2"></i>
          Modifier la machine
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
                  placeholder="Nom de la machine"
                />
                <Form.Control.Feedback type="invalid">{errors.nom}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Numéro de série <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleInputChange}
                  isInvalid={!!errors.numero_serie}
                  placeholder="Numéro de série unique"
                />
                <Form.Control.Feedback type="invalid">{errors.numero_serie}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Modèle <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="modele"
                  value={formData.modele}
                  onChange={handleInputChange}
                  isInvalid={!!errors.modele}
                  placeholder="Modèle de la machine"
                />
                <Form.Control.Feedback type="invalid">{errors.modele}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Localisation</Form.Label>
                <Form.Control
                  type="text"
                  name="localisation"
                  value={formData.localisation}
                  onChange={handleInputChange}
                  placeholder="Localisation de la machine"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Statut</Form.Label>
                <Form.Select
                  name="statut"
                  value={formData.statut}
                  onChange={handleInputChange}
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="maintenance">Maintenance</option>
                </Form.Select>
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

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description de la machine..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Image</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
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

export default MachineEditForm;