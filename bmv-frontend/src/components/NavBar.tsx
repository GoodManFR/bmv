// NavBar mobile — barre de navigation en bas de l'écran
import React from 'react';
import { NavLink } from 'react-router-dom';

const NavBar: React.FC = () => {
  return (
    <nav className="navbar">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </NavLink>

      <NavLink to="/scanner" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📷</span>
        <span className="nav-label">Scanner</span>
      </NavLink>

      <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">📋</span>
        <span className="nav-label">Historique</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profil</span>
      </NavLink>
    </nav>
  );
};

export default NavBar;
