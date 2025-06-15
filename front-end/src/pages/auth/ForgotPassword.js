// src/pages/auth/ForgotPassword.js
import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await apiService.forgotPassword({ email });
      toast.success('Code de vérification envoyé !');
      
      // Rediriger vers la page de vérification avec l'email
      navigate('/verify-reset-code', { 
        state: { 
          email: email,
          message: response.data.message 
        } 
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi de l\'email';
      toast.error(errorMessage);
      setErrors({ email: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           padding: '2rem 1rem'
         }}>
      <Card style={{ 
        maxWidth: '450px', 
        width: '100%',
        borderRadius: '20px',
        border: 'none',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-5">
          {/* En-tête */}
          <div className="text-center mb-4">
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                color: 'white',
                fontSize: '1.5rem',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
              }}
            >
              <i className="fas fa-key"></i>
            </div>
            <h2 className="h4 text-dark fw-bold mb-1">Mot de passe oublié</h2>
            <p className="text-muted">
              Entrez votre email pour recevoir un code de vérification
            </p>
          </div>

          {/* Processus étapes */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-center flex-fill">
                <div className="d-inline-flex align-items-center justify-content-center mb-2"
                     style={{
                       width: '30px',
                       height: '30px',
                       background: '#667eea',
                       borderRadius: '50%',
                       color: 'white',
                       fontSize: '0.8rem',
                       fontWeight: 'bold'
                     }}>
                  1
                </div>
                <div className="small text-primary fw-bold">Email</div>
              </div>
              <div className="flex-shrink-0 mx-2">
                <i className="fas fa-arrow-right text-muted"></i>
              </div>
              <div className="text-center flex-fill">
                <div className="d-inline-flex align-items-center justify-content-center mb-2"
                     style={{
                       width: '30px',
                       height: '30px',
                       background: '#e9ecef',
                       borderRadius: '50%',
                       color: '#6c757d',
                       fontSize: '0.8rem',
                       fontWeight: 'bold'
                     }}>
                  2
                </div>
                <div className="small text-muted">Code</div>
              </div>
              <div className="flex-shrink-0 mx-2">
                <i className="fas fa-arrow-right text-muted"></i>
              </div>
              <div className="text-center flex-fill">
                <div className="d-inline-flex align-items-center justify-content-center mb-2"
                     style={{
                       width: '30px',
                       height: '30px',
                       background: '#e9ecef',
                       borderRadius: '50%',
                       color: '#6c757d',
                       fontSize: '0.8rem',
                       fontWeight: 'bold'
                     }}>
                  3
                </div>
                <div className="small text-muted">Nouveau</div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-dark">
                <i className="fas fa-envelope me-2 text-primary"></i>
                Adresse email
              </Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={handleChange}
                placeholder="votre.email@exemple.com"
                isInvalid={!!errors.email}
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  transition: 'all 0.3s ease'
                }}
                autoComplete="email"
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Information */}
            <div className="mb-4 p-3 bg-light rounded">
              <h6 className="fw-bold mb-2">
                <i className="fas fa-info-circle me-2 text-info"></i>
                Comment ça fonctionne ?
              </h6>
              <ol className="small mb-0 text-muted">
                <li>Nous envoyons un code à votre email</li>
                <li>Entrez le code de 6 chiffres</li>
                <li>Créez votre nouveau mot de passe</li>
              </ol>
            </div>

            {/* Bouton d'envoi */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-100 fw-semibold mb-4"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Envoyer le code de vérification
                </>
              )}
            </Button>

            {/* Liens */}
            <div className="text-center">
              <div className="mb-2">
                <Link 
                  to="/login" 
                  className="text-decoration-none fw-medium"
                  style={{ color: '#667eea' }}
                >
                  <i className="fas fa-arrow-left me-2"></i>
                  Retour à la connexion
                </Link>
              </div>
              <div>
                <span className="text-muted">Pas encore de compte ? </span>
                <Link 
                  to="/register" 
                  className="text-decoration-none fw-medium"
                  style={{ color: '#667eea' }}
                >
                  S'inscrire
                </Link>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ForgotPassword;