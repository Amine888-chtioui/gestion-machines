// src/layouts/AuthLayout.js
import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout min-vh-100 d-flex align-items-center" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           position: 'relative'
         }}>
      
      {/* Background overlay */}
      <div 
        className="position-absolute w-100 h-100"
        style={{
          background: 'rgba(0,0,0,0.1)',
          zIndex: 1
        }}
      ></div>

      {/* Background pattern */}
      <div 
        className="position-absolute w-100 h-100"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          zIndex: 0
        }}
      ></div>

      <Container className="position-relative" style={{ zIndex: 2 }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={8} md={6} lg={5} xl={4}>
            {/* Logo et titre */}
            <div className="text-center mb-4">
              <div className="mb-3">
                <i className="fas fa-industry display-4 text-white"></i>
              </div>
              <h1 className="h3 text-white fw-bold mb-2">Système de gestion des machines et composants</h1>
            </div>

            {/* Carte de contenu */}
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                {children}
              </Card.Body>
            </Card>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-white-50 small mb-0">
                © 2025 TELSOSPLICE TS3. Tous droits réservés.
              </p>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .auth-layout {
          min-height: 100vh;
        }

        .card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }

        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
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

        .text-white-50 {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        @media (max-width: 576px) {
          .container {
            padding-left: 15px;
            padding-right: 15px;
          }
          
          .card-body {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;