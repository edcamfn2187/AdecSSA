import React from 'react';
import { AppModule, ChurchSettings } from '../types';

interface PortalProps {
  churchSettings: ChurchSettings | null;
  allowedModules: AppModule[];
  onSelectModule: (module: AppModule) => void;
}

export const Portal: React.FC<PortalProps> = ({ churchSettings, allowedModules, onSelectModule }) => {
  const isAllowed = (module: AppModule) => allowedModules.includes(module);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12 animate-in fade-in duration-700">
        
        <div className="text-center space-y-6">
          {churchSettings?.logo_url ? (
            <img 
              src={churchSettings.logo_url} 
              alt="Logo da Igreja" 
              className="w-32 h-32 mx-auto object-contain drop-shadow-xl"
            />
          ) : (
            <div className="w-32 h-32 mx-auto bg-indigo-100 rounded-full flex items-center justify-center shadow-inner">
              <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          )}
          
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">
              {churchSettings?.name || 'Igreja Adec S. S. Anta'}
            </h1>
            <p className="text-slate-500 font-medium mt-2 text-lg">
              Portal Integrado de Gestão Eclesiástica
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Secretaria (Membros) */}
          {isAllowed(AppModule.MEMBERS) && (
            <button 
              onClick={() => onSelectModule(AppModule.MEMBERS)}
              className="group relative bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight relative z-10">Secretaria</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium relative z-10">Gestão de membros, congregações e relatórios demográficos.</p>
            </button>
          )}

          {/* Tesouraria (Financeiro) */}
          {isAllowed(AppModule.FINANCIAL) && (
            <button 
              onClick={() => onSelectModule(AppModule.FINANCIAL)}
              className="group relative bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight relative z-10">Tesouraria</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium relative z-10">Controle financeiro, lançamentos, ofertas e fluxo de caixa.</p>
            </button>
          )}

          {/* EBD Manager Pro */}
          {isAllowed(AppModule.EBD) && (
            <button 
              onClick={() => onSelectModule(AppModule.EBD)}
              className="group relative bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight relative z-10">EBD Pro</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium relative z-10">Gestão completa da Escola Bíblica Dominical.</p>
            </button>
          )}

          {/* Configurações */}
          {isAllowed(AppModule.CONFIG) && (
            <button 
              onClick={() => onSelectModule(AppModule.CONFIG)}
              className="group relative bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-slate-400 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-slate-100 text-slate-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight relative z-10">Configurações</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium relative z-10">Gestão de acessos, permissões e dados da igreja.</p>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
