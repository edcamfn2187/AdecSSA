import React, { useState, useEffect } from 'react';
import { Tithe, TithePayer, ContributionType, Transaction } from '../types';
import { api } from '../services/api';

export const TithesManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'cadastro' | 'tipos'>('lancamentos');
  const [subTab, setSubTab] = useState<'entradas' | 'saidas'>('entradas');
  const [tithePayers, setTithePayers] = useState<TithePayer[]>([]);
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false);
  const [editingPayer, setEditingPayer] = useState<TithePayer | null>(null);
  const [payerFormData, setPayerFormData] = useState<Partial<TithePayer>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Type Modal states
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ContributionType | null>(null);
  const [typeFormData, setTypeFormData] = useState<Partial<ContributionType>>({});
  const [isSavingType, setIsSavingType] = useState(false);

  // Tithe Modal states
  const [isTitheModalOpen, setIsTitheModalOpen] = useState(false);
  const [titheFormData, setTitheFormData] = useState<{
    payer_id: string;
    month: string;
    entries: { type_id: string; amount: string }[];
  }>({
    payer_id: '',
    month: '',
    entries: [{ type_id: '', amount: '' }]
  });
  const [isSavingTithe, setIsSavingTithe] = useState(false);
  const [isEditingTithe, setIsEditingTithe] = useState(false);

  // Expense Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    category: 'Manutenção',
    date: new Date().toISOString().split('T')[0]
  });
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // Fetch types
      const typesData = await api.get('contribution_types');
      setContributionTypes(typesData || []);

      // Fetch payers
      const payersData = await api.get('tithe_payers');
      setTithePayers(payersData || []);

      // Fetch tithes for the selected month
      const tithesData = await api.get('tithes');
      const filteredTithes = (tithesData || []).filter((t: any) => t.month === selectedMonth);
      setTithes(filteredTithes);

      // Fetch expenses (transactions of type EXPENSE)
      const transData = await api.get('transactions');
      const filteredTrans = (transData || [])
        .filter((t: any) => t.type === 'EXPENSE')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(filteredTrans);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('not found') || e.message?.includes('relation')) {
        setDbError('As tabelas financeiras não foram encontradas no banco de dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'lancamentos' | 'cadastro' | 'tipos') => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const filteredPayers = tithePayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pastores = filteredPayers.filter(p => p.category === 'PASTOR_OBREIRO');
  const cooperadores = filteredPayers.filter(p => p.category === 'COOPERADOR_MEMBRO');

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalForCategory = (payers: TithePayer[]) => {
    return payers.reduce((total, payer) => {
      const tithe = tithes.find(t => t.payer_id === payer.id);
      return total + (tithe?.amount || 0);
    }, 0);
  };

  const totalPastores = getTotalForCategory(pastores);
  const totalCooperadores = getTotalForCategory(cooperadores);
  const totalGeral = totalPastores + totalCooperadores;

  const handleSavePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerFormData.name || !payerFormData.category) return;
    
    setIsSaving(true);
    try {
      if (editingPayer) {
        await api.put('tithe_payers', editingPayer.id, {
          name: payerFormData.name,
          category: payerFormData.category
        });
      } else {
        await api.post('tithe_payers', {
          name: payerFormData.name,
          category: payerFormData.category
        });
      }
      
      setIsPayerModalOpen(false);
      setEditingPayer(null);
      setPayerFormData({});
      fetchData();
    } catch (err) {
      console.error('Error saving payer:', err);
      alert('Erro ao salvar ofertante. Verifique se a tabela existe no Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name) return;
    
    setIsSavingType(true);
    try {
      if (editingType) {
        await api.put('contribution_types', editingType.id, { name: typeFormData.name });
      } else {
        await api.post('contribution_types', { name: typeFormData.name });
      }
      
      setIsTypeModalOpen(false);
      setEditingType(null);
      setTypeFormData({});
      fetchData();
    } catch (err) {
      console.error('Error saving type:', err);
      alert('Erro ao salvar tipo. Verifique se a tabela existe no Supabase.');
    } finally {
      setIsSavingType(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir Tipo',
      message: 'Tem certeza que deseja excluir este tipo de contribuição?',
      onConfirm: async () => {
        try {
          await api.delete('contribution_types', id);
          fetchData();
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Error deleting type:', err);
          alert('Erro ao excluir tipo.');
        }
      }
    });
  };

  const openTypeModal = (type?: ContributionType) => {
    if (type) {
      setEditingType(type);
      setTypeFormData(type);
    } else {
      setEditingType(null);
      setTypeFormData({});
    }
    setIsTypeModalOpen(true);
  };

  const handleSaveTithe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titheFormData.payer_id || !titheFormData.month || titheFormData.entries.length === 0) return;

    // Ensure all entries have type and amount (allowing 0)
    if (titheFormData.entries.some(entry => !entry.type_id || entry.amount === undefined || entry.amount === null || entry.amount === '')) {
      alert('Preencha todos os tipos e valores.');
      return;
    }

    setIsSavingTithe(true);
    try {
      // 1. Find existing tithes for this payer and month
      const existingTithes = tithes.filter(t => 
        t.payer_id === titheFormData.payer_id && 
        t.month === titheFormData.month
      );

      // 2. Find tithes to delete (exist in DB but not in the new entries list)
      // Only delete if we are in explicit edit mode
      if (isEditingTithe) {
        const typesInForm = titheFormData.entries.map(e => e.type_id);
        const tithesToDelete = existingTithes.filter(t => !typesInForm.includes(t.type_id || ''));

        for (const t of tithesToDelete) {
          await api.delete('tithes', t.id);
        }
      }

      // 3. Insert or update
      for (const entry of titheFormData.entries) {
        const existingTithe = existingTithes.find(t => t.type_id === entry.type_id);
        const amountNum = parseFloat(entry.amount) || 0;

        if (existingTithe) {
          // If editing, we overwrite. If not, we unify (sum).
          const newAmount = isEditingTithe ? amountNum : (existingTithe.amount + amountNum);
          
          await api.put('tithes', existingTithe.id, { amount: newAmount });
        } else {
          await api.post('tithes', {
            payer_id: titheFormData.payer_id,
            type_id: entry.type_id,
            amount: amountNum,
            month: titheFormData.month,
            date: new Date().toISOString()
          });
        }
      }

      setIsTitheModalOpen(false);
      setTitheFormData({payer_id: '', month: selectedMonth, entries: [{ type_id: '', amount: '' }]});
      fetchData();
    } catch (err) {
      console.error('Error saving tithe:', err);
      alert('Erro ao lançar contribuição. Verifique se a tabela existe no Supabase.');
    } finally {
      setIsSavingTithe(false);
    }
  };

  const handleDeleteTithe = async (payerId: string, month: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir Lançamentos',
      message: 'Tem certeza que deseja excluir todos os lançamentos deste ofertante neste mês?',
      onConfirm: async () => {
        try {
          const tithesToDelete = tithes.filter(t => t.payer_id === payerId && t.month === month);
          for (const t of tithesToDelete) {
            await api.delete('tithes', t.id);
          }
          fetchData();
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Error deleting tithes:', err);
          alert('Erro ao excluir lançamentos.');
        }
      }
    });
  };

  const handleDeletePayer = async (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir Ofertante',
      message: 'Tem certeza que deseja excluir este ofertante? Todos os lançamentos vinculados também serão afetados.',
      onConfirm: async () => {
        try {
          await api.delete('tithe_payers', id);
          fetchData();
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Error deleting payer:', err);
          alert('Erro ao excluir ofertante.');
        }
      }
    });
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.description || expenseFormData.amount === undefined || expenseFormData.amount === null || expenseFormData.amount === '' || !expenseFormData.date) return;

    setIsSavingExpense(true);
    try {
      const amountNum = parseFloat(expenseFormData.amount) || 0;
      
      if (editingExpense) {
        await api.put('transactions', editingExpense.id, {
          description: expenseFormData.description,
          amount: amountNum,
          category: expenseFormData.category,
          date: expenseFormData.date
        });
      } else {
        await api.post('transactions', {
          description: expenseFormData.description,
          amount: amountNum,
          type: 'EXPENSE',
          category: expenseFormData.category,
          date: expenseFormData.date
        });
      }
      
      setIsExpenseModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar despesa.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir Despesa',
      message: 'Tem certeza que deseja excluir esta despesa?',
      onConfirm: async () => {
        try {
          await api.delete('transactions', id);
          fetchData();
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          console.error(e);
          alert('Erro ao excluir despesa.');
        }
      }
    });
  };

  const openExpenseModal = (expense?: Transaction) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: expense.date
      });
    } else {
      setEditingExpense(null);
      setExpenseFormData({
        description: '',
        amount: '',
        category: 'Manutenção',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setIsExpenseModalOpen(true);
  };

  const openPayerModal = (payer?: TithePayer) => {
    if (payer) {
      setEditingPayer(payer);
      setPayerFormData(payer);
    } else {
      setEditingPayer(null);
      setPayerFormData({ category: 'COOPERADOR_MEMBRO' });
    }
    setIsPayerModalOpen(true);
  };

  const renderTable = (title: string, payers: TithePayer[], total: number) => (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
          <p className="text-xl font-black text-emerald-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
              <th className="px-6 py-5">Nome</th>
              <th className="px-8 py-5 text-right w-48">Valor (R$)</th>
              <th className="px-6 py-5 text-right w-32">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payers.map(payer => {
              const payerTithes = tithes.filter(t => t.payer_id === payer.id);
              const totalAmount = payerTithes.reduce((sum, t) => sum + t.amount, 0);
              
              return (
                <tr key={payer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 font-bold text-slate-800">{payer.name}</td>
                  <td className="px-8 py-5 text-right">
                    {payerTithes.length > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="font-black text-emerald-600">
                          {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          {payerTithes.map(t => {
                            const typeName = contributionTypes.find(ct => ct.id === t.type_id)?.name || 'Dízimo';
                            return `${typeName}: ${t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                          }).join(' | ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-medium">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {payerTithes.length > 0 && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setTitheFormData({
                              payer_id: payer.id,
                              month: selectedMonth,
                              entries: payerTithes.map(t => ({ type_id: t.type_id || '', amount: t.amount.toString() }))
                            });
                            setIsEditingTithe(true);
                            setIsTitheModalOpen(true);
                          }} 
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-xl hover:bg-emerald-50"
                          title="Editar lançamentos"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteTithe(payer.id, selectedMonth)} 
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50"
                          title="Excluir lançamentos"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => handleTabChange('lancamentos')} 
          className={`pb-4 font-bold text-sm transition-colors ${activeTab === 'lancamentos' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Lançamentos
        </button>
        <button 
          onClick={() => handleTabChange('cadastro')} 
          className={`pb-4 font-bold text-sm transition-colors ${activeTab === 'cadastro' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Cadastro de Ofertantes
        </button>
        <button 
          onClick={() => handleTabChange('tipos')} 
          className={`pb-4 font-bold text-sm transition-colors ${activeTab === 'tipos' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Tipos de Contribuição
        </button>
      </div>

      {activeTab === 'lancamentos' && (
        <>
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Lançamento</h2>
              <p className="text-slate-500 font-medium mt-1">Controle Mensal Financeiro</p>
            </div>
            <div className="flex-1 w-full md:max-w-xs relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              {dbError && (
                <button 
                  onClick={() => {
                    const sql = `-- Execute este comando no SQL Editor do Supabase:
CREATE TABLE IF NOT EXISTS contribution_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE TABLE IF NOT EXISTS tithe_payers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('PASTOR_OBREIRO', 'COOPERADOR_MEMBRO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE TABLE IF NOT EXISTS tithes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID REFERENCES tithe_payers(id),
  type_id UUID REFERENCES contribution_types(id),
  amount DECIMAL(12,2) NOT NULL,
  month TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithe_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access CT" ON contribution_types FOR ALL USING (true);
CREATE POLICY "Allow all access TP" ON tithe_payers FOR ALL USING (true);
CREATE POLICY "Allow all access T" ON tithes FOR ALL USING (true);
INSERT INTO contribution_types (name) VALUES ('Dízimo'), ('Oferta'), ('Oferta Especial'), ('Missões') ON CONFLICT (name) DO NOTHING;`;
                    navigator.clipboard.writeText(sql);
                    alert('SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.');
                  }}
                  className="px-4 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-amber-200 hover:bg-amber-200 transition-all"
                >
                  Corrigir Banco
                </button>
              )}
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500"
              />
              <button 
                onClick={() => {
                  setTitheFormData({ payer_id: '', month: selectedMonth, entries: [{ type_id: '', amount: '' }] });
                  setIsEditingTithe(false);
                  setIsTitheModalOpen(true);
                }}
                className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                DÍZIMO/OFERTA
              </button>
              <button 
                onClick={() => openExpenseModal()}
                className="px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                SAÍDA
              </button>
            </div>
          </div>

          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-full md:w-fit">
            <button 
              onClick={() => setSubTab('entradas')}
              className={`flex-1 md:flex-none px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'entradas' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Entradas (Dízimos/Ofertas)
            </button>
            <button 
              onClick={() => setSubTab('saidas')}
              className={`flex-1 md:flex-none px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${subTab === 'saidas' ? 'bg-white text-red-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Saídas (Despesas)
            </button>
          </div>

          {subTab === 'entradas' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 space-y-8">
                {loading ? (
                  <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando dados...</div>
                ) : (
                  <>
                    {renderTable('Pastores e Obreiros', pastores, totalPastores)}
                    {renderTable('Cooperadores e Membros', cooperadores, totalCooperadores)}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Lista de Saídas</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Saídas</p>
                    <p className="text-xl font-black text-red-600">
                      {filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                        <th className="px-6 py-5">Data</th>
                        <th className="px-6 py-5">Descrição</th>
                        <th className="px-6 py-5">Categoria</th>
                        <th className="px-6 py-5 text-right">Valor</th>
                        <th className="px-6 py-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma despesa encontrada</td>
                        </tr>
                      ) : (
                        filteredTransactions.map(expense => (
                          <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-5 text-slate-500 font-bold">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-5 font-bold text-slate-800">{expense.description}</td>
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {expense.category}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-red-600">
                              {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => openExpenseModal(expense)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'cadastro' && (
        <>
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ofertantes</h2>
              <p className="text-slate-500 font-medium mt-1">Gerencie o cadastro de ofertantes</p>
            </div>
            <div className="flex-1 w-full md:max-w-xs relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar ofertante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#6e295e] focus:ring-2 focus:ring-[#6e295e]/20 transition-all"
              />
            </div>
            <button 
              onClick={() => openPayerModal()}
              className="px-6 py-4 bg-[#6e295e] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-[#5a214c] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              NOVO OFERTANTE
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                    <th className="px-6 py-5">Nome</th>
                    <th className="px-6 py-5">Categoria</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayers.map(payer => (
                    <tr key={payer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-800">{payer.name}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${payer.category === 'PASTOR_OBREIRO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {payer.category === 'PASTOR_OBREIRO' ? 'Pastor/Obreiro' : 'Cooperador/Membro'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openPayerModal(payer)} className="p-2 text-slate-400 hover:text-[#6e295e] transition-colors rounded-xl hover:bg-purple-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          </button>
                          <button onClick={() => handleDeletePayer(payer.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">
                        Nenhum ofertante encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tipos' && (
        <>
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tipos de Contribuição</h2>
              <p className="text-slate-500 font-medium mt-1">Gerencie as categorias de entradas (Dízimo, Oferta, etc)</p>
            </div>
            <button 
              onClick={() => openTypeModal()}
              className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              NOVO TIPO
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                    <th className="px-6 py-5">Nome do Tipo</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contributionTypes.map(type => (
                    <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-800">{type.name}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openTypeModal(type)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          </button>
                          <button onClick={() => handleDeleteType(type.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {contributionTypes.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-8 py-12 text-center text-slate-400 font-medium">
                        Nenhum tipo cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isPayerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                {editingPayer ? 'Editar Ofertante' : 'Novo Ofertante'}
              </h3>
              <button onClick={() => setIsPayerModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSavePayer} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={payerFormData.name || ''}
                  onChange={(e) => setPayerFormData({...payerFormData, name: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#6e295e] focus:ring-2 focus:ring-[#6e295e]/20 transition-all uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                <select 
                  required
                  value={payerFormData.category || 'COOPERADOR_MEMBRO'}
                  onChange={(e) => setPayerFormData({...payerFormData, category: e.target.value as any})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#6e295e] focus:ring-2 focus:ring-[#6e295e]/20 transition-all"
                >
                  <option value="PASTOR_OBREIRO">Pastor / Obreiro</option>
                  <option value="COOPERADOR_MEMBRO">Cooperador / Membro</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPayerModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 px-6 py-4 bg-[#6e295e] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-[#5a214c] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="text-xl font-black text-blue-800 uppercase tracking-tighter">
                {editingType ? 'Editar Tipo' : 'Novo Tipo'}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSaveType} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Tipo</label>
                <input 
                  type="text" 
                  required
                  value={typeFormData.name || ''}
                  onChange={(e) => setTypeFormData({...typeFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Ex: Dízimo, Oferta, Missões..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsTypeModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingType}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isSavingType ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTitheModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-xl font-black text-emerald-800 uppercase tracking-tighter">
                Lançamento
              </h3>
              <button onClick={() => setIsTitheModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSaveTithe} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês de Referência</label>
                <input 
                  type="month" 
                  required
                  value={titheFormData.month}
                  onChange={(e) => setTitheFormData({...titheFormData, month: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ofertante</label>
                <select 
                  required
                  value={titheFormData.payer_id}
                  onChange={(e) => setTitheFormData({...titheFormData, payer_id: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">Selecione um ofertante...</option>
                  <optgroup label="Pastores e Obreiros">
                    {pastores.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Cooperadores e Membros">
                    {cooperadores.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Valores</label>
                  <button 
                    type="button"
                    onClick={() => setTitheFormData({
                      ...titheFormData, 
                      entries: [...titheFormData.entries, { type_id: '', amount: '' }]
                    })}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Adicionar Outro
                  </button>
                </div>
                
                {titheFormData.entries.map((entry, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <select 
                        required
                        value={entry.type_id}
                        onChange={(e) => {
                          const newEntries = [...titheFormData.entries];
                          newEntries[index].type_id = e.target.value;
                          setTitheFormData({...titheFormData, entries: newEntries});
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        <option value="">Tipo...</option>
                        {contributionTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold">R$</span>
                      </div>
                      <input 
                        type="text" 
                        required
                        placeholder="0,00"
                        value={formatCurrency(parseFloat(entry.amount) || 0)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const newEntries = [...titheFormData.entries];
                          newEntries[index].amount = digits ? (parseInt(digits) / 100).toString() : '0';
                          setTitheFormData({...titheFormData, entries: newEntries});
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    {titheFormData.entries.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newEntries = titheFormData.entries.filter((_, i) => i !== index);
                          setTitheFormData({...titheFormData, entries: newEntries});
                        }}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsTitheModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingTithe}
                  className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSavingTithe ? 'Salvando...' : 'Lançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-red-500 transition-all"
                  placeholder="Ex: Pagamento de Luz"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor (R$)</label>
                  <input 
                    type="text" 
                    required
                    value={formatCurrency(parseFloat(expenseFormData.amount) || 0)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setExpenseFormData({...expenseFormData, amount: digits ? (parseInt(digits) / 100).toString() : '0'});
                    }}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-red-500 transition-all text-right"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data</label>
                  <input 
                    type="date" 
                    required
                    value={expenseFormData.date}
                    onChange={(e) => setExpenseFormData({...expenseFormData, date: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Categoria</label>
                <select 
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-red-500 transition-all appearance-none"
                >
                  <option value="Salário">Salário</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Eventos">Eventos</option>
                  <option value="Água">Água</option>
                  <option value="Luz">Luz</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Material">Material</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSavingExpense}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isSavingExpense ? 'SALVANDO...' : 'SALVAR DESPESA'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">{deleteConfirm.title}</h3>
              <p className="text-slate-500 font-medium mb-8">{deleteConfirm.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={deleteConfirm.onConfirm}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

