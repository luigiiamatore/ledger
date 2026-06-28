import { useState, useEffect } from 'react';
import './App.css';

interface Transaction {
  id: number;
  bankTransactionId: string;
  date: string;
  rawDescription: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  baseAmountEur: number;
  categoryId: number | null;
}

const getCategoryIcon = (categoryId: number | null) => {
  switch (categoryId) {
    case 1: return '🛒';
    case 2: return '🍽️';
    case 3: return '🚗';
    case 4: return '🍿';
    case 5: return '🛍️';
    default: return '💸';
  }
};

const getCategoryName = (categoryId: number | null) => {
  switch (categoryId) {
    case 1: return 'Groceries';
    case 2: return 'Dining';
    case 3: return 'Transportation';
    case 4: return 'Entertainment';
    case 5: return 'Shopping';
    case 6: return 'Other';
    default: return 'Uncategorized';
  }
};

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Prima controlliamo se c'è un codice nell'URL (siamo di ritorno da Revolut)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleBankCallback(code);
    } else {
      // 2. Altrimenti carichiamo normalmente le transazioni dal DB
      fetchTransactions();
    }
  }, []);

  const handleBankCallback = async (code: string) => {
    setSyncing(true);
    try {
      // Rimuoviamo il codice dall'URL per pulizia
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const res = await fetch('/api/banking/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (res.ok) {
        await fetchTransactions(); // Ricarica le transazioni aggiornate
      } else {
        const errData = await res.json();
        alert("Errore nel recupero transazioni: " + errData.error);
      }
    } catch (err) {
      console.error("Callback failed", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectBank = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/banking/auth', { method: 'POST' });
      const data = await res.json();
      if (data.authUrl) {
        // Redirect dell'utente alla pagina di login di Revolut
        window.location.href = data.authUrl;
      } else {
        alert("Errore nella generazione dell'URL: " + data.error);
      }
    } catch (err) {
      console.error("Connection failed", err);
    } finally {
      setSyncing(false);
    }
  };

  const totalSpent = transactions
    .filter(t => t.baseAmountEur < 0)
    .reduce((acc, t) => acc + Math.abs(t.baseAmountEur), 0);
    
  const totalIncome = transactions
    .filter(t => t.baseAmountEur > 0)
    .reduce((acc, t) => acc + t.baseAmountEur, 0);

  const netBalance = totalIncome - totalSpent;

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <h1>Ledger</h1>
          <p>Intelligent Personal Finance</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="sync-btn" 
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            onClick={handleConnectBank} 
            disabled={syncing}
          >
            {syncing ? <span className="spinner">↻</span> : '🏦'} 
            {syncing ? 'Connecting...' : 'Connect Revolut'}
          </button>
        </div>
      </header>

      <main>
        <div className="dashboard-summary">
          <div className="stat-card glass-panel">
            <h3>Net Balance</h3>
            <div className={`amount ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
              {netBalance >= 0 ? '+' : '-'}€{Math.abs(netBalance).toFixed(2)}
            </div>
          </div>
          <div className="stat-card glass-panel">
            <h3>Income</h3>
            <div className="amount text-positive">
              +€{totalIncome.toFixed(2)}
            </div>
          </div>
          <div className="stat-card glass-panel">
            <h3>Spent</h3>
            <div className="amount text-negative">
              -€{totalSpent.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="transactions-section">
          <h2>Recent Transactions</h2>
          
          {loading ? (
            <div className="empty-state">Loading your transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="empty-state glass-panel">
              <p>No transactions found.</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Click "Connect Revolut" to fetch latest entries.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.slice().reverse().map((tx) => (
                <div key={tx.id} className="transaction-item glass-panel">
                  <div className="tx-left">
                    <div className="tx-icon">
                      {getCategoryIcon(tx.categoryId)}
                    </div>
                    <div className="tx-details">
                      <h4>{tx.merchantName || tx.rawDescription}</h4>
                      <p className="text-muted">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span className="tx-category">{getCategoryName(tx.categoryId)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className={`base-amount ${tx.baseAmountEur > 0 ? 'text-positive' : ''}`}>
                      {tx.baseAmountEur > 0 ? '+' : '-'}€{Math.abs(tx.baseAmountEur).toFixed(2)}
                    </div>
                    {tx.currency !== 'EUR' && (
                      <div className="original-amount">
                        {tx.amount} {tx.currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
