import { FastifyInstance } from 'fastify';
import { EnableBankingService } from '../services/enableBanking.js';
import { GeminiService } from '../services/gemini.js';
import { TransactionProcessor } from '../services/transactions.js';
import { db } from '../db/client.js';
import { transactions, categories } from '../db/schema.js';

export default async function transactionsRoutes(fastify: FastifyInstance) {
  let bankingService: EnableBankingService;
  let geminiService: GeminiService;
  let processor: TransactionProcessor;

  fastify.addHook('onReady', async () => {
    bankingService = new EnableBankingService(
      fastify.config.ENABLE_BANKING_APP_ID,
      fastify.config.ENABLE_BANKING_KEY_PATH
    );
    geminiService = new GeminiService(fastify.config.GEMINI_API_KEY);
    processor = new TransactionProcessor(geminiService);

    // Seed delle categorie base al primo avvio se vuote
    const existingCats = db.select().from(categories).all();
    if (existingCats.length === 0) {
      const baseCategories = ['Groceries', 'Dining', 'Transportation', 'Entertainment', 'Shopping', 'Other'];
      const insertData = baseCategories.map(name => ({ name }));
      db.insert(categories).values(insertData).run();
      fastify.log.info('Categorie base caricate nel DB.');
    }
  });

  // 1. Genera il link per autorizzare Revolut
  fastify.post('/api/banking/auth', async (request, reply) => {
    try {
      const redirectUri = 'https://ledger.gigiamatore.me/callback';
        
      const authData = await bankingService.createAuthSession(redirectUri, 'Revolut');
      return { status: 'ok', authUrl: authData.url };
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({ error: error.message });
    }
  });

  // 2. Callback per processare le transazioni reali dalla banca
  fastify.post('/api/banking/callback', async (request: any, reply) => {
    try {
      const { code } = request.body;
      if (!code) throw new Error("Missing code from callback");
      
      const sessionData = await bankingService.createSession(code);
      const accounts = sessionData.accounts || [];
      
      // Prendiamo il conto in EUR
      const eurAccount = accounts.find((a: any) => a.currency === 'EUR');
      if (!eurAccount) throw new Error("Conto in EUR non trovato!");

      // Recuperiamo le transazioni dal conto
      const txData = await bankingService.getAccountTransactions(eurAccount.uid);
      const transactions = txData.transactions || [];

      // Processiamo tutte le transazioni scaricate dal conto
      const processed = [];
      for (const tx of transactions) {
        let amount = parseFloat(tx.transaction_amount?.amount || "0");
        
        // Open Banking API: DBIT = spesa, CRDT = entrata
        if (tx.credit_debit_indicator === 'DBIT') {
          amount = -Math.abs(amount);
        } else {
          amount = Math.abs(amount);
        }

        const currency = tx.transaction_amount?.currency || 'EUR';
        const date = tx.booking_date || new Date().toISOString();
        const description = (tx.remittance_information && tx.remittance_information[0]) 
                            || tx.remittance_information_unstructured 
                            || "Sconosciuto";
        
        const merchant = tx.creditor?.name || tx.debtor?.name || null;

        const p = await processor.processIncomingTransaction({
          bankTransactionId: tx.entry_reference || tx.transaction_id || `tx-${Date.now()}-${Math.random()}`,
          date,
          rawDescription: description,
          merchantName: merchant,
          amount,
          currency
        });
        processed.push(p);
      }

      return { status: 'ok', processed, total: transactions.length };
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({ error: error.message });
    }
  });

  fastify.get('/api/transactions', async (request, reply) => {
    try {
      const allTransactions = db.select().from(transactions).all();
      return { data: allTransactions };
    } catch (error: any) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Errore nel recupero delle transazioni.' });
    }
  });
}
