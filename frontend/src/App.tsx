import { useState, useEffect } from 'react';
import { Transactions } from './pages/Transactions';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { LayoutDashboard, List, Menu, X, LogOut } from 'lucide-react';

export default function App() {
  // Tenta pegar o token. Se não tiver, começa como falso.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'transactions'>('transactions');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Efeito que roda UMA vez quando o site abre para checar o token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  function handleLogout() {
    console.log("Clicou em Sair!"); // Para debug
    localStorage.removeItem('token'); // Apaga o crachá
    setIsAuthenticated(false); // Força a tela a mudar
    window.location.reload(); // Recarrega a página para garantir limpeza total
  }

  // SE NÃO TIVER LOGADO, MOSTRA LOGIN
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // --- ÁREA DO SISTEMA ---
  
  function navigate(page: 'dashboard' | 'transactions') {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Finanças
          </h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          <button 
            onClick={() => navigate('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${currentPage === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button 
            onClick={() => navigate('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${currentPage === 'transactions' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <List size={20} />
            Transações
          </button>
        </nav>

        {/* BOTÃO SAIR (COM Z-INDEX ALTO PARA GARANTIR O CLIQUE) */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 hover:text-red-400 transition-colors bg-slate-900 border border-slate-800 hover:border-red-500/50"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
          <span className="font-bold text-lg">Meu Planner</span>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-200">
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {currentPage === 'dashboard' ? <Dashboard /> : <Transactions />}
          </div>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}
    </div>
  );
}