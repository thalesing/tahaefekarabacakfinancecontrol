import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  Coins, 
  Calculator, 
  Briefcase, 
  ArrowRightLeft, 
  Clock, 
  ChevronRight, 
  Info, 
  LineChart, 
  CheckCircle2,
  PieChart as PieIcon,
  Plus,
  Trash2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MarketData, CurrencyRate, CryptoRate, BistStock, BistIndex } from "./types";
import { formatTRY, formatUSD, formatNumber, formatPercent, generateHistoricalData } from "./utils";

export default function App() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bist" | "forex" | "gold" | "crypto">("bist");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<{
    id: string;
    code: string;
    name: string;
    price: number;
    change: number;
    type: "bist_index" | "bist_stock" | "currency" | "gold" | "crypto";
  } | null>(null);
  const [chartDays, setChartDays] = useState<number>(15);

  // Clock state
  const [timeStr, setTimeStr] = useState("");

  // Converter State
  const [convertAmount, setConvertAmount] = useState<string>("10000");
  const [convertFrom, setConvertFrom] = useState<string>("TRY");

  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<Array<{
    id: string;
    type: "TRY" | "USD" | "EUR" | "XU100" | "THYAO" | "GOLD" | "BTC" | "ETH";
    name: string;
    amount: number;
    unitPriceTry: number;
  }>>([
    { id: "1", type: "TRY", name: "Türk Lirası", amount: 15000, unitPriceTry: 1 },
    { id: "2", type: "USD", name: "ABD Doları", amount: 1200, unitPriceTry: 34.25 },
    { id: "3", type: "GOLD", name: "Gram Altın", amount: 15, unitPriceTry: 2580 },
    { id: "4", type: "THYAO", name: "THYAO Hisse", amount: 120, unitPriceTry: 312.25 }
  ]);
  const [newAssetType, setNewAssetType] = useState<string>("TRY");
  const [newAssetAmount, setNewAssetAmount] = useState<string>("");

  // Fetch data
  const loadMarketData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/market-data");
      if (!res.ok) {
        throw new Error("Sunucudan finansal veriler alınamadı.");
      }
      const json: MarketData = await res.json();
      setData(json);
      setError(null);

      // Auto select first asset (BIST 100 index) if not already selected
      if (!selectedAsset && json.bist?.indices?.length > 0) {
        const primary = json.bist.indices[0];
        setSelectedAsset({
          id: primary.code,
          code: primary.code,
          name: primary.name,
          price: primary.price,
          change: primary.change,
          type: "bist_index"
        });
      } else if (selectedAsset && json) {
        // Update selected asset price from fresh feed
        updateSelectedAssetReference(selectedAsset.code, json);
      }
    } catch (err: any) {
      console.error(err);
      setError("Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedAssetReference = (code: string, freshData: MarketData) => {
    // Search in indices
    const idx = freshData.bist?.indices?.find(i => i.code === code);
    if (idx) {
      setSelectedAsset({ id: idx.code, code: idx.code, name: idx.name, price: idx.price, change: idx.change, type: "bist_index" });
      return;
    }
    // Search in stocks
    const stk = freshData.bist?.stocks?.find(s => s.code === code);
    if (stk) {
      setSelectedAsset({ id: stk.code, code: stk.code, name: stk.name, price: stk.price, change: stk.change, type: "bist_stock" });
      return;
    }
    // Search in currencies
    const cur = freshData.currencies?.find(c => c.code === code);
    if (cur) {
      setSelectedAsset({ id: cur.code, code: cur.code, name: cur.name, price: cur.buying, change: cur.change, type: "currency" });
      return;
    }
    // Search in crypto
    const cry = freshData.crypto?.find(c => c.symbol === code);
    if (cry) {
      setSelectedAsset({ id: cry.id, code: cry.symbol, name: cry.name, price: cry.priceUsd, change: cry.change24h, type: "crypto" });
      return;
    }
    // Search in gold
    if (code === "ALTIN_GRAM") {
      setSelectedAsset({ id: "ALTIN_GRAM", code: "ALTIN_GRAM", name: "Gram Altın", price: freshData.gold?.gramTry, change: freshData.gold?.change24h, type: "gold" });
    }
  };

  useEffect(() => {
    loadMarketData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync clock
  useEffect(() => {
    const updateTime = () => {
      const istanbulTime = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      setTimeStr(istanbulTime);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update portfolio weights and prices when market data updates
  useEffect(() => {
    if (!data) return;

    const usdPrice = data.currencies.find(c => c.code === "USD")?.buying || 34.25;
    const eurPrice = data.currencies.find(c => c.code === "EUR")?.buying || 37.15;
    const goldPrice = data.gold?.gramTry || 2580;
    const btcPrice = (data.crypto.find(c => c.symbol === "BTC")?.priceUsd || 94500) * usdPrice;
    const ethPrice = (data.crypto.find(c => c.symbol === "ETH")?.priceUsd || 3120) * usdPrice;
    const bistPrice = data.bist?.indices?.find(i => i.code === "XU100")?.price || 9850;
    const thyaoPrice = data.bist?.stocks?.find(s => s.code === "THYAO")?.price || 312;

    setPortfolioItems(prev => prev.map(item => {
      let unitPrice = 1;
      if (item.type === "USD") unitPrice = usdPrice;
      if (item.type === "EUR") unitPrice = eurPrice;
      if (item.type === "GOLD") unitPrice = goldPrice;
      if (item.type === "BTC") unitPrice = btcPrice;
      if (item.type === "ETH") unitPrice = ethPrice;
      if (item.type === "XU100") unitPrice = bistPrice;
      if (item.type === "THYAO") unitPrice = thyaoPrice;

      return {
        ...item,
        unitPriceTry: unitPrice
      };
    }));
  }, [data]);

  // Generate chart data based on active selection
  const activeChartData = useMemo(() => {
    if (!selectedAsset) return [];
    
    // Setup a clean volatility range for each asset type
    let volatility = 0.01;
    if (selectedAsset.type === "crypto") volatility = 0.03;
    if (selectedAsset.type === "bist_stock") volatility = 0.02;
    if (selectedAsset.type === "gold") volatility = 0.008;
    if (selectedAsset.type === "currency") volatility = 0.004;

    return generateHistoricalData(selectedAsset.price, chartDays, volatility);
  }, [selectedAsset, chartDays]);

  // Handle category list filters
  const filteredBistIndices = useMemo(() => {
    if (!data) return [];
    return data.bist.indices.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const filteredBistStocks = useMemo(() => {
    if (!data) return [];
    return data.bist.stocks.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const filteredCurrencies = useMemo(() => {
    if (!data) return [];
    return data.currencies.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const filteredCryptos = useMemo(() => {
    if (!data) return [];
    return data.crypto.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // Smart conversions
  const conversionResults = useMemo(() => {
    if (!data) return [];
    const amount = parseFloat(convertAmount) || 0;
    const usdRate = data.currencies.find(c => c.code === "USD")?.buying || 34.25;
    const eurRate = data.currencies.find(c => c.code === "EUR")?.buying || 37.15;
    const goldRate = data.gold?.gramTry || 2580;
    const btcRate = (data.crypto.find(c => c.symbol === "BTC")?.priceUsd || 94500) * usdRate;

    // Convert input to common base TRY
    let tryVal = 0;
    if (convertFrom === "TRY") tryVal = amount;
    else if (convertFrom === "USD") tryVal = amount * usdRate;
    else if (convertFrom === "EUR") tryVal = amount * eurRate;
    else if (convertFrom === "GOLD") tryVal = amount * goldRate;
    else if (convertFrom === "BTC") tryVal = amount * btcRate;

    return [
      { code: "TRY", name: "Türk Lirası", value: tryVal, formatted: formatTRY(tryVal) },
      { code: "USD", name: "ABD Doları", value: tryVal / usdRate, formatted: formatUSD(tryVal / usdRate) },
      { code: "EUR", name: "Euro", value: tryVal / eurRate, formatted: `€${formatNumber(tryVal / eurRate, 2)}` },
      { code: "GOLD", name: "Gram Altın", value: tryVal / goldRate, formatted: `${formatNumber(tryVal / goldRate, 2)} gr` },
      { code: "BTC", name: "Bitcoin", value: tryVal / btcRate, formatted: `₿ ${formatNumber(tryVal / btcRate, 6)}` }
    ].filter(item => item.code !== convertFrom);
  }, [data, convertAmount, convertFrom]);

  // Portfolio aggregates
  const portfolioSummary = useMemo(() => {
    let totalTry = 0;
    const itemsWithValues = portfolioItems.map(item => {
      const valueTry = item.amount * item.unitPriceTry;
      totalTry += valueTry;
      return {
        ...item,
        valueTry
      };
    });

    const pieData = itemsWithValues.map(item => ({
      name: item.name,
      value: item.valueTry,
      percentage: totalTry > 0 ? (item.valueTry / totalTry) * 100 : 0
    }));

    return {
      items: itemsWithValues,
      totalTry,
      pieData
    };
  }, [portfolioItems]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  const handleAddPortfolioAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAssetAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    let name = newAssetType;
    if (newAssetType === "TRY") name = "Türk Lirası";
    else if (newAssetType === "USD") name = "ABD Doları";
    else if (newAssetType === "EUR") name = "Euro";
    else if (newAssetType === "GOLD") name = "Gram Altın";
    else if (newAssetType === "BTC") name = "Bitcoin";
    else if (newAssetType === "THYAO") name = "THYAO Hisse";

    const newItem = {
      id: Date.now().toString(),
      type: newAssetType as any,
      name,
      amount: amountVal,
      unitPriceTry: 1
    };

    setPortfolioItems(prev => [...prev, newItem]);
    setNewAssetAmount("");
  };

  const handleRemovePortfolioItem = (id: string) => {
    setPortfolioItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900" id="main-container">
      
      {/* Dynamic Upper Marquee Status Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 overflow-hidden border-b border-slate-800" id="top-marquee-strip">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-6">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-slate-300">Anlık Veri Akışı Aktif</span>
          </div>
          
          {data ? (
            <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar py-0.5">
              <div 
                className="flex items-center space-x-1.5 cursor-pointer hover:text-blue-400 transition"
                onClick={() => {
                  const x100 = data.bist.indices.find(i => i.code === "XU100");
                  if (x100) setSelectedAsset({ id: "XU100", code: "XU100", name: "BIST 100", price: x100.price, change: x100.change, type: "bist_index" });
                }}
              >
                <span className="text-slate-400 font-semibold">BIST 100:</span>
                <span className="font-mono font-medium">{formatNumber(data.bist.indices[0]?.price, 1)}</span>
                <span className={`font-mono text-[11px] ${data.bist.indices[0]?.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(data.bist.indices[0]?.change)}
                </span>
              </div>

              <div 
                className="flex items-center space-x-1.5 cursor-pointer hover:text-blue-400 transition"
                onClick={() => {
                  const usd = data.currencies.find(c => c.code === "USD");
                  if (usd) setSelectedAsset({ id: "USD", code: "USD", name: "ABD Doları", price: usd.buying, change: usd.change, type: "currency" });
                }}
              >
                <span className="text-slate-400 font-semibold">USD/TRY:</span>
                <span className="font-mono font-medium">{formatNumber(data.currencies.find(c => c.code === "USD")?.buying || 34.25, 4)}</span>
                <span className="text-emerald-400 font-mono text-[11px]">+0.14%</span>
              </div>

              <div 
                className="flex items-center space-x-1.5 cursor-pointer hover:text-blue-400 transition"
                onClick={() => {
                  const eur = data.currencies.find(c => c.code === "EUR");
                  if (eur) setSelectedAsset({ id: "EUR", code: "EUR", name: "Euro", price: eur.buying, change: eur.change, type: "currency" });
                }}
              >
                <span className="text-slate-400 font-semibold">EUR/TRY:</span>
                <span className="font-mono font-medium">{formatNumber(data.currencies.find(c => c.code === "EUR")?.buying || 37.15, 4)}</span>
                <span className="text-red-400 font-mono text-[11px]">-0.08%</span>
              </div>

              <div 
                className="flex items-center space-x-1.5 cursor-pointer hover:text-blue-400 transition"
                onClick={() => setSelectedAsset({ id: "ALTIN_GRAM", code: "ALTIN_GRAM", name: "Gram Altın", price: data.gold.gramTry, change: data.gold.change24h, type: "gold" })}
              >
                <span className="text-slate-400 font-semibold">Altın Gram:</span>
                <span className="font-mono font-medium">{formatTRY(data.gold.gramTry, 1)}</span>
                <span className="text-emerald-400 font-mono text-[11px]">{formatPercent(data.gold.change24h)}</span>
              </div>

              <div 
                className="flex items-center space-x-1.5 cursor-pointer hover:text-blue-400 transition"
                onClick={() => {
                  const btc = data.crypto.find(c => c.symbol === "BTC");
                  if (btc) setSelectedAsset({ id: btc.id, code: btc.symbol, name: btc.name, price: btc.priceUsd, change: btc.change24h, type: "crypto" });
                }}
              >
                <span className="text-slate-400 font-semibold">BTC/USD:</span>
                <span className="font-mono font-medium">{formatUSD(data.crypto[0]?.priceUsd, 0)}</span>
                <span className="text-emerald-400 font-mono text-[11px]">{formatPercent(data.crypto[0]?.change24h)}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500">Piyasa verileri yükleniyor...</span>
          )}

          <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
            <Clock size={12} className="text-blue-400" />
            <span className="font-mono">{timeStr}</span>
            <span className="text-slate-600">|</span>
            <span>İstanbul (UTC+3)</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 py-5 px-6 sticky top-0 z-40 shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={loadMarketData}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <TrendingUp size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">
                FinansTR <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 ml-1 border border-blue-100">Portal</span>
              </h1>
              <p className="text-xs text-slate-500">Anlık Borsa, Döviz ve Emtia Takip Portalı</p>
            </div>
          </div>

          {/* Search Asset */}
          <div className="relative w-full md:w-80" id="search-container">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enstrüman adı veya sembolü ara..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Refresh Action & Status */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            {data && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">TCMB Veri Saati</p>
                <p className="text-xs text-slate-600 font-mono font-medium">
                  {new Date(data.lastUpdated).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            )}
            
            <button
              id="refresh-button"
              onClick={loadMarketData}
              disabled={loading}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Güncelleniyor" : "Yenile"}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main">
        
        {error && (
          <div className="col-span-12 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3 shadow-xs animate-fade-in" id="error-banner">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <Info size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">Bağlantı Hatası</p>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {/* COL 1: Active List Options (5 Cols wide) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-4" id="col-market-lists">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[520px]">
            
            {/* Tab Toggles */}
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 p-1" id="tab-navigation">
              <button
                id="tab-bist"
                onClick={() => { setActiveTab("bist"); setSearchQuery(""); }}
                className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all ${activeTab === "bist" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                BIST Borsa
              </button>
              <button
                id="tab-forex"
                onClick={() => { setActiveTab("forex"); setSearchQuery(""); }}
                className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all ${activeTab === "forex" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Döviz Kurları
              </button>
              <button
                id="tab-gold"
                onClick={() => { setActiveTab("gold"); setSearchQuery(""); }}
                className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all ${activeTab === "gold" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Altın/Emtia
              </button>
              <button
                id="tab-crypto"
                onClick={() => { setActiveTab("crypto"); setSearchQuery(""); }}
                className={`py-2 px-1 text-center text-xs font-semibold rounded-lg transition-all ${activeTab === "crypto" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Kripto
              </button>
            </div>

            {/* List scroll view */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100" id="market-list-scroller">
              {!data ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
                  <RefreshCw className="animate-spin text-slate-300" size={32} />
                  <p className="text-sm">Finansal veriler yükleniyor...</p>
                </div>
              ) : (
                <>
                  {/* BIST Tab */}
                  {activeTab === "bist" && (
                    <div>
                      {/* Indices Section */}
                      <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Borsa Endeksleri
                      </div>
                      {filteredBistIndices.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Endeks bulunamadı.</div>
                      ) : (
                        filteredBistIndices.map(item => (
                          <div
                            key={item.code}
                            id={`bist-index-${item.code}`}
                            onClick={() => setSelectedAsset({ id: item.code, code: item.code, name: item.name, price: item.price, change: item.change, type: "bist_index" })}
                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === item.code ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-sm text-slate-800">{item.code}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">Endeks</span>
                              </div>
                              <span className="text-xs text-slate-500">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm block">{formatNumber(item.price, 2)}</span>
                              <span className={`inline-flex items-center text-xs font-mono font-semibold ${item.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {formatPercent(item.change)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Stocks Section */}
                      <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-b border-slate-100">
                        BIST Hisseleri
                      </div>
                      {filteredBistStocks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Hisse senedi bulunamadı.</div>
                      ) : (
                        filteredBistStocks.map(item => (
                          <div
                            key={item.code}
                            id={`bist-stock-${item.code}`}
                            onClick={() => setSelectedAsset({ id: item.code, code: item.code, name: item.name, price: item.price, change: item.change, type: "bist_stock" })}
                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === item.code ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-sm text-slate-800">{item.code}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-semibold">BIST</span>
                              </div>
                              <span className="text-xs text-slate-500">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm block">{formatTRY(item.price, 2)}</span>
                              <span className={`inline-flex items-center text-xs font-mono font-semibold ${item.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {formatPercent(item.change)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Forex Tab */}
                  {activeTab === "forex" && (
                    <div>
                      <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        TCMB Döviz Kurları
                      </div>
                      {filteredCurrencies.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Döviz kuru bulunamadı.</div>
                      ) : (
                        filteredCurrencies.map(item => (
                          <div
                            key={item.code}
                            id={`forex-row-${item.code}`}
                            onClick={() => setSelectedAsset({ id: item.code, code: item.code, name: item.name, price: item.buying, change: item.change, type: "currency" })}
                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === item.code ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-sm text-slate-800">{item.code}/TRY</span>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">TCMB</span>
                              </div>
                              <span className="text-xs text-slate-500">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm block">{formatNumber(item.buying, 4)} ₺</span>
                              <div className="text-[11px] text-slate-400 font-mono">
                                Satış: <span className="font-semibold text-slate-600">{formatNumber(item.selling, 4)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Gold / Emtia Tab */}
                  {activeTab === "gold" && (
                    <div>
                      <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Altın & Kıymetli Metaller
                      </div>

                      {/* Gram Gold */}
                      <div
                        id="gold-row-gram"
                        onClick={() => setSelectedAsset({ id: "ALTIN_GRAM", code: "ALTIN_GRAM", name: "Gram Altın", price: data.gold.gramTry, change: data.gold.change24h, type: "gold" })}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === "ALTIN_GRAM" ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-800">ALTIN (GRAM)</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">Harem</span>
                          </div>
                          <span className="text-xs text-slate-500">24 Ayar Has Altın Gram Fiyatı</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm block">{formatTRY(data.gold.gramTry, 2)}</span>
                          <span className={`inline-flex items-center text-xs font-mono font-semibold ${data.gold.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {data.gold.change24h >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {formatPercent(data.gold.change24h)}
                          </span>
                        </div>
                      </div>

                      {/* Çeyrek Gold */}
                      <div
                        id="gold-row-ceyrek"
                        onClick={() => setSelectedAsset({ id: "ALTIN_CEYREK", code: "ALTIN_CEYREK", name: "Çeyrek Altın", price: data.gold.ceyrekTry, change: data.gold.change24h, type: "gold" })}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === "ALTIN_CEYREK" ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-800">ÇEYREK ALTIN</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">Yeni</span>
                          </div>
                          <span className="text-xs text-slate-500">Çeyrek ziynet altın fiyatı</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm block">{formatTRY(data.gold.ceyrekTry, 2)}</span>
                          <span className={`inline-flex items-center text-xs font-mono font-semibold ${data.gold.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {data.gold.change24h >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {formatPercent(data.gold.change24h)}
                          </span>
                        </div>
                      </div>

                      {/* Cumhuriyet Gold */}
                      <div
                        id="gold-row-cumhuriyet"
                        onClick={() => setSelectedAsset({ id: "ALTIN_CUMHURIYET", code: "ALTIN_CUMHURIYET", name: "Cumhuriyet Altını", price: data.gold.cumhuriyetTry, change: data.gold.change24h, type: "gold" })}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === "ALTIN_CUMHURIYET" ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-800">CUMHURİYET</span>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">Ata</span>
                          </div>
                          <span className="text-xs text-slate-500">Cumhuriyet Ata ziynet altın fiyatı</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm block">{formatTRY(data.gold.cumhuriyetTry, 2)}</span>
                          <span className={`inline-flex items-center text-xs font-mono font-semibold ${data.gold.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {data.gold.change24h >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {formatPercent(data.gold.change24h)}
                          </span>
                        </div>
                      </div>

                      {/* Ounce Gold */}
                      <div
                        id="gold-row-ounce"
                        onClick={() => setSelectedAsset({ id: "ALTIN_ONS", code: "ALTIN_ONS", name: "Altın Ons Fiyatı", price: data.gold.ounceUsd, change: data.gold.change24h, type: "gold" })}
                        className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === "ALTIN_ONS" ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-800">XAU/USD (ONS)</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">Global</span>
                          </div>
                          <span className="text-xs text-slate-500">Uluslararası Ons Altın Fiyatı</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm block">{formatUSD(data.gold.ounceUsd, 2)}</span>
                          <span className={`inline-flex items-center text-xs font-mono font-semibold ${data.gold.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {data.gold.change24h >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {formatPercent(data.gold.change24h)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Crypto Tab */}
                  {activeTab === "crypto" && (
                    <div>
                      <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        Kripto Paralar (CoinGecko)
                      </div>
                      {filteredCryptos.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">Kripto para bulunamadı.</div>
                      ) : (
                        filteredCryptos.map(item => (
                          <div
                            key={item.id}
                            id={`crypto-row-${item.symbol}`}
                            onClick={() => setSelectedAsset({ id: item.id, code: item.symbol, name: item.name, price: item.priceUsd, change: item.change24h, type: "crypto" })}
                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${selectedAsset?.code === item.symbol ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''}`}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-sm text-slate-800">{item.symbol}/USD</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-semibold">{item.name}</span>
                              </div>
                              <span className="text-xs text-slate-500">TR Karşılığı: {formatTRY(item.priceTry, 0)}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm block">{formatUSD(item.priceUsd, 2)}</span>
                              <span className={`inline-flex items-center text-xs font-mono font-semibold ${item.change24h >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.change24h >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {formatPercent(item.change24h)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Quick Helper text in List footer */}
            <div className="bg-slate-50 p-3 text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
              <span>Sol listeden varlık seçerek detayları inceleyebilirsiniz.</span>
              <span className="font-semibold text-slate-500">Seçili: {selectedAsset?.code || "-"}</span>
            </div>
          </div>
        </div>

        {/* COL 2: Active Asset View & Interactive Chart (7 cols wide / split in layouts) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col space-y-6" id="col-chart-and-widgets">
          
          {/* Main Visualizer Area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-[520px]" id="visualizer-card">
            
            {selectedAsset ? (
              <div className="flex-1 flex flex-col justify-between" id="chart-display-container">
                
                {/* Visualizer Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {selectedAsset.type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Kod: {selectedAsset.code}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1 font-display">{selectedAsset.name}</h2>
                  </div>

                  <div className="text-right sm:text-right">
                    <p className="text-xs text-slate-400">Anlık Satış Fiyatı</p>
                    <div className="flex items-baseline justify-end space-x-2 mt-0.5">
                      <span className="text-2xl font-mono font-bold text-slate-900">
                        {selectedAsset.type === "crypto" || selectedAsset.code === "ALTIN_ONS"
                          ? formatUSD(selectedAsset.price, selectedAsset.price > 100 ? 2 : 4)
                          : formatTRY(selectedAsset.price, selectedAsset.price > 100 ? 2 : 4)
                        }
                      </span>
                      <span className={`inline-flex items-center text-sm font-mono font-semibold ${selectedAsset.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {selectedAsset.change >= 0 ? "+" : ""}
                        {selectedAsset.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="flex-1 min-h-[220px] relative mt-2" id="recharts-wrapper">
                  <div className="absolute top-2 left-2 z-10 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[10px] text-slate-500 font-medium">
                    Simüle Geçmiş Trend ({chartDays} Günlük Hareket)
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedAsset.change >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={selectedAsset.change >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        orientation="right"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#38bdf8', fontSize: '13px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Değer" 
                        stroke={selectedAsset.change >= 0 ? "#10b981" : "#ef4444"} 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Day Range Filter & Meta */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <div className="flex space-x-1" id="chart-interval-toggles">
                    <button
                      id="range-7d"
                      onClick={() => setChartDays(7)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${chartDays === 7 ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      7G
                    </button>
                    <button
                      id="range-15d"
                      onClick={() => setChartDays(15)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${chartDays === 15 ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      15G
                    </button>
                    <button
                      id="range-30d"
                      onClick={() => setChartDays(30)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${chartDays === 30 ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      30G
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>* Değerler bilgilendirme amaçlı olup, son 10 saniyede simüle edilmiştir.</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full space-y-2">
                <LineChart size={40} className="text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold text-slate-700">Enstrüman Seçilmedi</p>
                <p className="text-xs max-w-sm text-center">Grafik ve anlık performans bilgilerini görüntülemek için sol taraftaki listeden bir döviz kuru, hisse senedi veya altın cinsi seçin.</p>
              </div>
            )}

          </div>

        </div>

        {/* FULL WIDTH / 2 COLUMN SPLIT FOR UTILITIES: Calculator, Portfolio */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6" id="widgets-bottom-row">
          
          {/* WIDGET 1: Modern Sade Çevirici */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col" id="calculator-widget">
            <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Finansal Hesap Makinesi</h3>
                <p className="text-xs text-slate-500">Seçilen dövizi anlık kurlarla çapraz dönüştürün</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-3">
                
                {/* Amount input */}
                <div className="col-span-8">
                  <label htmlFor="convert-amount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">MİKTAR</label>
                  <input
                    type="number"
                    id="convert-amount"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* From currency select */}
                <div className="col-span-4">
                  <label htmlFor="convert-from" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">BİRİM</label>
                  <select
                    id="convert-from"
                    value={convertFrom}
                    onChange={(e) => setConvertFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GOLD">Altın (gr)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </div>

              </div>

              {/* Conversion Outputs */}
              <div className="bg-slate-50 rounded-xl p-3 divide-y divide-slate-100 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-1.5">Eşdeğer Dönüşüm Sonuçları</p>
                {conversionResults.map(item => (
                  <div key={item.code} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium text-xs">{item.name} ({item.code})</span>
                    <span className="font-mono font-bold text-slate-800">{item.formatted}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Info size={12} className="text-emerald-500" />
                <span>Hesaplamalar Merkez Bankası ve CoinGecko referans kurları ile yapılır.</span>
              </div>
            </div>
          </div>

          {/* WIDGET 2: Sade Portföy Asistanı */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col" id="portfolio-widget">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 font-display">Varlık Portföyüm</h3>
                  <p className="text-xs text-slate-500">Sahip olduğunuz birikimleri girip toplam TL değerini izleyin</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">TOPLAM PORTFÖY</span>
                <span className="text-lg font-mono font-bold text-blue-600">{formatTRY(portfolioSummary.totalTry, 0)}</span>
              </div>
            </div>

            {/* Split layout: Form/List + Pie distribution Chart */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
              
              {/* Form & List */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                
                {/* List items */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {portfolioSummary.items.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Varlık listeniz boş.
                    </div>
                  ) : (
                    portfolioSummary.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatNumber(item.amount, item.type === "BTC" || item.type === "ETH" ? 4 : 1)} Adet/Birim
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className="font-mono font-bold block text-slate-800">{formatTRY(item.valueTry, 0)}</span>
                            <span className="text-[9px] text-slate-400 font-mono">Kur: {formatTRY(item.unitPriceTry, 1)}</span>
                          </div>
                          <button
                            id={`remove-portfolio-item-${item.id}`}
                            onClick={() => handleRemovePortfolioItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new Asset form */}
                <form onSubmit={handleAddPortfolioAsset} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
                  <select
                    id="new-asset-type"
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:outline-none"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GOLD">Gram Altın</option>
                    <option value="BTC">Bitcoin</option>
                    <option value="THYAO">THYAO</option>
                  </select>
                  
                  <input
                    type="number"
                    id="new-asset-amount"
                    placeholder="Miktar"
                    step="any"
                    required
                    value={newAssetAmount}
                    onChange={(e) => setNewAssetAmount(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  
                  <button
                    id="add-portfolio-btn"
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition shadow-xs"
                    title="Varlık Ekle"
                  >
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </form>

              </div>

              {/* Pie Chart display */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                {portfolioSummary.items.length > 0 ? (
                  <div className="w-full h-[140px] relative flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioSummary.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {portfolioSummary.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatTRY(value, 0)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-[10px] text-slate-400 font-semibold absolute pointer-events-none text-center">
                      Dağılım
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 text-[11px] text-slate-400 flex flex-col items-center justify-center">
                    <PieIcon size={28} className="text-slate-300 mb-1" />
                    <span>Dağılım grafiği için varlık ekleyin</span>
                  </div>
                )}
                
                {/* Compact Legend */}
                {portfolioSummary.items.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center mt-1 max-h-[45px] overflow-y-auto w-full px-2">
                    {portfolioSummary.pieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center space-x-1 text-[9px] text-slate-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span>{item.name}: %{item.percentage.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Main Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-6 text-center text-xs text-slate-500" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 FinansTR Ekonomi Portalı. Tüm hakları saklıdır.</p>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Resmi TCMB Günlük Döviz Kur Veritabanı ve CoinGecko API Entegrasyonu</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
