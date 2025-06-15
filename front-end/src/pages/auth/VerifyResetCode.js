// src/pages/auth/VerifyResetCode.js
import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

const VerifyResetCode = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes en secondes
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    // Timer pour le compte à rebours
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    if (value.length > 1) {
      // Si on colle tout le code
      const newCode = value.slice(0, 6).split('');
      setCode([...newCode, ...Array(6 - newCode.length).fill('')]);
      // Focus sur le dernier input rempli
      const lastFilledIndex = Math.min(newCode.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return; // Seulement des chiffres

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Passer au champ suivant si on tape un chiffre
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Effacer les erreurs
    if (errors.code) {
      setErrors({});
    }
  };

  const handleKeyDown = (index, e) => {
    // Retour arrière : passer au champ précédent
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setErrors({ code: 'Veuillez entrer le code de vérification complet' });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/auth/verify-reset-code', {
        email: email,
        code: verificationCode
      });

      toast.success('Code vérifié avec succès !');
      
      // Rediriger vers la page de réinitialisation avec le token
      navigate('/reset-password', {
        state: {
          email: email,
          resetToken: response.data.reset_token
        }
      });

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Code de vérification invalide';
      toast.error(errorMessage);
      setErrors({ code: errorMessage });
      
      // Effacer le code en cas d'erreur
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      await apiService.forgotPassword({ email });
      toast.success('Un nouveau code a été envoyé !');
      setTimeLeft(900); // Réinitialiser le timer
      setCanResend(false);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
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
              <i className="fas fa-shield-alt"></i>
            </div>
            <h2 className="h4 text-dark fw-bold mb-1">Vérification du code</h2>
            <p className="text-muted">
              Entrez le code de 6 chiffres envoyé à<br />
              <strong>{email}</strong>
            </p>
          </div>

          {/* Timer */}
          <div className="text-center mb-4">
            <div className={`badge ${timeLeft > 300 ? 'bg-primary' : timeLeft > 60 ? 'bg-warning' : 'bg-danger'} p-2`}>
              <i className="fas fa-clock me-2"></i>
              {timeLeft > 0 ? `Expire dans ${formatTime(timeLeft)}` : 'Code expiré'}
            </div>
          </div>

          {/* Formulaire */}
          <Form onSubmit={handleSubmit} noValidate>
            {/* Champs pour le code */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-dark text-center d-block mb-3">
                Code de vérification
              </Form.Label>
              <div className="d-flex justify-content-center gap-2">
                {code.map((digit, index) => (
                  <Form.Control
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="text-center fw-bold"
                    style={{
                      width: '50px',
                      height: '60px',
                      fontSize: '1.5rem',
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      transition: 'all 0.3s ease'
                    }}
                    maxLength="6"
                    isInvalid={!!errors.code}
                  />
                ))}
              </div>
              {errors.code && (
                <div className="text-danger text-center mt-2">
                  <small>{errors.code}</small>
                </div>
              )}
            </Form.Group>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-100 fw-semibold mb-3"
              disabled={loading || timeLeft === 0}
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
                  Vérification...
                </>
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Vérifier le code
                </>
              )}
            </Button>

            {/* Renvoyer le code */}
            <div className="text-center mb-3">
              {canResend ? (
                <Button
                  variant="link"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-decoration-none fw-medium"
                  style={{ color: '#667eea' }}
                >
                  {resendLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-redo me-2"></i>
                      Renvoyer le code
                    </>
                  )}
                </Button>
              ) : (
                <span className="text-muted">
                  <i className="fas fa-info-circle me-2"></i>
                  Vous pourrez renvoyer le code dans {formatTime(timeLeft)}
                </span>
              )}
            </div>

            {/* Lien retour */}
            <div className="text-center">
              <Link 
                to="/forgot-password" 
                className="text-decoration-none fw-medium"
                style={{ color: '#667eea' }}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Changer d'adresse email
              </Link>
            </div>
          </Form>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="fw-bold mb-2">
              <i className="fas fa-lightbulb me-2 text-warning"></i>
              Instructions
            </h6>
            <ul className="small mb-0 text-muted">
              <li>Vérifiez votre boîte de réception et vos spams</li>
              <li>Le code expire après 15 minutes</li>
              <li>Vous pouvez coller directement le code complet</li>
            </ul>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default VerifyResetCode;