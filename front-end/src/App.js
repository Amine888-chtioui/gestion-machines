// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout.js";
import AuthLayout from "./layouts/AuthLayout";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyResetCode from "./pages/auth/VerifyResetCode";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Machines from "./pages/Machines";
import MachineDetail from "./pages/MachineDetail";
import Composants from "./pages/Composants";
import ComposantDetail from "./pages/ComposantDetail";
import Demandes from "./pages/Demandes";
import DemandeDetail from "./pages/DemandeDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Types from "./pages/Types";

// Styles
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Composant pour protéger les routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Composant pour rediriger si déjà connecté
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques d'authentification */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <Login />
            </AuthLayout>
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <Register />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Routes de réinitialisation de mot de passe */}
      <Route 
        path="/forgot-password" 
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/verify-reset-code" 
        element={
          <PublicRoute>
            <VerifyResetCode />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/reset-password" 
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } 
      />

      {/* Routes protégées */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/machines"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Machines />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/machines/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MachineDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/composants"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Composants />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/composants/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ComposantDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/demandes"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Demandes />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/demandes/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DemandeDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Notifications />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/types"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Types />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      {/* Route 404 */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{ zIndex: 9999 }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;