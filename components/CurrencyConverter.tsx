import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import currencyService, { CurrencyData, POPULAR_CURRENCIES } from "../services/currencyService";

interface CurrencyConverterProps {}

const CurrencyConverter: React.FC<CurrencyConverterProps> = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [amount, setAmount] = useState<string>("");
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [currencyData, setCurrencyData] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteCurrencies, setFavoriteCurrencies] = useState<string[]>([]);

  const loadBaseCurrency = useCallback(async () => {
    try {
      const savedBaseCurrency = await currencyService.getBaseCurrency();
      setBaseCurrency(savedBaseCurrency);
    } catch (error) {
      console.error("Error loading base currency:", error);
      setBaseCurrency("USD");
    }
  }, []);

  const loadFavoriteCurrencies = useCallback(async () => {
    try {
      const favorites = await currencyService.getFavoriteCurrencies();
      setFavoriteCurrencies(favorites);
    } catch (error) {
      console.error("Error loading favorite currencies:", error);
    }
  }, []);

  const loadExchangeRates = useCallback(async () => {
    if (!baseCurrency) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await currencyService.getExchangeRates(baseCurrency);
      setCurrencyData(data);
    } catch (err) {
      console.error("Error loading exchange rates:", err);
      setError(err instanceof Error ? err.message : "Failed to load exchange rates");
    } finally {
      setLoading(false);
    }
  }, [baseCurrency]);

  useEffect(() => {
    const initializeApp = async () => {
      await loadBaseCurrency();
    };
    initializeApp();
  }, [loadBaseCurrency]);

  useEffect(() => {
    if (baseCurrency) {
      loadExchangeRates();
      loadFavoriteCurrencies();
    }
  }, [baseCurrency, loadExchangeRates, loadFavoriteCurrencies]);

  const handleAmountChange = (text: string) => {
    // Allow only numbers and decimal point
    const cleanText = text.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = cleanText.split(".");
    if (parts.length <= 2) {
      setAmount(cleanText);
    }
  };

  const handleCurrencyChange = async (currency: string) => {
    setBaseCurrency(currency);
    try {
      await currencyService.setBaseCurrency(currency);
    } catch (error) {
      console.error("Error saving base currency:", error);
    }
  };

  const handleToggleFavorite = async (currency: string) => {
    try {
      const isNowFavorite = await currencyService.toggleFavoriteCurrency(currency);
      await loadFavoriteCurrencies();
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const getSortedCurrencies = (currencies: string[]) => {
    return [...currencies].sort((a, b) => a.localeCompare(b));
  };

  const formatAmount = (value: number, currency: string): string => {
    if (value < 0.01) {
      return currencyService.getCurrencySymbol(currency) + "0.00";
    }

    return currencyService.formatCurrency(value, currency);
  };

  const renderCurrencyItem = (currency: string, isFavorite: boolean = false, isHorizontal: boolean = false) => {
    if (!currencyData || amount === undefined) return null;

    const numericAmount = parseFloat(amount) || 0;
    const convertedAmount = currencyService.convertCurrency(numericAmount, baseCurrency, currency, currencyData.rates);

    if (isHorizontal) {
      return (
        <View key={currency} style={[styles.horizontalCurrencyItem, isDark && styles.darkHorizontalCurrencyItem]}>
          <View style={styles.horizontalCurrencyInfo}>
            <Text style={[styles.horizontalCurrencyCode, isDark && styles.darkHorizontalCurrencyCode]}>{currency}</Text>
            <Text style={[styles.horizontalCurrencySymbol, isDark && styles.darkHorizontalCurrencySymbol]}>
              {currencyService.getCurrencySymbol(currency)}
            </Text>
          </View>
          <Text style={styles.horizontalConvertedAmount}>{formatAmount(convertedAmount, currency)}</Text>
          <TouchableOpacity style={styles.horizontalFavoriteButton} onPress={() => handleToggleFavorite(currency)}>
            <Text style={styles.favoriteButtonText}>❤️</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View key={currency} style={[styles.currencyItem, isFavorite && styles.favoriteItem]}>
        <View style={styles.currencyInfo}>
          <Text style={styles.currencyCode}>{currency}</Text>
          <Text style={styles.currencySymbol}>{currencyService.getCurrencySymbol(currency)}</Text>
          {isFavorite && <Text style={styles.favoriteStar}>⭐</Text>}
        </View>
        <View style={styles.currencyRight}>
          <Text style={styles.convertedAmount}>{formatAmount(convertedAmount, currency)}</Text>
          <TouchableOpacity style={styles.favoriteButton} onPress={() => handleToggleFavorite(currency)}>
            <Text style={styles.favoriteButtonText}>{favoriteCurrencies.includes(currency) ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={styles.toggleBaseButton}
            onPress={async () => {
              if (baseCurrency !== currency) {
                setBaseCurrency(currency);
                try {
                  await currencyService.setBaseCurrency(currency);
                } catch (error) {
                  console.error("Error saving base currency:", error);
                }
              }
            }}>
            <Text style={styles.toggleButtonText}>Set as {"\n"} Base</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleRefresh = () => {
    Keyboard.dismiss();
    loadExchangeRates();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.darkContainer]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CurrencySnap</Text>
      </View>

      {/* Input Section */}
      <View style={[styles.inputSection, isDark && styles.darkInputSection]}>
        <View style={styles.amountContainer}>
          <Text style={[styles.label, isDark && styles.darkLabel]}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <View style={styles.currencyContainer}>
          <Text style={[styles.label, isDark && styles.darkLabel]}>From Currency</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={baseCurrency} onValueChange={handleCurrencyChange} style={styles.picker}>
              {getSortedCurrencies(POPULAR_CURRENCIES).map(currency => (
                <Picker.Item key={currency} label={`${currency} - ${currencyService.getCurrencySymbol(currency)}`} value={currency} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading exchange rates...</Text>
        </View>
      )}

      {currencyData && !loading && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {favoriteCurrencies.length > 0 && (
            <View style={[styles.favoritesSection, isDark && styles.darkFavoritesSection]}>
              <Text style={[styles.favoritesTitle, isDark && styles.darkFavoritesTitle]}>Favorites</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
                {getSortedCurrencies(favoriteCurrencies.filter(currency => currency !== baseCurrency)).map(currency =>
                  renderCurrencyItem(currency, true, true)
                )}
              </ScrollView>
            </View>
          )}

          {/* Currency List */}
          <View style={[styles.resultsSection, isDark && styles.darkResultsSection]}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, isDark && styles.darkResultsTitle]}>All Currencies</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.currencyList, isDark && styles.darkCurrencyList]}>
              {getSortedCurrencies(POPULAR_CURRENCIES.filter(currency => currency !== baseCurrency)).map(currency =>
                renderCurrencyItem(currency, false, false)
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  darkContainer: {
    backgroundColor: "#1a1a1a",
  },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  inputSection: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkInputSection: {
    backgroundColor: "#2d2d2d",
  },
  amountContainer: {
    marginBottom: 20,
  },
  currencyContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  darkLabel: {
    color: "#fff",
  },
  amountInput: {
    borderWidth: 2,
    borderColor: "#e1e5e9",
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    fontWeight: "600",
    backgroundColor: "#f8f9fa",
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#e1e5e9",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  picker: {
    height: 50,
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    margin: 20,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
    alignItems: "center",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#f44336",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  resultsSection: {
    flex: 1,
    margin: 20,
    marginTop: 0,
  },
  darkResultsSection: {
    backgroundColor: "#2d2d2d",
    borderRadius: 12,
    padding: 15,
    margin: 20,
    marginTop: 0,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  darkResultsTitle: {
    color: "#fff",
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  currencyList: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkCurrencyList: {
    backgroundColor: "#2d2d2d",
  },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  favoriteItem: {
    backgroundColor: "#fff8e1",
    borderLeftWidth: 3,
    borderLeftColor: "#ffa000",
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  favoriteStar: {
    fontSize: 12,
  },
  currencyRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  convertedAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 10,
  },
  favoriteButton: {
    padding: 5,
  },
  favoriteButtonText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  toggleButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  toggleBaseButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  toggleButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  favoritesSection: {
    backgroundColor: "#fff",
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkFavoritesSection: {
    backgroundColor: "#2d2d2d",
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  darkFavoritesTitle: {
    color: "#fff",
  },
  favoritesScroll: {
    flexDirection: "row",
  },
  horizontalCurrencyItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    minWidth: 120,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  darkHorizontalCurrencyItem: {
    backgroundColor: "#3d3d3d",
    borderColor: "#555",
  },
  horizontalCurrencyInfo: {
    alignItems: "center",
    marginBottom: 8,
  },
  horizontalCurrencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  darkHorizontalCurrencyCode: {
    color: "#fff",
  },
  horizontalCurrencySymbol: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  darkHorizontalCurrencySymbol: {
    color: "#ccc",
  },
  horizontalConvertedAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 8,
  },
  horizontalFavoriteButton: {
    padding: 4,
  },
});

export default CurrencyConverter;
