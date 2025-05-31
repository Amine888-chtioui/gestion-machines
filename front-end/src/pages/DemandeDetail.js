import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import apiService from '../services/apiService';

const DemandeDetail = () => {
  const { id } = useParams();
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemande();
  }, [id]);

  const loadDemande = async () => {
    try {
      const response = await apiService.getDemande(id);
      setDemande(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Demande #{demande?.numero_demande}</h1>
        <Button as={Link} to="/demandes" variant="outline-secondary">
          Retour aux demandes
        </Button>
      </div>

      <Card>
        <Card.Header>
          <h5>{demande?.titre}</h5>
        </Card.Header>
        <Card.Body>
          <p><strong>Machine:</strong> {demande?.machine?.nom}</p>
          <p><strong>Priorité:</strong> <Badge bg="warning">{demande?.priorite}</Badge></p>
          <p><strong>Statut:</strong> <Badge bg="info">{demande?.statut}</Badge></p>
          <p><strong>Description:</strong> {demande?.description}</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DemandeDetail;