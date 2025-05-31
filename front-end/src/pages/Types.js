import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge } from 'react-bootstrap';
import apiService from '../services/apiService';

const Types = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const response = await apiService.getTypes();
      setTypes(response.data.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Gestion des Types</h1>
        <Button variant="primary">Nouveau Type</Button>
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
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Couleur</th>
                  <th>Statut</th>
                  <th>Composants</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => (
                  <tr key={type.id}>
                    <td>{type.nom}</td>
                    <td>{type.description}</td>
                    <td>
                      <span 
                        className="d-inline-block" 
                        style={{
                          width: '20px', 
                          height: '20px', 
                          backgroundColor: type.couleur,
                          borderRadius: '4px'
                        }}
                      ></span>
                    </td>
                    <td>
                      <Badge bg={type.actif ? 'success' : 'secondary'}>
                        {type.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td>{type.composants_count || 0}</td>
                    <td>
                      <Button variant="outline-primary" size="sm">
                        Modifier
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

export default Types;