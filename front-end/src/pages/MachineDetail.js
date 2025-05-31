import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button, Spinner, Row, Col, Tab, Tabs } from 'react-bootstrap';
import apiService from '../services/apiService';

const MachineDetail = () => {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMachine();
  }, [id]);

  const loadMachine = async () => {
    try {
      const response = await apiService.getMachine(id);
      setMachine(response.data.data);
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

  if (!machine) {
    return (
      <div className="text-center py-5">
        <h4>Machine non trouvée</h4>
        <Link to="/machines" className="btn btn-primary">Retour aux machines</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{machine.nom}</h1>
        <Button as={Link} to="/machines" variant="outline-secondary">
          Retour aux machines
        </Button>
      </div>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5>Informations générales</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p><strong>Numéro de série:</strong> {machine.numero_serie}</p>
                  <p><strong>Modèle:</strong> {machine.modele}</p>
                  <p><strong>Localisation:</strong> {machine.localisation}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Statut:</strong> <Badge bg="success">{machine.statut}</Badge></p>
                  <p><strong>Date d'installation:</strong> {machine.date_installation}</p>
                  <p><strong>Dernière maintenance:</strong> {machine.derniere_maintenance}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5>Statistiques</h5>
            </Card.Header>
            <Card.Body>
              <p>Composants: {machine.statistiques?.composants_total || 0}</p>
              <p>Demandes: {machine.statistiques?.demandes_total || 0}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MachineDetail;