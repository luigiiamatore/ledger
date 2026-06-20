export class GeminiService {
  private apiKey: string;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Chiede a Gemini di categorizzare un merchant sulla base di una lista di categorie disponibili.
   */
  async categorizeMerchant(merchantName: string, availableCategories: string[]): Promise<string> {
    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      console.warn('Gemini API key non configurata. Salto la categorizzazione AI.');
      throw new Error('GEMINI_KEY_MISSING');
    }

    const prompt = `Sei un assistente finanziario. Categorizza il seguente esercente scegliendo ESATTAMENTE una delle seguenti categorie: ${availableCategories.join(', ')}. Se nessuna si adatta, scegli quella più simile o una categoria generica se presente. Restituisci SOLO ed ESCLUSIVAMENTE il nome della categoria, senza punteggiatura aggiuntiva. Esercente: "${merchantName}"`;

    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Bassa temperatura per risposte deterministiche
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Errore API Gemini:', err);
      throw new Error('Failed to categorize merchant');
    }

    const data = await response.json();
    const category = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return category || 'Other';
  }
}
