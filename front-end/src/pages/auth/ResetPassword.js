// src/pages/auth/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, InputGroup } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Très faible' });

  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const resetToken = location.state?.resetToken;

  useEffect(() => {
    if (!email || !resetToken) {
      navigate('/forgot-password');
      return;
    }
  }, [email, resetToken, navigate]);

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (/[a-z]/.test(password)) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    let label = 'Très faible';
    let color = '#dc3545';
    if (score >= 20) { label = 'Faible'; color = '#fd7e14'; }
    if (score >= 40) { label = 'Moyen'; color = '#ffc107'; }
    if (score >= 60) { label = 'Fort'; color = '#20c997'; }
    if (score >= 80) { label = 'Très fort'; color = '#198754'; }

    return { score, label, color };
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

    if (!formData.password) {
      newErrors.password = 'Le nouveau mot de passe est requis';
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
      await apiService.post('/auth/reset-password', {
        email: email,
        reset_token: resetToken,
        password: formData.password,
        password_confirmation: formData.password_confirmation
      });
      
      toast.success('Mot de passe réinitialisé avec succès !');
      navigate('/login', { 
        state: { 
          message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.' 
        } 
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la réinitialisation';
      toast.error(errorMessage);
      setErrors({ password: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!email || !resetToken) {
    return null;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           padding: '2rem 1rem'
         }}>
      <Card style={{ 
        maxWidth: '500px', 
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
              <i className="fas fa-lock"></i>
            </div>
            <h2 className="h4 text-dark fw-bold mb-1">Nouveau mot de passe</h2>
            <p className="text-muted">
              Créez un nouveau mot de passe sécurisé pour<br />
              <strong>{email}</strong>
            </p>
          </div>

          {/* Formulaire */}
          <Form onSubmit={handleSubmit} noValidate>
            {/* Nouveau mot de passe */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold text-dark">
                <i className="fas fa-key me-2 text-primary"></i>
                Nouveau mot de passe
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Entrez votre nouveau mot de passe"
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
              
              {/* Indicateur de force du mot de passe */}
              {formData.password && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">Force du mot de passe</small>
                    <small style={{ color: passwordStrength.color, fontWeight: 'bold' }}>
                      {passwordStrength.label}
                    </small>
                  </div>
                  <div className="progress" style={{ height: '4px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${passwordStrength.score}%`,
                        backgroundColor: passwordStrength.color,
                        transition: 'all 0.3s ease'
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              <Form.Control.Feedback type="invalid">
                {errors.password}
              </Form.Control.Feedback>
            </Form.Group>

            {/* Confirmation du mot de passe */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-dark">
                <i className="fas fa-check-double me-2 text-primary"></i>
                Confirmer le mot de passe
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  placeholder="Confirmez votre nouveau mot de passe"
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

            {/* Conseils de sécurité */}
            <div className="mb-4 p-3 bg-light rounded">
              <h6 className="fw-bold mb-2">
                <i className="fas fa-shield-alt me-2 text-success"></i>
                Conseils pour un mot de passe sécurisé
              </h6>
              <ul className="small mb-0 text-muted">
                <li>Au moins 8 caractères (12+ recommandé)</li>
                <li>Mélange de majuscules et minuscules</li>
                <li>Incluez des chiffres et des symboles</li>
                <li>Évitez les informations personnelles</li>
              </ul>
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-100 fw-semibold mb-3"
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
                  Réinitialisation...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Réinitialiser le mot de passe
                </>
              )}
            </Button>

            {/* Lien retour */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-decoration-none fw-medium"
                style={{ color: '#667eea' }}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Retour à la connexion
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ResetPassword;