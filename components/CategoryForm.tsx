
import React, { useState, useEffect } from 'react';
import { Category } from '../types';

interface CategoryFormProps {
  onSave: (categoryData: Omit<Category, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editCategory?: Category | null;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ onSave, onCancel, editCategory }) => {
  const [name, setName] = useState(editCategory?.name || '');
  const [color, setColor] = useState(editCategory?.color || '#6366f1');

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setColor(editCategory.color || '#6366f1');
    }
  }, [editCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('O nome da categoria é obrigatório.');
      return;
    }
    onSave({
      id: editCategory?.id,
      name,
      color
    });
  };

  const presets = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"></path></svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800">
            {editCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <p className="text-sm text-slate-500 font-medium">Categorize suas classes para melhor organização</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria *</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Adolescentes, Casais, Visitantes..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cor de Identificação</label>
          <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {presets.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-xl transition-all ${color === c ? 'ring-4 ring-indigo-500/30 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input 
              type="color" 
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-10 h-10 bg-transparent border-none cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-6 flex gap-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 px-6 py-4 text-slate-600 font-black hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200"
          >
            CANCELAR
          </button>
          <button 
            type="submit"
            className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {editCategory ? 'SALVAR ALTERAÇÕES' : 'CRIAR CATEGORIA'}
          </button>
        </div>
      </form>
    </div>
  );
};
