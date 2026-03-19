import React, { useState, useEffect } from 'react';
import { Mission, MissionTransaction, ChurchSettings } from '../types';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const MissionsManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<MissionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'LANÇAMENTOS' | 'TOTAL'>('LANÇAMENTOS');

  // Modal states
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<MissionTransaction | null>(null);
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [transactionFormData, setTransactionFormData] = useState<Partial<MissionTransaction>>({
    date: new Date().toISOString().split('T')[0],
    reference_month: new Date().toISOString().slice(0, 7),
    income_amount: 0,
    expense_amount: 0,
    name: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings | null>(null);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    fetchData();
    fetchChurchSettings();
  }, []);

  const fetchChurchSettings = async () => {
    try {
      const data = await api.get('church_settings');
      if (data && data.length > 0) setChurchSettings(data[0]);
    } catch (e) {
      console.warn("Could not fetch church settings");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const transData = await api.get('mission_transactions');
      if (transData) {
        // Sort by date descending as the API might not support ordering yet
        const sortedData = [...transData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedData);
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('Failed to fetch')) {
        setDbError('Estrutura do banco de dados incompleta ou não encontrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionFormData.name || !transactionFormData.description || !transactionFormData.date || !transactionFormData.reference_month) return;
    
    setIsSaving(true);
    try {
      const payload = {
        name: transactionFormData.name,
        description: transactionFormData.description,
        income_amount: transactionFormData.income_amount || 0,
        expense_amount: transactionFormData.expense_amount || 0,
        date: transactionFormData.date,
        reference_month: transactionFormData.reference_month
      };

      if (editingTransaction) {
        await api.put('mission_transactions', editingTransaction.id, payload);
        setNotification({ message: 'Lançamento atualizado!', type: 'success' });
      } else {
        await api.post('mission_transactions', payload);
        setNotification({ message: 'Lançamento salvo!', type: 'success' });
      }
        
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      setTransactionFormData({ 
        date: new Date().toISOString().split('T')[0],
        reference_month: new Date().toISOString().slice(0, 7),
        income_amount: 0,
        expense_amount: 0,
        name: ''
      });
      fetchData();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setNotification({ message: 'Erro ao salvar lançamento.', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      await api.delete('mission_transactions', transactionToDelete);
      setNotification({ message: 'Lançamento excluído!', type: 'success' });
      fetchData();
    } catch (e) {
      console.error(e);
      setNotification({ message: 'Erro ao excluir lançamento.', type: 'error' });
    } finally {
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const confirmDelete = (id: string) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(110, 41, 94); // #6e295e
    doc.text(churchSettings?.name || 'Relatório de Missões', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
    
    if (churchSettings?.address) {
      doc.text(churchSettings.address, pageWidth / 2, 33, { align: 'center' });
    }

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumo Consolidado - Missões', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Descrição', 'Valor']],
      body: [
        ['Total de Entradas', `R$ ${formatCurrency(totalIncome)}`],
        ['Total de Saídas', `R$ ${formatCurrency(totalExpense)}`],
        ['Saldo Atual', `R$ ${formatCurrency(balance)}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [110, 41, 94] }
    });

    // Mission Summary
    if (missionStats.length > 0) {
      doc.text('Resumo por Pessoa/Instituição', 14, (doc as any).lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Nome', 'Entradas', 'Saídas', 'Saldo']],
        body: missionStats.map(s => [
          s.name, 
          `R$ ${formatCurrency(s.income)}`, 
          `R$ ${formatCurrency(s.expense)}`, 
          `R$ ${formatCurrency(s.balance)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [110, 41, 94] }
      });
    }

    // Detailed Transactions
    doc.addPage();
    doc.text('Detalhamento de Lançamentos de Missões', 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['Data', 'Mês Ref.', 'Nome', 'Descrição', 'Entrada', 'Saída']],
      body: transactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.reference_month,
        t.name,
        t.description,
        `R$ ${formatCurrency(t.income_amount)}`,
        `R$ ${formatCurrency(t.expense_amount)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save(`Relatorio_Missoes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const openTransactionModal = (transaction?: MissionTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionFormData({
        name: transaction.name,
        description: transaction.description,
        income_amount: transaction.income_amount,
        expense_amount: transaction.expense_amount,
        date: transaction.date,
        reference_month: transaction.reference_month
      });
    } else {
      setEditingTransaction(null);
      setTransactionFormData({ 
        date: new Date().toISOString().split('T')[0],
        reference_month: new Date().toISOString().slice(0, 7),
        name: '',
        description: '',
        income_amount: 0,
        expense_amount: 0
      });
    }
    setIsTransactionModalOpen(true);
  };

  const totalIncome = transactions.reduce((acc, t) => acc + (t.income_amount || 0), 0);
  const totalExpense = transactions.reduce((acc, t) => acc + (t.expense_amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const missionStats = Array.from(new Set(transactions.map(t => t.name))).map(name => {
    const missTrans = transactions.filter(t => t.name === name);
    const income = missTrans.reduce((acc, t) => acc + (t.income_amount || 0), 0);
    const expense = missTrans.reduce((acc, t) => acc + (t.expense_amount || 0), 0);
    return {
      name,
      income,
      expense,
      balance: income - expense
    };
  });

  const renderLançamentos = () => (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Histórico de Lançamentos</h3>
        <button 
          onClick={() => openTransactionModal()}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          NOVO LANÇAMENTO
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
              <th className="px-8 py-5">Data</th>
              <th className="px-6 py-5">Mês Ref.</th>
              <th className="px-6 py-5">Nome</th>
              <th className="px-6 py-5">Descrição</th>
              <th className="px-6 py-5 text-right">Entrada</th>
              <th className="px-6 py-5 text-right">Saída</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-800 text-sm">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-5 font-bold text-slate-500 text-xs">{t.reference_month}</td>
                <td className="px-6 py-5 font-bold text-slate-700">{t.name}</td>
                <td className="px-6 py-5 font-medium text-slate-600">{t.description}</td>
                <td className="px-6 py-5 text-right font-black text-emerald-600">
                  {t.income_amount > 0 ? t.income_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                </td>
                <td className="px-6 py-5 text-right font-black text-red-600">
                  {t.expense_amount > 0 ? t.expense_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => openTransactionModal(t)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button 
                      onClick={() => confirmDelete(t.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTotal = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-2">Total Entradas</p>
          <h3 className="text-2xl font-black text-emerald-700">{totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
        <div className="bg-red-50 border border-red-100 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600/70 mb-2">Total Saídas</p>
          <h3 className="text-2xl font-black text-red-700">{totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Consolidado</p>
          <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Resumo por Missão</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                <th className="px-8 py-5">Missão</th>
                <th className="px-6 py-5 text-right">Entradas</th>
                <th className="px-6 py-5 text-right">Saídas</th>
                <th className="px-8 py-5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {missionStats.map(stat => (
                <tr key={stat.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">{stat.name}</td>
                  <td className="px-6 py-5 text-right font-bold text-emerald-600">{stat.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-6 py-5 text-right font-bold text-red-600">{stat.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className={`px-8 py-5 text-right font-black ${stat.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                    {stat.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          )}
          <span className="font-black text-xs uppercase tracking-widest">{notification.message}</span>
        </div>
      )}

      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestão de Missões</h2>
          <p className="text-slate-500 font-medium mt-1">Controle Financeiro de Missões</p>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={generatePDF}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            PDF
          </button>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            {(['LANÇAMENTOS', 'TOTAL'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dbError && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <p className="text-amber-900 font-black text-xs uppercase tracking-widest">Estrutura do banco incompleta</p>
              <p className="text-amber-700 text-sm font-medium">É necessário criar ou atualizar as tabelas de missões no banco de dados.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const sql = `-- Execute este comando no SQL Editor do Supabase para criar a tabela de lançamentos de missões:
CREATE TABLE IF NOT EXISTS mission_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  income_amount DECIMAL(12,2) DEFAULT 0,
  expense_amount DECIMAL(12,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE mission_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON mission_transactions FOR ALL USING (true);`;
              navigator.clipboard.writeText(sql);
              setNotification({ message: 'SQL copiado!', type: 'success' });
              setTimeout(() => setNotification(null), 2000);
            }}
            className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all"
          >
            Copiar SQL de Criação
          </button>
        </div>
      )}

      {currentTab === 'LANÇAMENTOS' && renderLançamentos()}
      {currentTab === 'TOTAL' && renderTotal()}

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 text-slate-800">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome</label>
                <input
                  type="text"
                  required
                  value={transactionFormData.name || ''}
                  onChange={e => setTransactionFormData({...transactionFormData, name: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Nome Pessoa/Instituição"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                <input
                  type="text"
                  required
                  value={transactionFormData.description || ''}
                  onChange={e => setTransactionFormData({...transactionFormData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Oferta de Culto, Compra de Material..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Entrada (R$)</label>
                  <input
                    type="text"
                    value={formatCurrency(transactionFormData.income_amount || 0)}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setTransactionFormData({...transactionFormData, income_amount: digits ? parseInt(digits) / 100 : 0});
                    }}
                    className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Saída (R$)</label>
                  <input
                    type="text"
                    value={formatCurrency(transactionFormData.expense_amount || 0)}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setTransactionFormData({...transactionFormData, expense_amount: digits ? parseInt(digits) / 100 : 0});
                    }}
                    className="w-full bg-red-50/50 border border-red-100 rounded-xl px-4 py-3 text-sm font-black text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input
                    type="date"
                    required
                    value={transactionFormData.date || ''}
                    onChange={e => setTransactionFormData({...transactionFormData, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mês de Referência</label>
                  <input
                    type="month"
                    required
                    value={transactionFormData.reference_month || ''}
                    onChange={e => setTransactionFormData({...transactionFormData, reference_month: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase hover:bg-slate-800 transition-colors disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-[32px] p-8 w-full max-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-slate-800">Excluir Lançamento?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Esta ação não pode ser desfeita. Deseja continuar?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteTransaction} 
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
