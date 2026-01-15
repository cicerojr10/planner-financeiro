import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const API_URL = 'https://meu-financeiro-8985.onrender.com';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_name?: string;
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Busca dados
  useEffect(() => {
    loadTransactions();
  }, []);

  function loadTransactions() {
    axios.get(`${API_URL}/transactions/1`)
      .then(response => {
        setTransactions(response.data);
        setLoading(false);
      })
      .catch(error => console.error("Erro:", error));
  }

  // Função de DELETAR
  function handleDelete(id: number) {
    if (confirm('Tem certeza que deseja apagar essa transação?')) {
      // Otimista: Remove da tela antes mesmo do banco responder (para parecer instantâneo)
      setTransactions(transactions.filter(t => t.id !== id));
      
      axios.delete(`${API_URL}/transactions/${id}`)
        .then(() => console.log("Deletado com sucesso"))
        .catch(err => {
          alert("Erro ao deletar");
          loadTransactions(); // Recarrega se der erro
        });
    }
  }

  // Filtro de busca simples
  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice().reverse(); // Mostra as mais recentes primeiro

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transações</h1>
          <p className="text-slate-400">Gerencie suas entradas e saídas.</p>
        </div>
        
        {/* BARRA DE BUSCA */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma transação encontrada.</td></tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-200 font-medium flex items-center gap-3">
                      {t.type === 'income' ? <ArrowUpCircle size={18} className="text-emerald-500" /> : <ArrowDownCircle size={18} className="text-red-500" />}
                      {t.description}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {/* Placeholder de categoria por enquanto */}
                      <span className="px-2 py-1 rounded bg-slate-800 text-xs">Geral</span>
                    </td>
                    <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}
                      R$ {t.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}