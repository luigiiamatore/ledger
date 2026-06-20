import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export class EnableBankingService {
  private appId: string;
  private privateKey: string;
  private baseUrl = 'https://api.enablebanking.com';

  constructor(appId: string, keyPath: string) {
    this.appId = appId;
    
    // Il path è relativo alla root del progetto (apps/backend)
    const absoluteKeyPath = path.resolve(process.cwd(), keyPath);
    try {
      this.privateKey = fs.readFileSync(absoluteKeyPath, 'utf8');
    } catch (err) {
      console.error(`Impossibile leggere la chiave privata in: ${absoluteKeyPath}`);
      throw err;
    }
  }

  /**
   * Genera un JWT firmato con la tua chiave privata RSA-SHA256
   * per l'autenticazione con le API di Enable Banking.
   */
  generateToken(): string {
    const payload = {
      iss: this.appId,
      aud: 'api.enablebanking.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // Scade tra 1 ora
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      keyid: this.appId, 
    });
  }

  /**
   * Genera l'URL di autorizzazione per far accedere l'utente alla propria banca
   */
  async createAuthSession(redirectUri: string, aspspName: string = 'Revolut') {
    const token = this.generateToken();
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // Consenso valido 90 giorni

    const response = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access: {
          valid_until: validUntil
        },
        aspsp: {
          name: aspspName,
          country: "IT"
        },
        state: "ledger-local-state",
        redirect_url: redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enable Banking Auth error: ${response.status} - ${errorText}`);
    }

    return response.json(); // { url: "https://..." }
  }

  /**
   * Scambia il `code` ricevuto nel callback per una Sessione reale
   */
  async createSession(code: string) {
    const token = this.generateToken();
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enable Banking Session error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Esempio di chiamata API: Recupera i conti (Accounts)
   */
  async getAccounts() {
    const token = this.generateToken();
    const response = await fetch(`${this.baseUrl}/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enable Banking API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Esempio di chiamata API: Recupera le transazioni
   */
  async getAccountTransactions(accountId: string) {
    const token = this.generateToken();
    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enable Banking API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}
