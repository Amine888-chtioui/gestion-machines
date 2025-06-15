// front-end/src/components/ComposantDeleteModal.js
import React, { useState } from 'react';
import { Modal, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const ComposantDeleteModal = ({ show, onHide, composant, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const hasDemandes = composant?.demandes && composant.demandes.length > 0;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiService.deleteComposant(composant.id);
      toast.success('Composant supprimé avec succès');
      onSuccess?.();
      onHide();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 409) {
        toast.error('Impossible de supprimer ce composant : contraintes de suppression');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onHide();
    }
  };

  if (!composant) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <i className="fas fa-trash me-2"></i>
          Supprimer le composant
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Attention !</strong> Cette action est irréversible.
        </Alert>

        <div className="mb-3">
          <h6>Composant à supprimer :</h6>
          <div className="bg-light p-3 rounded">
            <div><strong>Nom :</strong> {composant.nom}</div>
            <div><strong>Référence :</strong> {composant.reference}</div>
            <div><strong>Machine :</strong> {composant.machine?.nom || '-'}</div>
            <div><strong>Type :</strong> {composant.type?.nom || '-'}</div>
            <div><strong>Statut :</strong> 
              <Badge 
                bg={composant.statut === 'bon' ? 'success' : 
                    composant.statut === 'usure' ? 'warning' : 
                    composant.statut === 'defaillant' ? 'danger' : 'secondary'}
                className="ms-2"
              >
                {composant.statut}
              </Badge>
            </div>
            <div><strong>Quantité :</strong> {composant.quantite}</div>
          </div>
        </div>

        {/* Vérifications avant suppression */}
        <div className="mb-3">
          <h6>Vérifications :</h6>
          <ListGroup variant="flush">
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>
                <i className={`fas ${hasDemandes ? 'fa-exclamation-triangle text-warning' : 'fa-check text-success'} me-2`}></i>
                Demandes associées
              </span>
              <Badge bg={hasDemandes ? 'warning' : 'success'}>
                {composant.demandes?.length || 0}
              </Badge>
            </ListGroup.Item>
            
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>
                <i className="fas fa-info-circle text-info me-2"></i>
                Image associée
              </span>
              <Badge bg={composant.has_image ? 'info' : 'secondary'}>
                {composant.has_image ? 'Oui' : 'Non'}
              </Badge>
            </ListGroup.Item>
          </ListGroup>
        </div>

        {/* Messages d'avertissement */}
        {hasDemandes && (
          <Alert variant="warning">
            <strong>Attention !</strong><br/>
            Ce composant a {composant.demandes.length} demande(s) associée(s). 
            Ces demandes seront également supprimées.
          </Alert>
        )}

        {composant.has_image && (
          <Alert variant="info">
            <strong>Note :</strong><br/>
            L'image associée à ce composant sera également supprimée du serveur.
          </Alert>
        )}

        {!hasDemandes && !composant.has_image && (
          <Alert variant="success">
            Ce composant peut être supprimé en toute sécurité.
          </Alert>
        )}

        {/* Confirmation finale */}
        <Alert variant="danger" className="mt-3">
          <strong>Confirmation requise :</strong><br/>
          Êtes-vous sûr de vouloir supprimer définitivement le composant <strong>"{composant.nom}"</strong> ?
        </Alert>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin me-2"></i>
              Suppression...
            </>
          ) : (
            <>
              <i className="fas fa-trash me-2"></i>
              Supprimer définitivement
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ComposantDeleteModal;