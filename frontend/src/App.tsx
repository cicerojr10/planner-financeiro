import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<div className="text-2xl">Relatórios (Em breve)</div>} />
          <Route path="investments" element={<div className="text-2xl">Investimentos (Em breve)</div>} />
          <Route path="settings" element={<div className="text-2xl">Configurações (Em breve)</div>} />
        </Route>
        {/* Rota pega-tudo para redirecionar pro dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;