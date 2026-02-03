import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Unlock, Trash2, Search, RefreshCw, 
  Shield, User, Mail, Calendar, AlertTriangle, CheckCircle, X,
  Eye, EyeOff
} from 'lucide-react';
import { getAllUsers, createUserByManager, deleteUser, unblockUser } from '../services/authService';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Formulaire de création
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (!result.error) {
      setUsers(result.users);
    } else {
      showNotification(result.error, 'error');
    }
    setLoading(false);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    const result = await createUserByManager(
      newUser.email,
      newUser.password,
      newUser.displayName,
      newUser.role
    );

    if (result.error) {
      showNotification(result.error, 'error');
    } else {
      showNotification(`Utilisateur ${newUser.displayName} créé avec succès !`);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', displayName: '', role: 'user' });
      loadUsers();
    }
    setCreating(false);
  };

  const handleUnblock = async (email) => {
    const result = unblockUser(email);
    if (result.success) {
      showNotification(`${email} débloqué avec succès`);
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId, email) => {
    const result = await deleteUser(userId);
    if (result.error) {
      showNotification(result.error, 'error');
    } else {
      showNotification(`Utilisateur ${email} supprimé`);
      setDeleteConfirm(null);
      loadUsers();
    }
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compter par rôle
  const managerCount = users.filter(u => u.role === 'manager').length;
  const userCount = users.filter(u => u.role === 'user').length;

  // Vérifier les utilisateurs bloqués (localStorage)
  const getBlockedStatus = (email) => {
    const data = localStorage.getItem(`login_attempts_${email}`);
    if (!data) return null;
    const attempts = JSON.parse(data);
    if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
      return {
        blocked: true,
        remainingMinutes: Math.ceil((attempts.blockedUntil - Date.now()) / 60000)
      };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-up ${
          notification.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-emerald-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-orange-500" />
            Gestion des utilisateurs
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {users.length} utilisateurs • {managerCount} managers • {userCount} utilisateurs
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={18} />
            Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="input-field pl-12 w-full"
        />
      </div>

      {/* Liste des utilisateurs */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Utilisateur</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Rôle</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Inscription</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Statut</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const blockedStatus = getBlockedStatus(user.email);
                  return (
                    <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.role === 'manager' ? 'bg-orange-100' : 'bg-slate-100'
                          }`}>
                            {user.role === 'manager' ? (
                              <Shield size={20} className="text-orange-600" />
                            ) : (
                              <User size={20} className="text-slate-600" />
                            )}
                          </div>
                          <span className="font-medium text-slate-800">
                            {user.displayName || 'Sans nom'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'manager' 
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'manager' ? 'Manager' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar size={14} />
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {blockedStatus ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Bloqué ({blockedStatus.remainingMinutes}min)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {blockedStatus && (
                            <button
                              onClick={() => handleUnblock(user.email)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Débloquer"
                            >
                              <Unlock size={18} />
                            </button>
                          )}
                          {user.role !== 'manager' && (
                            <button
                              onClick={() => setDeleteConfirm(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-orange-500" />
                  Créer un utilisateur
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  className="input-field w-full"
                  placeholder="Jean Rakoto"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input-field w-full"
                  placeholder="jean@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="input-field w-full pr-12"
                    placeholder="Minimum 6 caractères"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rôle *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="user">Utilisateur</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Créer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-slate-600 mb-6">
                Voulez-vous vraiment supprimer l'utilisateur <strong>{deleteConfirm.displayName}</strong> ({deleteConfirm.email}) ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirm.uid, deleteConfirm.email)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
