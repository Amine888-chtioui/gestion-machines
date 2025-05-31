// src/pages/auth/Register.js
import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
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

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'La confirmation du mot de passe est requise';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Les mots de passe ne correspondent pas';
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
      const result = await register(formData);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h4 className="fw-bold mb-2">Créer un compte</h4>
        <p className="text-muted">Rejoignez la plateforme TELSOSPLICE TS3</p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Nom complet */}
        <Form.Group className="mb-3">
          <Form.Label>
            <i className="fas fa-user me-2"></i>
            Nom complet
          </Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Entrez votre nom complet"
            isInvalid={!!errors.name}
            disabled={loading}
          />
          <Form.Control.Feedback type="invalid">
            {errors.name}
          </Form.Control.Feedback>
        </Form.Group>

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

        {/* Rôle */}
        <Form.Group className="mb-3">
          <Form.Label>
            <i className="fas fa-user-tag me-2"></i>
            Rôle
          </Form.Label>
          <Form.Select
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </Form.Select>
          <Form.Text className="text-muted">
            Choisissez votre niveau d'accès dans le système
          </Form.Text>
        </Form.Group>

        {/* Mot de passe */}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="fas fa-lock me-2"></i>
                Mot de passe
              </Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Créez un mot de passe"
                isInvalid={!!errors.password}
                disabled={loading}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-4">
              <Form.Label>
                <i className="fas fa-lock me-2"></i>
                Confirmer le mot de passe
              </Form.Label>
              <Form.Control
                type="password"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                placeholder="Confirmez votre mot de passe"
                isInvalid={!!errors.password_confirmation}
                disabled={loading}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password_confirmation}
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        {/* Bouton d'inscription */}
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
              Création du compte...
            </>
          ) : (
            <>
              <i className="fas fa-user-plus me-2"></i>
              Créer mon compte
            </>
          )}
        </Button>

        {/* Lien vers connexion */}
        <div className="text-center">
          <p className="text-muted mb-0">
            Déjà un compte ?{' '}
            <Link 
              to="/login" 
              className="text-decoration-none fw-bold"
              style={{ color: '#667eea' }}
            >
              Se connecter
            </Link>
          </p>
        </div>
      </Form>

      {/* Informations sur les rôles */}
      <Alert variant="info" className="mt-4">
        <Alert.Heading className="h6">
          <i className="fas fa-info-circle me-2"></i>
          À propos des rôles
        </Alert.Heading>
        <hr />
        <div className="small">
          <strong>Utilisateur :</strong> Peut créer des demandes, consulter les machines et composants<br />
          <strong>Administrateur :</strong> Accès complet pour gérer le système, approuver les demandes
        </div>
      </Alert>

      <style jsx>{`
        .form-control, .form-select {
          border-radius: 8px;
          border: 1px solid #e9ecef;
          padding: 12px 16px;
          transition: all 0.2s ease;
        }

        .form-control:focus, .form-select:focus {
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

        .form-text {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default Register;