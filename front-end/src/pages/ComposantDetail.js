import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import apiService from '../services/apiService';

const ComposantDetail = () => {
  const { id } = useParams();
  const [composant, setComposant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComposant();
  }, [id]);

  const loadComposant = async () => {
    try {
      const response = await apiService.getComposant(id);
      setComposant(response.data.data);
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
        <h1>{composant?.nom}</h1>
        <Button as={Link} to="/composants" variant="outline-secondary">
          Retour aux composants
        </Button>
      </div>

      <Card>
        <Card.Header>
          <h5>Détails du composant</h5>
        </Card.Header>
        <Card.Body>
          <p><strong>Référence:</strong> {composant?.reference}</p>
          <p><strong>Machine:</strong> {composant?.machine?.nom}</p>
          <p><strong>Type:</strong> {composant?.type?.nom}</p>
          <p><strong>Statut:</strong> <Badge bg="success">{composant?.statut}</Badge></p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ComposantDetail;