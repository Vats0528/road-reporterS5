import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { LogOut, Menu, X, MapPin, User, Settings, Eye, Clock, AlertTriangle } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { isSessionValidLocal, getSessionTimeRemainingLocal } from '../services/localAuthService';
import { SESSION_WARNING_BEFORE_EXPIRY } from '../utils/constants';

export default function Navbar() {
  const { currentUser, userData, logout, refreshUserData } = useAuth();
  const { isManager, isVisitor, isUser } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  const location = useLocation();

  // Vérification périodique de la session
  useEffect(() => {
    if (!currentUser) return;

    const checkSession = () => {
      if (!isSessionValidLocal()) {
        // Session expirée, déconnecter l'utilisateur
        handleLogout();
        return;
      }

      const timeRemaining = getSessionTimeRemainingLocal();
      setSessionTimeLeft(timeRemaining);
      
      // Afficher un avertissement si moins de 5 minutes restantes
      if (timeRemaining && timeRemaining <= SESSION_WARNING_BEFORE_EXPIRY) {
        setSessionWarning(true);
      } else {
        setSessionWarning(false);
      }
    };

    // Vérifier toutes les 30 secondes
    checkSession();
    const interval = setInterval(checkSession, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Formater le temps restant
  const formatTimeRemaining = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}min`;
    }
    return `${minutes}min`;
  };

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  // Vérifier si le lien est actif
  const isActive = (path) => location.pathname === path;

  // Classes pour les liens actifs
  const linkClasses = (path) => `
    flex items-center gap-2 transition-colors
    ${isActive(path) 
      ? 'text-white font-semibold' 
      : 'text-orange-100 hover:text-white'
    }
  `;

  return (
    <nav className="bg-gradient-to-r from-orange-600 to-red-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="text-white font-bold text-2xl">🛣️ Road Reporter</div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={linkClasses('/')}>
              Accueil
            </Link>
            
            {/* Lien carte publique - visible pour tous */}
            <Link to="/map" className={linkClasses('/map')}>
              <MapPin size={18} />
              Carte
            </Link>

            {/* Liens pour visiteurs non connectés */}
            {isVisitor && (
              <Link to="/login" className={linkClasses('/login')}>
                Connexion
              </Link>
            )}

            {/* Liens pour utilisateurs connectés */}
            {!isVisitor && (
              <>
                <Link to="/dashboard" className={linkClasses('/dashboard')}>
                  <User size={18} />
                  Tableau de bord
                </Link>
                
                {/* Lien gestion - uniquement pour les managers */}
                {isManager && (
                  <Link to="/manager" className={linkClasses('/manager')}>
                    <Settings size={18} />
                    Gestion
                  </Link>
                )}

                {/* Indicateur de rôle */}
                <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs text-white">
                  {isManager ? (
                    <>
                      <Settings size={14} />
                      Manager
                    </>
                  ) : (
                    <>
                      <User size={14} />
                      {userData?.displayName || 'Utilisateur'}
                    </>
                  )}
                </div>

                {/* Bouton Mon Profil */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 text-orange-100 hover:text-white transition-colors"
                  title="Modifier mon profil"
                >
                  <User size={18} />
                  Mon Profil
                </button>

                {/* Avertissement session */}
                {sessionWarning && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500 text-yellow-900 rounded text-xs font-medium animate-pulse">
                    <Clock size={12} />
                    {formatTimeRemaining(sessionTimeLeft)}
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-orange-100 hover:text-white transition-colors"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-orange-500 animate-slide-up">
            <Link 
              to="/" 
              className="flex items-center gap-2 py-3 text-white hover:text-orange-100"
              onClick={closeMenu}
            >
              Accueil
            </Link>
            
            {/* Carte publique */}
            <Link 
              to="/map" 
              className="flex items-center gap-2 py-3 text-white hover:text-orange-100"
              onClick={closeMenu}
            >
              <MapPin size={18} />
              Carte des signalements
            </Link>

            {/* Liens visiteurs */}
            {isVisitor && (
              <Link 
                to="/login" 
                className="flex items-center gap-2 py-3 text-white hover:text-orange-100"
                onClick={closeMenu}
              >
                Connexion
              </Link>
            )}

            {/* Liens utilisateurs connectés */}
            {!isVisitor && (
              <>
                {/* Indicateur de rôle */}
                <div className="py-3 flex items-center gap-2">
                  <div className="px-3 py-1 bg-white/20 rounded-full text-xs text-white inline-flex items-center gap-2">
                    {isManager ? (
                      <>
                        <Settings size={14} />
                        Manager: {userData?.displayName}
                      </>
                    ) : (
                      <>
                        <User size={14} />
                        {userData?.displayName || 'Utilisateur'}
                      </>
                    )}
                  </div>
                </div>

                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 py-3 text-white hover:text-orange-100"
                  onClick={closeMenu}
                >
                  <User size={18} />
                  Tableau de bord
                </Link>
                
                {isManager && (
                  <Link 
                    to="/manager" 
                    className="flex items-center gap-2 py-3 text-white hover:text-orange-100"
                    onClick={closeMenu}
                  >
                    <Settings size={18} />
                    Panneau de gestion
                  </Link>
                )}

                {/* Bouton profil mobile */}
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    closeMenu();
                  }}
                  className="flex items-center gap-2 w-full text-left py-3 text-white hover:text-orange-100"
                >
                  <User size={18} />
                  Mon Profil
                </button>

                {/* Avertissement session mobile */}
                {sessionWarning && (
                  <div className="flex items-center gap-2 py-3">
                    <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-yellow-900 rounded text-xs font-medium">
                      <AlertTriangle size={12} />
                      Session expire dans {formatTimeRemaining(sessionTimeLeft)}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left py-3 text-white hover:text-orange-100"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Profil Utilisateur */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userData={userData}
          refreshUserData={refreshUserData}
        />
      )}
    </nav>
  );
}
