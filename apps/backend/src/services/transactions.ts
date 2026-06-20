import { db } from '../db/client.js';
import { transactions, categories, merchantCache } from '../db/schema.js';
import { GeminiService } from './gemini.js';
import { eq } from 'drizzle-orm';

export class TransactionProcessor {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * Converte un importo in EUR. 
   * (In produzione i tassi di cambio potrebbero provenire da un'API esterna come Fixer o OpenExchangeRates)
   */
  private convertToEur(amount: number, currency: string): number {
    const rates: Record<string, number> = {
      EUR: 1,
      JPY: 0.0061, // 1 JPY = ~0.0061 EUR
      PLN: 0.23,   // 1 PLN = ~0.23 EUR
      USD: 0.92,   // 1 USD = ~0.92 EUR
    };
    const rate = rates[currency.toUpperCase()] || 1;
    return parseFloat((amount * rate).toFixed(2));
  }

  async processIncomingTransaction(txData: {
    bankTransactionId: string;
    date: string;
    rawDescription: string;
    merchantName?: string;
    amount: number;
    currency: string;
  }) {
    let categoryId: number | null = null;
    const merchantName = txData.merchantName || txData.rawDescription;

    if (merchantName) {
      // 1. Controlla nella cache locale se conosciamo già la categoria di questo merchant
      const cached = db.select().from(merchantCache).where(eq(merchantCache.merchantName, merchantName)).get();
      
      if (cached) {
        categoryId = cached.categoryId;
        console.log(`[Cache Hit] Categoria trovata per ${merchantName}: ID ${categoryId}`);
      } else {
        // 2. Cache Miss: Interroga Gemini
        const allCategories = db.select().from(categories).all();
        if (allCategories.length > 0) {
          const categoryNames = allCategories.map(c => c.name);
          try {
            console.log(`[Cache Miss] Interrogo Gemini per ${merchantName}...`);
            const aiAssignedName = await this.geminiService.categorizeMerchant(merchantName, categoryNames);
            
            const matchedCategory = allCategories.find(c => c.name.toLowerCase() === aiAssignedName.toLowerCase());
            
            if (matchedCategory) {
              categoryId = matchedCategory.id;
              // Salva in cache per le transazioni future
              db.insert(merchantCache).values({
                merchantName,
                categoryId
              }).run();
              console.log(`[AI Cached] ${merchantName} associato a ${matchedCategory.name}`);
            }
          } catch (e: any) {
            if (e.message === 'GEMINI_KEY_MISSING') {
              console.log(`[Fallback] Assegno temporaneamente "Other" a ${merchantName} senza salvarlo in cache.`);
              const otherCat = allCategories.find(c => c.name === 'Other');
              if (otherCat) categoryId = otherCat.id;
            } else {
              console.error(`Fallita categorizzazione AI per ${merchantName}`, e);
            }
          }
        }
      }
    }

    // 3. Calcola l'importo convertito in EUR
    const baseAmountEur = this.convertToEur(txData.amount, txData.currency);

    // 4. Salva la transazione (ignora se già esistente basandosi su bankTransactionId)
    try {
      const newTx = db.insert(transactions).values({
        bankTransactionId: txData.bankTransactionId,
        date: txData.date,
        rawDescription: txData.rawDescription,
        merchantName,
        amount: txData.amount,
        currency: txData.currency,
        baseAmountEur,
        categoryId
      }).returning().get();
      
      return newTx;
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        console.log(`[Skip] Transazione ${txData.bankTransactionId} già esistente.`);
        return null; // Transazione già salvata
      }
      throw e;
    }
  }
}
