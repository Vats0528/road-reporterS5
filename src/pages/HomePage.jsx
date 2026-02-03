import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, MapPin, AlertCircle, TrendingUp, Camera, Shield, Clock, Map } from 'lucide-react';

export default function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-32 px-4 bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-200 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-sm font-medium text-orange-600 mb-6 shadow-sm">
            <MapPin className="w-4 h-4" />
            Antananarivo, Madagascar
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">
            Signalez les Routes Endommagées
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto px-4">
            Aidez à maintenir les routes d'Antananarivo en bon état. Signalez les nids-de-poule, les fissures et les dangers routiers en temps réel.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            {!currentUser ? (
              <>
                <Link to="/register" className="btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg py-4">
                  Commencer Gratuitement <ArrowRight size={20} />
                </Link>
                <Link to="/map" className="btn-secondary inline-flex items-center justify-center gap-2">
                  <Map size={20} />
                  Voir la Carte
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg py-4">
                Accéder au tableau de bord <ArrowRight size={20} />
              </Link>
            )}
          </div>
          
          {/* Quick stats under hero */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 sm:gap-12 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              100% Gratuit
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Temps réel
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Facile à utiliser
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Mobile friendly steps */}
      <section className="py-12 sm:py-16 px-4 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-center text-slate-800">
            Comment ça marche ?
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-0">
              <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl sm:mb-4 shadow-lg">
                1
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2">Localisez le problème</h3>
                <p className="text-sm text-slate-600">Cliquez sur la carte pour marquer l'emplacement exact</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-0">
              <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl sm:mb-4 shadow-lg">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2">Décrivez & photographiez</h3>
                <p className="text-sm text-slate-600">Ajoutez une description et des photos du dommage</p>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-0">
              <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl sm:mb-4 shadow-lg">
                3
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2">Suivez l'évolution</h3>
                <p className="text-sm text-slate-600">Recevez des mises à jour sur l'état de la réparation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-center text-slate-900">
            Pourquoi utiliser Road Reporter?
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Une application conçue pour simplifier le signalement et améliorer nos routes
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="card hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="text-orange-600" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900">
                Localisation GPS
              </h3>
              <p className="text-sm text-slate-600">
                Positionnement précis grâce à la carte interactive OpenStreetMap
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <Camera className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900">
                Photos jointes
              </h3>
              <p className="text-sm text-slate-600">
                Ajoutez jusqu'à 5 photos pour documenter les dégâts
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="text-emerald-600" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900">
                Suivi en temps réel
              </h3>
              <p className="text-sm text-slate-600">
                Suivez l'avancement : nouveau, en cours, terminé
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900">
                Sécurisé
              </h3>
              <p className="text-sm text-slate-600">
                Données protégées avec Firebase Authentication
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-r from-orange-600 to-red-600">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center text-white">
            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">500+</div>
              <p className="text-xs sm:text-base text-orange-100">Signalements</p>
            </div>
            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">250+</div>
              <p className="text-xs sm:text-base text-orange-100">Réparations</p>
            </div>
            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">10K+</div>
              <p className="text-xs sm:text-base text-orange-100">Utilisateurs</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 text-slate-900">
            Prêt à Contribuer?
          </h2>
          <p className="text-base sm:text-xl text-slate-600 mb-8 px-4">
            Rejoignez notre communauté et aidez à améliorer les infrastructures routières d'Antananarivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!currentUser ? (
              <>
                <Link to="/register" className="btn-primary inline-flex items-center justify-center gap-2 py-4">
                  S'inscrire Maintenant <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn-secondary inline-flex items-center justify-center">
                  J'ai déjà un compte
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn-primary inline-flex items-center justify-center gap-2 py-4">
                Aller au Tableau de Bord <ArrowRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🛣️</span>
            <span className="text-white font-bold text-lg">Road Reporter</span>
          </div>
          <p className="text-sm mb-4">
            Application de signalement des problèmes routiers à Antananarivo
          </p>
          <p className="text-xs text-slate-500">
            © 2026 Road Reporter. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
