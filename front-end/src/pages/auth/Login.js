// src/pages/auth/Login.js - Version simplifiée
import React, { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    if (!validateForm()) return;

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
    <div className="login-form">
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
          <i className="fas fa-sign-in-alt"></i>
        </div>
        <h2 className="h4 text-dark fw-bold mb-1">Connexion</h2>
        <p className="text-muted">Accédez à votre espace de gestion</p>
      </div>

      {/* Formulaire */}
      <Form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-envelope me-2 text-primary"></i>
            Adresse email
          </Form.Label>
          <InputGroup>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
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
            />
          </InputGroup>
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Mot de passe */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-lock me-2 text-primary"></i>
            Mot de passe
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Votre mot de passe"
              isInvalid={!!errors.password}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                borderRadius: '8px 0 0 8px',
                border: '2px solid #e9ecef',
                borderRight: 'none',
                transition: 'all 0.3s ease'
              }}
              autoComplete="current-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                border: '2px solid #e9ecef',
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0'
              }}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">
            {errors.password}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Options */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Form.Check
            type="checkbox"
            id="remember-me"
            label="Se souvenir de moi"
            className="text-muted"
          />
          <Link 
            to="/forgot-password" 
            className="text-decoration-none small fw-medium"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Bouton de connexion */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-100 fw-semibold"
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
              Connexion en cours...
            </>
          ) : (
            <>
              <i className="fas fa-sign-in-alt me-2"></i>
              Se connecter
            </>
          )}
        </Button>
      </Form>

      {/* Lien vers l'inscription */}
      <div className="text-center mt-4 pt-3 border-top">
        <p className="text-muted mb-0">
          Pas encore de compte ?{' '}
          <Link 
            to="/register" 
            className="text-decoration-none fw-semibold"
          >
            Créer un compte
          </Link>
        </p>
      </div>

      {/* Section d'aide */}
      <div className="mt-4 pt-3">
        <div className="row text-center">
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-shield-alt text-success mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">Sécurisé</p>
            </div>
          </div>
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-clock text-info mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">24/7</p>
            </div>
          </div>
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-headset text-warning mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles intégrés */}
      <style jsx>{`
        .form-control:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
          transform: translateY(-1px);
        }

        .btn-primary:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
        }

        .btn-primary:active {
          transform: translateY(0) !important;
        }

        @media (max-width: 576px) {
          .auth-icon {
            width: 50px !important;
            height: 50px !important;
            font-size: 1.25rem !important;
          }
          
          .form-control {
            padding: 0.625rem 0.875rem !important;
            font-size: 0.95rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;