// src/pages/auth/Login.js
import React, { useState } from 'react';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
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
        <div className="auth-icon mb-3">
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
              className="form-control-lg"
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
              className="form-control-lg"
              autoComplete="current-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-btn"
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
      <div className="help-section mt-4 pt-3">
        <div className="row text-center">
          <div className="col-4">
            <div className="help-item">
              <i className="fas fa-shield-alt text-success mb-1"></i>
              <p className="small text-muted mb-0">Sécurisé</p>
            </div>
          </div>
          <div className="col-4">
            <div className="help-item">
              <i className="fas fa-clock text-info mb-1"></i>
              <p className="small text-muted mb-0">24/7</p>
            </div>
          </div>
          <div className="col-4">
            <div className="help-item">
              <i className="fas fa-headset text-warning mb-1"></i>
              <p className="small text-muted mb-0">Support</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          font-size: 1.5rem;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .form-control-lg {
          padding: 0.75rem 1rem;
          font-size: 1rem;
          border-radius: 8px;
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }

        .form-control-lg:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          transform: translateY(-1px);
        }

        .password-toggle-btn {
          border-left: none;
          border: 2px solid #e9ecef;
          border-left: none;
        }

        .password-toggle-btn:hover {
          background-color: #f8f9fa;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .help-item {
          padding: 0.5rem;
        }

        .help-item i {
          font-size: 1.2rem;
          display: block;
        }

        @media (max-width: 576px) {
          .auth-icon {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }
          
          .form-control-lg {
            padding: 0.625rem 0.875rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;