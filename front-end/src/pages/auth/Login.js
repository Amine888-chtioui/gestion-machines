// src/pages/auth/Login.js - Version avec lien mot de passe oublié
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
            borderRadius: '50%'
          }}
        >
          <i className="fas fa-user text-white fs-4"></i>
        </div>
        <h2 className="fw-bold mb-2">Connexion</h2>
        <p className="text-muted mb-0">Accédez à votre espace personnel</p>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Email */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-envelope me-2 text-primary"></i>
            Adresse email
          </Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
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
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Mot de passe */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-lock me-2 text-primary"></i>
            Mot de passe
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? "text" : "password"}
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
                borderRight: 'none'
              }}
              autoComplete="current-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                borderRadius: '0 8px 8px 0',
                border: '2px solid #e9ecef',
                borderLeft: 'none'
              }}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </Button>
            <Form.Control.Feedback type="invalid">
              {errors.password}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        {/* Lien mot de passe oublié */}
        <div className="text-end mb-3">
          <Link 
            to="/forgot-password" 
            className="text-decoration-none small fw-medium"
            style={{ color: '#667eea' }}
          >
            <i className="fas fa-key me-1"></i>
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Bouton de connexion */}
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
              Connexion...
            </>
          ) : (
            <>
              <i className="fas fa-sign-in-alt me-2"></i>
              Se connecter
            </>
          )}
        </Button>

        {/* Lien d'inscription */}
        <div className="text-center">
          <span className="text-muted">Pas encore de compte ?</span>{' '}
          <Link 
            to="/register" 
            className="text-decoration-none fw-semibold"
            style={{ color: '#667eea' }}
          >
            Créer un compte
          </Link>
        </div>
      </Form>

      {/* Footer */}
      <div className="d-flex justify-content-center align-items-center mt-5 pt-4 border-top">
        <div className="d-flex align-items-center text-muted small">
          <div className="me-4 text-center">
            <i className="fas fa-shield-alt text-success mb-1 d-block"></i>
            <span>Sécurisé</span>
          </div>
          <div className="me-4 text-center">
            <i className="fas fa-clock text-info mb-1 d-block"></i>
            <span>24/7</span>
          </div>
          <div className="text-center">
            <i className="fas fa-headphones text-warning mb-1 d-block"></i>
            <span>Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;