// front-end/src/components/MachineDeleteModal.js
import React, { useState } from 'react';
import { Modal, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import apiService from '../services/apiService';
import { toast } from 'react-toastify';

const MachineDeleteModal = ({ show, onHide, machine, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const hasComposants = machine?.composants && machine.composants.length > 0;
  const hasDemandes = machine?.demandes && machine.demandes.length > 0;
  const canDelete = !hasComposants;

  const handleDelete = async () => {
    if (!canDelete) return;
    
    setLoading(true);
    try {
      await apiService.deleteMachine(machine.id);
      toast.success('Machine supprimée avec succès');
      onSuccess?.();
      onHide();
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 409) {
        toast.error('Impossible de supprimer cette machine car elle contient des composants');
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

  if (!machine) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <i className="fas fa-trash me-2"></i>
          Supprimer la machine
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Attention !</strong> Cette action est irréversible.
        </Alert>

        <div className="mb-3">
          <h6>Machine à supprimer :</h6>
          <div className="bg-light p-3 rounded">
            <div><strong>Nom :</strong> {machine.nom}</div>
            <div><strong>Numéro de série :</strong> {machine.numero_serie}</div>
            <div><strong>Modèle :</strong> {machine.modele}</div>
            <div><strong>Localisation :</strong> {machine.localisation || '-'}</div>
          </div>
        </div>

        {/* Vérifications avant suppression */}
        <div className="mb-3">
          <h6>Vérifications :</h6>
          <ListGroup variant="flush">
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>
                <i className={`fas ${hasComposants ? 'fa-times text-danger' : 'fa-check text-success'} me-2`}></i>
                Composants associés
              </span>
              <Badge bg={hasComposants ? 'danger' : 'success'}>
                {machine.composants?.length || 0}
              </Badge>
            </ListGroup.Item>
            <ListGroup.Item className="d-flex justify-content-between align-items-center">
              <span>
                <i className={`fas ${hasDemandes ? 'fa-exclamation-triangle text-warning' : 'fa-check text-success'} me-2`}></i>
                Demandes associées
              </span>
              <Badge bg={hasDemandes ? 'warning' : 'success'}>
                {machine.demandes?.length || 0}
              </Badge>
            </ListGroup.Item>
          </ListGroup>
        </div>

        {/* Messages d'erreur ou d'avertissement */}
        {hasComposants && (
          <Alert variant="danger">
            <strong>Suppression impossible !</strong><br/>
            Cette machine contient {machine.composants.length} composant(s). 
            Vous devez d'abord supprimer ou déplacer tous les composants associés.
          </Alert>
        )}

        {hasDemandes && !hasComposants && (
          <Alert variant="warning">
            <strong>Attention !</strong><br/>
            Cette machine a {machine.demandes.length} demande(s) associée(s). 
            Ces demandes seront également supprimées.
          </Alert>
        )}

        {canDelete && !hasDemandes && (
          <Alert variant="info">
            Cette machine peut être supprimée en toute sécurité.
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={!canDelete || loading}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin me-2"></i>
              Suppression...
            </>
          ) : (
            <>
              <i className="fas fa-trash me-2"></i>
              {canDelete ? 'Supprimer définitivement' : 'Suppression impossible'}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MachineDeleteModal;