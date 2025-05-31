// src/pages/auth/Login.js
import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h4 className="fw-bold mb-2">Connexion</h4>
        <p className="text-muted">Connectez-vous à votre compte</p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Email */}
        <Form.Group className="mb-3">
          <Form.Label>
            <i className="fas fa-envelope me-2"></i>
            Adresse email
          </Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Entrez votre email"
            isInvalid={!!errors.email}
            disabled={loading}
          />
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Mot de passe */}
        <Form.Group className="mb-4">
          <Form.Label>
            <i className="fas fa-lock me-2"></i>
            Mot de passe
          </Form.Label>
          <Form.Control
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Entrez votre mot de passe"
            isInvalid={!!errors.password}
            disabled={loading}
          />
          <Form.Control.Feedback type="invalid">
            {errors.password}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Bouton de connexion */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-100 mb-3"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                className="me-2"
              />
              Connexion en cours...
            </>
          ) : (
            <>
              <i className="fas fa-sign-in-alt me-2"></i>
              Se connecter
            </>
          )}
        </Button>

        {/* Lien vers inscription */}
        <div className="text-center">
          <p className="text-muted mb-0">
            Pas encore de compte ?{' '}
            <Link 
              to="/register" 
              className="text-decoration-none fw-bold"
              style={{ color: '#667eea' }}
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </Form>

      {/* Informations de démonstration */}
      <Alert variant="info" className="mt-4">
        <Alert.Heading className="h6">
          <i className="fas fa-info-circle me-2"></i>
          Comptes de démonstration
        </Alert.Heading>
        <hr />
        <div className="small">
          <strong>Administrateur :</strong><br />
          Email: admin@example.com<br />
          Mot de passe: password<br /><br />
          
          <strong>Utilisateur :</strong><br />
          Email: user@example.com<br />
          Mot de passe: password
        </div>
      </Alert>

      <style jsx>{`
        .form-control {
          border-radius: 8px;
          border: 1px solid #e9ecef;
          padding: 12px 16px;
          transition: all 0.2s ease;
        }

        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }

        .form-label {
          font-weight: 600;
          color: #495057;
          margin-bottom: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .alert-info {
          border: none;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
        }

        .alert-info .alert-heading {
          color: #667eea;
        }

        a {
          transition: color 0.2s ease;
        }

        a:hover {
          color: #5a6fd8 !important;
        }
      `}</style>
    </div>
  );
};

export default Login;