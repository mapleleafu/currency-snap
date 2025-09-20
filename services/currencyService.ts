import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ExchangeRates {
  [currency: string]: number;
}

export interface CurrencyData {
  rates: ExchangeRates;
  base: string;
  timestamp: number;
}

export const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
  "MXN",
  "SGD",
  "HKD",
  "NOK",
  "TRY",
  "RUB",
  "INR",
  "BRL",
  "ZAR",
  "KRW",
];

const CACHE_KEY = "currency_rates_cache";
const FAVORITES_KEY = "favorite_currencies";
const BASE_CURRENCY_KEY = "base_currency";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

class CurrencyService {
  private baseUrl = "https://api.exchangerate-api.com/v4/latest";

  async getExchangeRates(baseCurrency: string = "USD"): Promise<CurrencyData> {
    try {
      const cachedData = await this.getCachedRates(baseCurrency);
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        return cachedData;
      }

      const response = await fetch(`${this.baseUrl}/${baseCurrency}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const currencyData: CurrencyData = {
        rates: data.rates,
        base: data.base,
        timestamp: Date.now(),
      };

      await this.cacheRates(baseCurrency, currencyData);

      return currencyData;
    } catch (error) {
      console.error("Error fetching exchange rates:", error);

      // Try to return cached data even if expired
      const cachedData = await this.getCachedRates(baseCurrency);
      if (cachedData) {
        return cachedData;
      }

      throw new Error("Unable to fetch exchange rates. Please check your internet connection.");
    }
  }

  async getCachedRates(baseCurrency: string): Promise<CurrencyData | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error reading cached rates:", error);
      return null;
    }
  }

  async cacheRates(baseCurrency: string, data: CurrencyData): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_KEY}_${baseCurrency}`, JSON.stringify(data));
    } catch (error) {
      console.error("Error caching rates:", error);
    }
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_DURATION;
  }

  convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // All rates are relative to the base currency (not necessarily USD)
    // So we can directly multiply by the target currency rate
    return amount * (rates[toCurrency] || 0);
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      CNY: "¥",
      SEK: "kr",
      NZD: "NZ$",
      MXN: "$",
      SGD: "S$",
      HKD: "HK$",
      NOK: "kr",
      TRY: "₺",
      RUB: "₽",
      INR: "₹",
      BRL: "R$",
      ZAR: "R",
      KRW: "₩",
    };
    return symbols[currency] || currency;
  }

  // Favorites management
  async getFavoriteCurrencies(): Promise<string[]> {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error("Error reading favorite currencies:", error);
      return [];
    }
  }

  async setFavoriteCurrencies(favorites: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorite currencies:", error);
    }
  }

  async addFavoriteCurrency(currency: string): Promise<void> {
    const favorites = await this.getFavoriteCurrencies();
    if (!favorites.includes(currency)) {
      favorites.push(currency);
      await this.setFavoriteCurrencies(favorites);
    }
  }

  async removeFavoriteCurrency(currency: string): Promise<void> {
    const favorites = await this.getFavoriteCurrencies();
    const updatedFavorites = favorites.filter(fav => fav !== currency);
    await this.setFavoriteCurrencies(updatedFavorites);
  }

  async toggleFavoriteCurrency(currency: string): Promise<boolean> {
    const favorites = await this.getFavoriteCurrencies();
    if (favorites.includes(currency)) {
      await this.removeFavoriteCurrency(currency);
      return false;
    } else {
      await this.addFavoriteCurrency(currency);
      return true;
    }
  }

  async getBaseCurrency(): Promise<string> {
    try {
      const baseCurrency = await AsyncStorage.getItem(BASE_CURRENCY_KEY);
      const result = baseCurrency || "USD";
      return result;
    } catch (error) {
      console.error("Error reading base currency:", error);
      return "USD";
    }
  }

  async setBaseCurrency(currency: string): Promise<void> {
    try {
      await AsyncStorage.setItem(BASE_CURRENCY_KEY, currency);
    } catch (error) {
      console.error("Error saving base currency:", error);
    }
  }
}

export default new CurrencyService();
