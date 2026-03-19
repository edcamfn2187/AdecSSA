import React, { useState, useEffect } from 'react';
import { Transaction, Tithe, ContributionType, Regional, RegionalTransaction, ChurchSettings } from '../types';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SIMULATED_TRANSACTIONS: Transaction[] = [];

export const FinancialManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>([]);
  const [regionals, setRegionals] = useState<Regional[]>([]);
  const [regionalTransactions, setRegionalTransactions] = useState<RegionalTransaction[]>([]);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    fetchTransactions();
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

  const fetchTransactions = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const transData = await api.get('transactions');
      if (transData) {
        const sortedData = [...transData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedData);
      }

      const tithesData = await api.get('tithes');
      if (tithesData) {
        setTithes(tithesData);
      }

      const typesData = await api.get('contribution_types');
      if (typesData) {
        setContributionTypes(typesData);
      }

      const regData = await api.get('regionals');
      if (regData) {
        const sortedRegData = [...regData].sort((a, b) => a.name.localeCompare(b.name));
        setRegionals(sortedRegData);
      }

      const regTransData = await api.get('regional_transactions');
      if (regTransData) setRegionalTransactions(regTransData);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('Failed to fetch')) {
        setDbError('Estrutura do banco de dados incompleta ou não encontrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: 'INCOME' | 'EXPENSE') => {
    setTransactionType(type);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: type,
      category: type === 'INCOME' ? 'Oferta' : 'Outros'
    });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.amount === undefined || formData.amount === null || !formData.date || !formData.category) return;
    
    setIsSaving(true);
    try {
      await api.post('transactions', {
        description: formData.description,
        amount: formData.amount || 0,
        type: transactionType,
        date: formData.date,
        category: formData.category
      });
        
      setIsModalOpen(false);
      setFormData({});
      fetchTransactions();
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Erro ao salvar transação.');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(110, 41, 94); // #6e295e
    doc.text(churchSettings?.name || 'Relatório Financeiro', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
    
    if (churchSettings?.address) {
      doc.text(churchSettings.address, pageWidth / 2, 33, { align: 'center' });
    }

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumo Consolidado', 14, 45);
    
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

    // Income by Category
    doc.text('Entradas por Categoria', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const categoryData = Object.entries(incomeByCategory).map(([cat, val]) => [cat, `R$ ${formatCurrency(val as number)}`]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Categoria', 'Valor']],
      body: categoryData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // emerald-500
    });

    // Regional Summary
    if (regionalStats.length > 0) {
      doc.addPage();
      doc.text('Resumo por Regional', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Regional', 'Entradas', 'Saídas', 'Saldo']],
        body: regionalStats.map(s => [
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
    doc.text('Detalhamento de Transações', 14, 20);
    
    autoTable(doc, {
      startY: 25,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: transactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.category,
        t.type === 'INCOME' ? 'Receita' : 'Despesa',
        `R$ ${formatCurrency(t.amount)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] } // slate-600
    });

    doc.save(`Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const transactionsIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const tithesIncome = tithes.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactionsIncome + tithesIncome;

  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const regionalStats = regionals.map(reg => {
    const regTrans = regionalTransactions.filter(t => t.regional_id === reg.id);
    const income = regTrans.reduce((acc, t) => acc + (t.income_amount || 0), 0);
    const expense = regTrans.reduce((acc, t) => acc + (t.expense_amount || 0), 0);
    return {
      ...reg,
      income,
      expense,
      balance: income - expense
    };
  });

  const incomeByCategory = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  tithes.forEach(t => {
    const typeName = contributionTypes.find(ct => ct.id === t.type_id)?.name || 'Dízimo/Oferta';
    incomeByCategory[typeName] = (incomeByCategory[typeName] || 0) + t.amount;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tesouraria</h2>
          <p className="text-slate-500 font-medium mt-1">Gestão Financeira e Fluxo de Caixa</p>
        </div>
        <div className="flex gap-3">
          {dbError && (
            <button 
              onClick={() => {
                const sql = `-- Execute este comando no SQL Editor do Supabase:
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON transactions FOR ALL USING (true);`;
                navigator.clipboard.writeText(sql);
                alert('SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.');
              }}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-amber-200 hover:bg-amber-200 transition-all"
            >
              Corrigir Banco de Dados
            </button>
          )}
          <button 
            onClick={generatePDF}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            PDF
          </button>
          <button 
            onClick={() => handleOpenModal('INCOME')}
            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            RECEITA
          </button>
          <button 
            onClick={() => handleOpenModal('EXPENSE')}
            className="px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-red-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
            DESPESA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70 mb-2">Entradas</p>
          <h3 className="text-2xl font-black text-emerald-700">{totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          
          {Object.keys(incomeByCategory).length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200/50 space-y-2">
              {Object.entries(incomeByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center text-sm">
                  <span className="font-bold text-emerald-800/70">{category}</span>
                  <span className="font-black text-emerald-700">{(amount as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-red-50 border border-red-100 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600/70 mb-2">Saídas</p>
          <h3 className="text-2xl font-black text-red-700">{totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saldo Atual</p>
          <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Resumo por Regional</h3>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando resumo...</div>
        ) : regionalStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                  <th className="px-8 py-5">Regional</th>
                  <th className="px-6 py-5 text-right">Entradas</th>
                  <th className="px-6 py-5 text-right">Saídas</th>
                  <th className="px-8 py-5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalStats.map(stat => (
                  <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
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
        ) : (
          <div className="p-20 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma regional cadastrada.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className={`text-2xl font-black uppercase tracking-tighter mb-6 ${transactionType === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
              Nova {transactionType === 'INCOME' ? 'Receita' : 'Despesa'}
            </h3>
            
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                <input
                  type="text"
                  required
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Ex: Dízimo do João, Conta de Luz..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    value={formatCurrency(formData.amount || 0)}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, amount: digits ? parseInt(digits) / 100 : 0});
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                <select
                  required
                  value={formData.category || ''}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  {transactionType === 'INCOME' ? (
                    <>
                      <option value="Dízimo">Dízimo</option>
                      <option value="Oferta">Oferta</option>
                      <option value="Doação">Doação</option>
                      <option value="Venda">Venda</option>
                      <option value="Outros">Outros</option>
                    </>
                  ) : (
                    <>
                      <option value="Água">Água</option>
                      <option value="Luz">Luz</option>
                      <option value="Aluguel">Aluguel</option>
                      <option value="Material">Material</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Salário">Salário</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Eventos">Eventos</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-bold text-xs uppercase transition-colors ${
                    transactionType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
