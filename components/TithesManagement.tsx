import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ContributionType, Tithe, TithePayer, Transaction } from '../types';

type MainTab = 'lancamentos' | 'cadastro' | 'tipos';
type LaunchTab = 'entradas' | 'entradasGerais' | 'saidas';

const moneyInput = (value: string, setValue: (next: string) => void) => ({
  value: (parseFloat(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setValue(digits ? (parseInt(digits, 10) / 100).toString() : '0');
  }
});

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString('pt-BR');
};

export const TithesManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('lancamentos');
  const [launchTab, setLaunchTab] = useState<LaunchTab>('entradas');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [payers, setPayers] = useState<TithePayer[]>([]);
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [tithes, setTithes] = useState<Tithe[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [payerForm, setPayerForm] = useState<Partial<TithePayer>>({ category: 'COOPERADOR_MEMBRO' });
  const [typeForm, setTypeForm] = useState<Partial<ContributionType>>({});
  const [entryForm, setEntryForm] = useState<{ payer_id: string; month: string; entries: { type_id: string; amount: string }[] }>({ payer_id: '', month: '', entries: [{ type_id: '', amount: '' }] });
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', category: 'Oferta', date: new Date().toISOString().split('T')[0] });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Manutencao', date: new Date().toISOString().split('T')[0] });

  const [editingPayer, setEditingPayer] = useState<TithePayer | null>(null);
  const [editingType, setEditingType] = useState<ContributionType | null>(null);
  const [editingIncome, setEditingIncome] = useState<Transaction | null>(null);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [editingEntryPayerId, setEditingEntryPayerId] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState<'' | 'payer' | 'type' | 'entry' | 'income' | 'expense'>('');

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rawTypes, rawPayers, rawTithes, rawTransactions] = await Promise.all([
        api.get('contribution_types'),
        api.get('tithe_payers'),
        api.get('tithes'),
        api.get('transactions')
      ]);
      setTypes(rawTypes || []);
      setPayers(rawPayers || []);
      setTithes(((rawTithes || []) as Tithe[]).filter(t => t.month === selectedMonth));
      setTransactions(((rawTransactions || []) as Transaction[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const filteredPayers = payers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const pastors = filteredPayers.filter(p => p.category === 'PASTOR_OBREIRO');
  const members = filteredPayers.filter(p => p.category === 'COOPERADOR_MEMBRO');
  const filteredTransactions = transactions.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const incomes = filteredTransactions.filter(t => t.type === 'INCOME');
  const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');

  const totalForPayers = (list: TithePayer[]) => list.reduce((sum, p) => sum + tithes.filter(t => t.payer_id === p.id).reduce((acc, t) => acc + toNumber(t.amount), 0), 0);

  const resetPayer = () => { setEditingPayer(null); setPayerForm({ category: 'COOPERADOR_MEMBRO' }); setOpenModal('payer'); };
  const resetType = () => { setEditingType(null); setTypeForm({}); setOpenModal('type'); };
  const resetEntry = () => { setEditingEntryPayerId(null); setEntryForm({ payer_id: '', month: selectedMonth, entries: [{ type_id: '', amount: '' }] }); setOpenModal('entry'); };
  const resetIncome = () => { setEditingIncome(null); setIncomeForm({ description: '', amount: '', category: 'Oferta', date: new Date().toISOString().split('T')[0] }); setOpenModal('income'); };
  const resetExpense = () => { setEditingExpense(null); setExpenseForm({ description: '', amount: '', category: 'Manutencao', date: new Date().toISOString().split('T')[0] }); setOpenModal('expense'); };

  const savePayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerForm.name || !payerForm.category) return;
    editingPayer ? await api.put('tithe_payers', editingPayer.id, payerForm) : await api.post('tithe_payers', payerForm);
    setOpenModal(''); fetchData();
  };

  const saveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.name) return;
    editingType ? await api.put('contribution_types', editingType.id, typeForm) : await api.post('contribution_types', typeForm);
    setOpenModal(''); fetchData();
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.payer_id || !entryForm.month) return;
    const existing = tithes.filter(t => t.payer_id === entryForm.payer_id && t.month === entryForm.month);
    const typeIds = entryForm.entries.map(entry => entry.type_id);
    if (editingEntryPayerId) for (const old of existing.filter(t => !typeIds.includes(t.type_id || ''))) await api.delete('tithes', old.id);
    for (const entry of entryForm.entries) {
      const amount = parseFloat(entry.amount) || 0;
      const match = existing.find(t => t.type_id === entry.type_id);
      if (match) await api.put('tithes', match.id, { amount: editingEntryPayerId ? amount : toNumber(match.amount) + amount });
      else await api.post('tithes', { payer_id: entryForm.payer_id, type_id: entry.type_id, amount, month: entryForm.month, date: new Date().toISOString() });
    }
    setOpenModal(''); fetchData();
  };

  const saveTransaction = async (e: React.FormEvent, form: typeof incomeForm, editing: Transaction | null, type: 'INCOME' | 'EXPENSE') => {
    e.preventDefault();
    const payload = { description: form.description, amount: parseFloat(form.amount) || 0, category: form.category, date: form.date, ...(editing ? {} : { type }) };
    editing ? await api.put('transactions', editing.id, payload) : await api.post('transactions', payload);
    setOpenModal(''); fetchData();
  };

  const deleteRows = async (items: { table: string; id: string }[]) => {
    for (const item of items) await api.delete(item.table, item.id);
    fetchData();
  };

  const editEntryForPayer = (payer: TithePayer) => {
    const payerTithes = tithes.filter(t => t.payer_id === payer.id);
    setEditingEntryPayerId(payer.id);
    setEntryForm({ payer_id: payer.id, month: selectedMonth, entries: payerTithes.map(t => ({ type_id: t.type_id || '', amount: t.amount.toString() })) });
    setOpenModal('entry');
  };

  const launchActions = (
    <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-full md:w-fit">
      <button onClick={() => setLaunchTab('entradas')} className={`px-8 py-4 rounded-xl font-black text-xs uppercase ${launchTab === 'entradas' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Entradas (Dizimos/Ofertas)</button>
      <button onClick={() => setLaunchTab('entradasGerais')} className={`px-8 py-4 rounded-xl font-black text-xs uppercase ${launchTab === 'entradasGerais' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Entradas Gerais</button>
      <button onClick={() => setLaunchTab('saidas')} className={`px-8 py-4 rounded-xl font-black text-xs uppercase ${launchTab === 'saidas' ? 'bg-white text-red-600 shadow-md' : 'text-slate-400'}`}>Saidas</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('lancamentos')} className={`pb-4 font-bold text-sm ${activeTab === 'lancamentos' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400'}`}>Lancamentos</button>
        <button onClick={() => setActiveTab('cadastro')} className={`pb-4 font-bold text-sm ${activeTab === 'cadastro' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400'}`}>Cadastro de Ofertantes</button>
        <button onClick={() => setActiveTab('tipos')} className={`pb-4 font-bold text-sm ${activeTab === 'tipos' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400'}`}>Tipos de Contribuicao</button>
      </div>

      {activeTab === 'lancamentos' && <>
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Lancamento</h2><p className="text-slate-500 font-medium mt-1">Controle mensal financeiro</p></div>
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" />
          <div className="flex items-center gap-4">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" />
            <button onClick={resetEntry} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Dizimo/Oferta</button>
          </div>
        </div>
        {launchActions}
        {loading && <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando dados...</div>}
        {!loading && launchTab === 'entradas' && [ ['Pastores e Obreiros', pastors], ['Cooperadores e Membros', members] ].map(([title, list]) => (
          <div key={String(title)} className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
              <p className="text-xl font-black text-emerald-600">{totalForPayers(list as TithePayer[]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-6 py-5">Nome</th><th className="px-6 py-5 text-right">Valor</th><th className="px-6 py-5 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">
              {(list as TithePayer[]).map(payer => {
                const payerTithes = tithes.filter(t => t.payer_id === payer.id);
                const total = payerTithes.reduce((sum, t) => sum + toNumber(t.amount), 0);
                return <tr key={payer.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-bold text-slate-800">{payer.name}</td><td className="px-6 py-5 text-right font-black text-emerald-600">{total ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td><td className="px-6 py-5 text-right">{!!payerTithes.length && <div className="flex justify-end gap-2"><button onClick={() => editEntryForPayer(payer)} className="p-2 text-slate-400 hover:text-emerald-600">Editar</button><button onClick={() => deleteRows(payerTithes.map(t => ({ table: 'tithes', id: t.id })))} className="p-2 text-slate-400 hover:text-red-600">Excluir</button></div>}</td></tr>;
              })}
            </tbody></table></div>
          </div>
        ))}
        {!loading && launchTab !== 'entradas' && <>
          <div className="flex justify-end">
            <button onClick={launchTab === 'entradasGerais' ? resetIncome : resetExpense} className={`px-6 py-4 text-white rounded-2xl font-black text-xs uppercase shadow-xl ${launchTab === 'entradasGerais' ? 'bg-blue-600' : 'bg-red-600'}`}>{launchTab === 'entradasGerais' ? 'Nova Entrada' : 'Nova Saida'}</button>
          </div>
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{launchTab === 'entradasGerais' ? 'Lista de Entradas Gerais' : 'Lista de Saidas'}</h3>
              <p className={`text-xl font-black ${launchTab === 'entradasGerais' ? 'text-blue-600' : 'text-red-600'}`}>{(launchTab === 'entradasGerais' ? incomes : expenses).reduce((sum, t) => sum + toNumber(t.amount), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-6 py-5">Data</th><th className="px-6 py-5">Descricao</th><th className="px-6 py-5">Categoria</th><th className="px-6 py-5 text-right">Valor</th><th className="px-6 py-5 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">
              {(launchTab === 'entradasGerais' ? incomes : expenses).map(item => <tr key={item.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-bold text-slate-500">{formatDate(item.date)}</td><td className="px-6 py-5 font-bold text-slate-800">{item.description}</td><td className="px-6 py-5">{item.category}</td><td className={`px-6 py-5 text-right font-black ${launchTab === 'entradasGerais' ? 'text-blue-600' : 'text-red-600'}`}>{toNumber(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="px-6 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => launchTab === 'entradasGerais' ? (setEditingIncome(item), setIncomeForm({ description: item.description, amount: toNumber(item.amount).toString(), category: item.category, date: item.date }), setOpenModal('income')) : (setEditingExpense(item), setExpenseForm({ description: item.description, amount: toNumber(item.amount).toString(), category: item.category, date: item.date }), setOpenModal('expense'))} className="p-2 text-slate-400 hover:text-slate-700">Editar</button><button onClick={() => deleteRows([{ table: 'transactions', id: item.id }])} className="p-2 text-slate-400 hover:text-red-600">Excluir</button></div></td></tr>)}
            </tbody></table></div>
          </div>
        </>}
      </>}

      {activeTab === 'cadastro' && <div className="space-y-6"><div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"><div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ofertantes</h2><p className="text-slate-500 font-medium mt-1">Gerencie o cadastro de ofertantes</p></div><input type="text" placeholder="Pesquisar ofertante..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" /><button onClick={resetPayer} className="px-6 py-4 bg-[#6e295e] text-white rounded-2xl font-black text-xs uppercase shadow-xl">Novo Ofertante</button></div><div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-6 py-5">Nome</th><th className="px-6 py-5">Categoria</th><th className="px-8 py-5 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredPayers.map(p => <tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-bold text-slate-800">{p.name}</td><td className="px-6 py-5">{p.category === 'PASTOR_OBREIRO' ? 'Pastor/Obreiro' : 'Cooperador/Membro'}</td><td className="px-8 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingPayer(p); setPayerForm(p); setOpenModal('payer'); }} className="p-2 text-slate-400 hover:text-[#6e295e]">Editar</button><button onClick={() => deleteRows([{ table: 'tithe_payers', id: p.id }])} className="p-2 text-slate-400 hover:text-red-600">Excluir</button></div></td></tr>)}</tbody></table></div></div></div>}

      {activeTab === 'tipos' && <div className="space-y-6"><div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex justify-between items-center gap-6"><div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tipos de Contribuicao</h2><p className="text-slate-500 font-medium mt-1">Gerencie as categorias de entradas</p></div><button onClick={resetType} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Novo Tipo</button></div><div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-6 py-5">Nome</th><th className="px-8 py-5 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{types.map(t => <tr key={t.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-bold text-slate-800">{t.name}</td><td className="px-8 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingType(t); setTypeForm(t); setOpenModal('type'); }} className="p-2 text-slate-400 hover:text-blue-600">Editar</button><button onClick={() => deleteRows([{ table: 'contribution_types', id: t.id }])} className="p-2 text-slate-400 hover:text-red-600">Excluir</button></div></td></tr>)}</tbody></table></div></div></div>}

      {openModal === 'payer' && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6"><h3 className="text-xl font-black mb-4">{editingPayer ? 'Editar Ofertante' : 'Novo Ofertante'}</h3><form onSubmit={savePayer} className="space-y-4"><input type="text" required value={payerForm.name || ''} onChange={e => setPayerForm({ ...payerForm, name: e.target.value.toUpperCase() })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Nome" /><select value={payerForm.category || 'COOPERADOR_MEMBRO'} onChange={e => setPayerForm({ ...payerForm, category: e.target.value as any })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"><option value="PASTOR_OBREIRO">Pastor / Obreiro</option><option value="COOPERADOR_MEMBRO">Cooperador / Membro</option></select><div className="flex gap-3"><button type="button" onClick={() => setOpenModal('')} className="flex-1 px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 px-6 py-4 bg-[#6e295e] text-white rounded-2xl font-black text-xs uppercase">Salvar</button></div></form></div></div>}
      {openModal === 'type' && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6"><h3 className="text-xl font-black mb-4">{editingType ? 'Editar Tipo' : 'Novo Tipo'}</h3><form onSubmit={saveType} className="space-y-4"><input type="text" required value={typeForm.name || ''} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Nome do tipo" /><div className="flex gap-3"><button type="button" onClick={() => setOpenModal('')} className="flex-1 px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase">Salvar</button></div></form></div></div>}
      {openModal === 'entry' && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6"><h3 className="text-xl font-black mb-4">Lancamento</h3><form onSubmit={saveEntry} className="space-y-4"><input type="month" required value={entryForm.month} onChange={e => setEntryForm({ ...entryForm, month: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /><select required value={entryForm.payer_id} onChange={e => setEntryForm({ ...entryForm, payer_id: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"><option value="">Selecione um ofertante...</option>{payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{entryForm.entries.map((entry, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3"><select required value={entry.type_id} onChange={e => setEntryForm({ ...entryForm, entries: entryForm.entries.map((row, i) => i === index ? { ...row, type_id: e.target.value } : row) })} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"><option value="">Tipo...</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input type="text" required {...moneyInput(entry.amount, next => setEntryForm({ ...entryForm, entries: entryForm.entries.map((row, i) => i === index ? { ...row, amount: next } : row) }))} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />{entryForm.entries.length > 1 && <button type="button" onClick={() => setEntryForm({ ...entryForm, entries: entryForm.entries.filter((_, i) => i !== index) })} className="px-3 py-3 text-red-600">X</button>}</div>)}<button type="button" onClick={() => setEntryForm({ ...entryForm, entries: [...entryForm.entries, { type_id: '', amount: '' }] })} className="text-sm font-bold text-emerald-600">Adicionar Outro</button><div className="flex gap-3"><button type="button" onClick={() => setOpenModal('')} className="flex-1 px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase">Salvar</button></div></form></div></div>}
      {openModal === 'income' && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6"><h3 className="text-xl font-black mb-4">{editingIncome ? 'Editar Entrada' : 'Nova Entrada'}</h3><form onSubmit={e => saveTransaction(e, incomeForm, editingIncome, 'INCOME')} className="space-y-4"><input type="text" required value={incomeForm.description} onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Descricao" /><input type="text" required {...moneyInput(incomeForm.amount, next => setIncomeForm({ ...incomeForm, amount: next }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /><input type="date" required value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /><select value={incomeForm.category} onChange={e => setIncomeForm({ ...incomeForm, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"><option value="Oferta">Oferta</option><option value="Doacao">Doacao</option><option value="Venda">Venda</option><option value="Campanha">Campanha</option><option value="Outros">Outros</option></select><div className="flex gap-3"><button type="button" onClick={() => setOpenModal('')} className="flex-1 px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase">Salvar</button></div></form></div></div>}
      {openModal === 'expense' && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6"><h3 className="text-xl font-black mb-4">{editingExpense ? 'Editar Saida' : 'Nova Saida'}</h3><form onSubmit={e => saveTransaction(e, expenseForm, editingExpense, 'EXPENSE')} className="space-y-4"><input type="text" required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Descricao" /><input type="text" required {...moneyInput(expenseForm.amount, next => setExpenseForm({ ...expenseForm, amount: next }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /><input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /><select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold"><option value="Salario">Salario</option><option value="Limpeza">Limpeza</option><option value="Eventos">Eventos</option><option value="Agua">Agua</option><option value="Luz">Luz</option><option value="Aluguel">Aluguel</option><option value="Material">Material</option><option value="Manutencao">Manutencao</option><option value="Outros">Outros</option></select><div className="flex gap-3"><button type="button" onClick={() => setOpenModal('')} className="flex-1 px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Salvar</button></div></form></div></div>}
    </div>
  );
};
