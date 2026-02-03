import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import { ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-slate-600 hover:text-orange-600 transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Retour à l'accueil</span>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Illustration / Info */}
          <div className="hidden md:block order-2 md:order-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl transform -rotate-3"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
                <h3 className="text-2xl font-display font-bold text-slate-800 mb-4">
                  Rejoignez Routes Tana
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Créez votre compte gratuitement et participez à l'amélioration
                  des infrastructures routières d'Antananarivo.
                </p>
                
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
                  <h4 className="font-display font-bold text-slate-800 mb-3">
                    Vos avantages
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span>Signalements illimités</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span>Suivi de vos signalements</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span>Notifications de mises à jour</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span>Statistiques personnalisées</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-xs text-slate-500 italic">
                    "Ensemble, nous construisons une ville plus sûre et mieux entretenue
                    pour tous les habitants d'Antananarivo."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="order-1 md:order-2">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;