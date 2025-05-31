// src/pages/Composants.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';

const Composants = () => {
  const [composants, setComposants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComposants();
  }, []);

  const loadComposants = async () => {
    try {
      const response = await apiService.getComposants();
      setComposants(response.data.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="fas fa-puzzle-piece text-primary me-2"></i>
          Gestion des Composants
        </h1>
        <Button variant="primary">
          <i className="fas fa-plus me-2"></i>
          Nouveau Composant
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : composants.length > 0 ? (
            <Table responsive hover>
              <thead className="bg-light">
                <tr>
                  <th>Nom</th>
                  <th>Référence</th>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {composants.map((composant) => (
                  <tr key={composant.id}>
                    <td>
                      <div>
                        <Link 
                          to={`/composants/${composant.id}`}
                          className="fw-bold text-decoration-none"
                        >
                          {composant.nom}
                        </Link>
                        {composant.description && (
                          <div className="small text-muted">
                            {composant.description.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <code>{composant.reference}</code>
                    </td>
                    <td>
                      <Link to={`/machines/${composant.machine?.id}`} className="text-decoration-none">
                        <i className="fas fa-cog text-muted me-1"></i>
                        {composant.machine?.nom}
                      </Link>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: composant.type?.couleur || '#6c757d',
                          color: 'white'
                        }}
                      >
                        {composant.type?.nom}
                      </span>
                    </td>
                    <td>
                      <Badge bg={
                        composant.statut === 'bon' ? 'success' : 
                        composant.statut === 'usure' ? 'warning' : 
                        composant.statut === 'defaillant' ? 'danger' : 'secondary'
                      }>
                        {composant.statut}
                      </Badge>
                    </td>
                    <td>
                      {composant.prix_unitaire ? (
                        <span className="text-success fw-bold">
                          {new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(composant.prix_unitaire)}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Button 
                        as={Link} 
                        to={`/composants/${composant.id}`} 
                        variant="outline-primary"
                        size="sm"
                      >
                        <i className="fas fa-eye me-1"></i>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-puzzle-piece fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Aucun composant trouvé</h5>
              <p className="text-muted">Commencez par ajouter votre premier composant</p>
              <Button variant="primary">
                <i className="fas fa-plus me-2"></i>
                Ajouter un composant
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

// AJOUTEZ CETTE LIGNE À LA FIN DE VOTRE FICHIER
export default Composants;