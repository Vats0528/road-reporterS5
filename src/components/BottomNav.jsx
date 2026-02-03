import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Map, LayoutDashboard, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Navigation mobile en bas de l'écran
 * Visible uniquement sur mobile (md:hidden)
 */
export default function BottomNav() {
  const { currentUser } = useAuth();
  const { isManager, isVisitor } = usePermissions();
  const location = useLocation();

  // Ne pas afficher sur les pages de login/register
  const hiddenPaths = ['/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  // Configuration des liens selon le rôle
  const getNavItems = () => {
    const baseItems = [
      { path: '/', icon: Home, label: 'Accueil' },
      { path: '/map', icon: Map, label: 'Carte' },
    ];

    if (isVisitor) {
      return [
        ...baseItems,
        { path: '/login', icon: User, label: 'Connexion' },
      ];
    }

    const userItems = [
      ...baseItems,
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    if (isManager) {
      userItems.push({ path: '/manager', icon: Settings, label: 'Gestion' });
    }

    return userItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `
            bottom-nav-item
            ${isActive ? 'active' : ''}
          `}
        >
          <Icon className="bottom-nav-item-icon" />
          <span className="bottom-nav-item-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Composant FAB (Floating Action Button) pour ajouter un signalement
 */
export function FloatingActionButton({ onClick, icon: Icon, label, extended = false }) {
  return (
    <button
      onClick={onClick}
      className={`fab ${extended ? 'fab-extended' : ''}`}
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
      {extended && <span className="font-semibold">{label}</span>}
    </button>
  );
}

/**
 * Wrapper pour ajouter un padding en bas pour le contenu
 * afin d'éviter que le contenu soit caché par la navigation mobile
 */
export function MobileContentWrapper({ children, className = '' }) {
  return (
    <div className={`pb-20 md:pb-0 ${className}`}>
      {children}
    </div>
  );
}
