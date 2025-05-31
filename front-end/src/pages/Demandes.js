import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';

const Demandes = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = async () => {
    try {
      const response = await apiService.getDemandes();
      setDemandes(response.data.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Gestion des Demandes</h1>
        <Button variant="primary">Nouvelle Demande</Button>
      </div>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"></div>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Titre</th>
                  <th>Machine</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((demande) => (
                  <tr key={demande.id}>
                    <td>{demande.numero_demande}</td>
                    <td>{demande.titre}</td>
                    <td>{demande.machine?.nom}</td>
                    <td><Badge bg="warning">{demande.priorite}</Badge></td>
                    <td><Badge bg="info">{demande.statut}</Badge></td>
                    <td>{new Date(demande.created_at).toLocaleDateString()}</td>
                    <td>
                      <Button as={Link} to={`/demandes/${demande.id}`} size="sm">
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Demandes;