// src/pages/auth/Register.js - Version simplifiée
import React, { useState } from 'react';
import { Form, Button, InputGroup, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', password_confirmation: '', role: 'user'
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { register } = useAuth();
  const navigate = useNavigate();

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 12.5;
    if (password.match(/[^a-zA-Z0-9]/)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'danger';
    if (passwordStrength < 60) return 'warning';
    if (passwordStrength < 80) return 'info';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return 'Faible';
    if (passwordStrength < 60) return 'Moyen';
    if (passwordStrength < 80) return 'Fort';
    return 'Très fort';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
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
    if (!validateForm()) return;

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
    <div className="register-form">
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
          <i className="fas fa-user-plus"></i>
        </div>
        <h2 className="h4 text-dark fw-bold mb-1">Créer un compte</h2>
        <p className="text-muted">Rejoignez notre plateforme de gestion</p>
      </div>

      {/* Formulaire */}
      <Form onSubmit={handleSubmit} noValidate>
        {/* Nom complet */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-user me-2 text-primary"></i>
            Nom complet
          </Form.Label>
          <Form.Control
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Votre nom complet"
            isInvalid={!!errors.name}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: '2px solid #e9ecef',
              transition: 'all 0.3s ease'
            }}
            autoComplete="name"
          />
          <Form.Control.Feedback type="invalid">
            {errors.name}
          </Form.Control.Feedback>
        </Form.Group>

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
          <Form.Control.Feedback type="invalid">
            {errors.email}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Rôle */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-user-tag me-2 text-primary"></i>
            Rôle
          </Form.Label>
          <Form.Select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: '2px solid #e9ecef',
              transition: 'all 0.3s ease'
            }}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </Form.Select>
        </Form.Group>

        {/* Mot de passe */}
        <Form.Group className="mb-3">
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
              placeholder="Créez un mot de passe fort"
              isInvalid={!!errors.password}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                borderRadius: '8px 0 0 8px',
                border: '2px solid #e9ecef',
                borderRight: 'none',
                transition: 'all 0.3s ease'
              }}
              autoComplete="new-password"
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
          
          {/* Indicateur de force */}
          {formData.password && (
            <div className="mt-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">Force du mot de passe:</small>
                <small className={`text-${getPasswordStrengthColor()} fw-semibold`}>
                  {getPasswordStrengthText()}
                </small>
              </div>
              <ProgressBar 
                now={passwordStrength} 
                variant={getPasswordStrengthColor()} 
                style={{ height: '4px' }}
              />
            </div>
          )}
        </Form.Group>

        {/* Confirmation mot de passe */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold text-dark">
            <i className="fas fa-lock me-2 text-primary"></i>
            Confirmer le mot de passe
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showConfirmPassword ? 'text' : 'password'}
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              placeholder="Confirmez votre mot de passe"
              isInvalid={!!errors.password_confirmation}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                borderRadius: '8px 0 0 8px',
                border: '2px solid #e9ecef',
                borderRight: 'none',
                transition: 'all 0.3s ease'
              }}
              autoComplete="new-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                border: '2px solid #e9ecef',
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0'
              }}
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">
            {errors.password_confirmation}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Conditions */}
        <Form.Group className="mb-4">
          <Form.Check
            type="checkbox"
            id="terms"
            required
            label={
              <span className="text-muted">
                J'accepte les{' '}
                <Link to="/terms" className="text-decoration-none">
                  conditions d'utilisation
                </Link>
                {' '}et la{' '}
                <Link to="/privacy" className="text-decoration-none">
                  politique de confidentialité
                </Link>
              </span>
            }
          />
        </Form.Group>

        {/* Bouton d'inscription */}
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
              Création en cours...
            </>
          ) : (
            <>
              <i className="fas fa-user-plus me-2"></i>
              Créer mon compte
            </>
          )}
        </Button>
      </Form>

      {/* Lien vers la connexion */}
      <div className="text-center mt-4 pt-3 border-top">
        <p className="text-muted mb-0">
          Déjà un compte ?{' '}
          <Link 
            to="/login" 
            className="text-decoration-none fw-semibold"
          >
            Se connecter
          </Link>
        </p>
      </div>

      {/* Avantages */}
      <div className="mt-4 pt-3">
        <h6 className="text-center text-muted mb-3">Pourquoi nous rejoindre ?</h6>
        <div className="row text-center">
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-cogs text-primary mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">Gestion complète</p>
            </div>
          </div>
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-chart-line text-success mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">Suivi en temps réel</p>
            </div>
          </div>
          <div className="col-4">
            <div style={{ padding: '0.5rem' }}>
              <i className="fas fa-mobile-alt text-info mb-1" style={{ fontSize: '1.2rem', display: 'block' }}></i>
              <p className="small text-muted mb-0">Interface moderne</p>
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

        .progress {
          border-radius: 2px;
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

export default Register;