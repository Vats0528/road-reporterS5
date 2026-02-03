import React, { useState } from 'react';
import { checkAndFixUserRole, listAllUsers, fixAllUserRoles, createNewManager, fixManagerByUID } from '../services/fixUserRole';
import { RefreshCw, AlertTriangle, CheckCircle, Plus } from 'lucide-react';

const DiagnosticPage = () => {
  const [email, setEmail] = useState('manager@routestana.mg');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerName, setNewManagerName] = useState('Manager Principal');
  const [fixUID, setFixUID] = useState('ZJDunaIZgRVtH4StdldZ2iFc0Sx2');
  const [fixEmail, setFixEmail] = useState('manager@routestana.mg');

  const handleCheckUser = async () => {
    setLoading(true);
    const result = await checkAndFixUserRole(email);
    setResult(result);
    setLoading(false);
  };

  const handleListAllUsers = async () => {
    setLoading(true);
    const result = await listAllUsers();
    setAllUsers(result.users || []);
    setLoading(false);
  };

  const handleFixAllRoles = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir corriger TOUS les rôles ?')) {
      setLoading(true);
      const result = await fixAllUserRoles();
      alert(`✅ ${result.correctedCount} utilisateur(s) corrigé(s)`);
      await handleListAllUsers();
      setLoading(false);
    }
  };

  const handleCreateNewManager = async () => {
    if (!newManagerEmail) {
      alert('Veuillez entrer une adresse email');
      return;
    }
    
    setLoading(true);
    const result = await createNewManager(newManagerEmail, newManagerName);
    
    if (result.error) {
      alert('❌ Erreur: ' + result.error);
    } else {
      alert(`✅ Manager créé avec succès!\n\nUID: ${result.manager.uid}\nEmail: ${result.manager.email}\nRôle: ${result.manager.role}`);
      setNewManagerEmail('');
      setNewManagerName('Manager Principal');
      await handleListAllUsers();
    }
    setLoading(false);
  };

  const handleFixManagerByUID = async () => {
    if (!fixUID || !fixEmail) {
      alert('Veuillez remplir UID et Email');
      return;
    }
    
    setLoading(true);
    const result = await fixManagerByUID(fixUID, fixEmail, 'manager');
    
    if (result.error) {
      alert('❌ Erreur: ' + result.error);
    } else {
      alert(`✅ Manager corrigé avec succès!\n\nUID: ${result.manager.uid}\nEmail: ${result.manager.email}\nRôle: ${result.manager.role}\n\nRefraîchissez la page et reconnectez-vous!`);
      await handleListAllUsers();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">🔧 Diagnostic - Rôles Utilisateurs</h1>

        {/* Section 1: Vérifier un utilisateur spécifique */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Vérifier un utilisateur</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email de l'utilisateur..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
            />
            <button
              onClick={handleCheckUser}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Vérifier
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {result.error ? (
                <div className="flex items-start gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Erreur</p>
                    <p>{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {result.corrected ? '✅ Utilisateur corrigé!' : '✓ Utilisateur correct'}
                    </p>
                    <pre className="mt-2 bg-white p-3 rounded text-sm overflow-auto">
                      {JSON.stringify(result.user, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Lister tous les utilisateurs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleListAllUsers}
            disabled={loading}
            className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Lister tous les utilisateurs
          </button>

          {allUsers.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Rôle</th>
                    <th className="px-4 py-2 text-left">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((user) => (
                    <tr key={user.uid} className="border-t">
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2">{user.displayName}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          user.role === user.role.toLowerCase()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Corriger TOUS les rôles */}
        {allUsers.some(u => u.role !== u.role.toLowerCase()) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">
                  ⚠️ Utilisateurs avec rôles incorrects détectés
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  {allUsers.filter(u => u.role !== u.role.toLowerCase()).length} utilisateur(s) ont des rôles avec majuscules
                </p>
              </div>
            </div>
            <button
              onClick={handleFixAllRoles}
              disabled={loading}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
            >
              🔧 Corriger TOUS les rôles
            </button>
          </div>
        )}

        {/* Section 4: Créer un nouveau Manager */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer un nouveau Manager
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email du manager
              </label>
              <input
                type="email"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                placeholder="manager@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom d'affichage
              </label>
              <input
                type="text"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="Nom du manager"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <button
              onClick={handleCreateNewManager}
              disabled={loading || !newManagerEmail}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Créer le Manager
            </button>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <p className="font-semibold mb-1">📋 Important:</p>
              <p>Un manager sera créé avec le rôle 'manager' (minuscule) et pourra ensuite se connecter via le bouton "S'inscrire" avec le même email pour créer son compte Firebase Auth.</p>
            </div>
          </div>
        </div>

        {/* Section 5: Corriger un Manager existant par UID */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            🔧 Corriger un Manager existant
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 mb-4">
              <p className="font-semibold mb-1">⚠️ Utilisation:</p>
              <p>Si un utilisateur Firebase Auth n'a pas le bon document dans Firestore, utilisez cet outil pour corriger en utilisant l'UID Firebase.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                UID Firebase (depuis la console)
              </label>
              <input
                type="text"
                value={fixUID}
                onChange={(e) => setFixUID(e.target.value)}
                placeholder="ZJDunaIZgRVtH4StdldZ2iFc0Sx2"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={fixEmail}
                onChange={(e) => setFixEmail(e.target.value)}
                placeholder="manager@routestana.mg"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <button
              onClick={handleFixManagerByUID}
              disabled={loading || !fixUID || !fixEmail}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold"
            >
              🔧 Corriger le Manager
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <h3 className="font-semibold mb-2">💡 Instructions</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Utilisez "Vérifier un utilisateur" pour corriger un utilisateur spécifique</li>
            <li>Utilisez "Lister tous les utilisateurs" pour voir l'état de tous les utilisateurs</li>
            <li>Utilisez "Corriger TOUS les rôles" si plusieurs utilisateurs sont affectés</li>
            <li>Après correction, <strong>rafraîchissez la page</strong> et reconnectez-vous</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
