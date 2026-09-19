import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

const CAPITALS_STORAGE_KEY = "trading-journal-capitals";
const TRADES_STORAGE_KEY = "trading-journal-trades";

const ASSETS = [
  "XAUUSD",
  "USDCAD",
  "EURUSD",
  "NZDUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCHF",
];

const SETUPS = [
  "ZS OA",
  "LDP + FIBO 50",
  "LDP + QM",
  "SSM1",
  "SSM2",
  "SSM3",
  "SBM1",
  "SBM2",
  "SBM3",
  "OB",
  "BB",
];

const SESSIONS = [
  "Asiatique",
  "Londres",
  "New York",
  "Asie + Londres",
  "Londres + New York",
  "Toutes sessions",
];

const TIMEFRAMES = [
  "M1",
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D1",
];

const RR_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "trades",
    label: "Journal des trades",
    icon: BookOpen,
  },
  {
    id: "capitals",
    label: "Capitaux",
    icon: WalletCards,
  },
  {
    id: "calendar",
    label: "Calendrier",
    icon: CalendarDays,
  },
  {
    id: "calculator",
    label: "Calculateur",
    icon: Calculator,
  },
];

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatMoney(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(decimals);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPipMultiplier(asset) {
  if (asset === "XAUUSD") {
    return 100;
  }

  if (asset.endsWith("JPY")) {
    return 100;
  }

  return 10000;
}

function getPipValuePerLot(asset, referencePrice) {
  const price = Number(referencePrice) || 0;

  if (asset === "XAUUSD") {
    return 1;
  }

  if (
    asset === "EURUSD" ||
    asset === "GBPUSD" ||
    asset === "AUDUSD" ||
    asset === "NZDUSD"
  ) {
    return 10;
  }

  if (asset === "USDJPY") {
    if (price <= 0) {
      return 0;
    }

    return 1000 / price;
  }

  if (asset === "USDCAD") {
    if (price <= 0) {
      return 0;
    }

    return 10 / price;
  }

  if (asset === "USDCHF") {
    if (price <= 0) {
      return 0;
    }

    return 10 / price;
  }

  return 10;
}

function calculatePips(asset, price1, price2) {
  const first = Number(price1);
  const second = Number(price2);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return 0;
  }

  return Math.abs(second - first) * getPipMultiplier(asset);
}

function calculateDirectionalPips(asset, direction, entry, exit) {
  const entryPrice = Number(entry);
  const exitPrice = Number(exit);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice)
  ) {
    return 0;
  }

  const multiplier = getPipMultiplier(asset);

  if (direction === "BUY") {
    return (exitPrice - entryPrice) * multiplier;
  }

  return (entryPrice - exitPrice) * multiplier;
}

function calculateStopPips(asset, direction, entry, sl) {
  const entryPrice = Number(entry);
  const stopPrice = Number(sl);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopPrice)
  ) {
    return 0;
  }

  const multiplier = getPipMultiplier(asset);

  if (direction === "BUY") {
    return (entryPrice - stopPrice) * multiplier;
  }

  return (stopPrice - entryPrice) * multiplier;
}

function calculateTP(direction, entry, sl, rr) {
  const entryPrice = Number(entry);
  const stopPrice = Number(sl);
  const ratio = Number(rr);

  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopPrice) ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    return 0;
  }

  const distance = Math.abs(entryPrice - stopPrice);

  if (direction === "BUY") {
    return entryPrice + distance * ratio;
  }

  return entryPrice - distance * ratio;
}

function calculateLot({
  riskAmount,
  asset,
  entry,
  sl,
  direction,
}) {
  const risk = Number(riskAmount);
  const entryPrice = Number(entry);
  const stopPrice = Number(sl);

  if (
    !Number.isFinite(risk) ||
    risk <= 0 ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopPrice)
  ) {
    return 0;
  }

  const stopPips = calculateStopPips(
    asset,
    direction,
    entryPrice,
    stopPrice
  );

  if (stopPips <= 0) {
    return 0;
  }

  const pipValuePerLot = getPipValuePerLot(
    asset,
    entryPrice
  );

  if (pipValuePerLot <= 0) {
    return 0;
  }

  const lot = risk / (stopPips * pipValuePerLot);

  return Math.floor(lot * 100) / 100;
}

function getCapitalRisk(capital) {
  if (!capital) {
    return 0;
  }

  const balance = Number(capital.currentBalance) || 0;

  if (capital.riskMode === "fixed") {
    return Number(capital.riskAmount) || 0;
  }

  return (
    balance * (Number(capital.riskPercent) || 0)
  ) / 100;
}

function getCapitalRiskPercent(capital) {
  if (!capital) {
    return 0;
  }

  const balance = Number(capital.currentBalance) || 0;

  if (capital.riskMode === "percentage") {
    return Number(capital.riskPercent) || 0;
  }

  if (balance <= 0) {
    return 0;
  }

  return (
    ((Number(capital.riskAmount) || 0) / balance) *
    100
  );
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [capitals, setCapitals] = useState(() => {
    try {
      const saved = localStorage.getItem(
        CAPITALS_STORAGE_KEY
      );

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [trades, setTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(
        TRADES_STORAGE_KEY
      );

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      CAPITALS_STORAGE_KEY,
      JSON.stringify(capitals)
    );
  }, [capitals]);

  useEffect(() => {
    localStorage.setItem(
      TRADES_STORAGE_KEY,
      JSON.stringify(trades)
    );
  }, [trades]);

  const activeNavigation = navigationItems.find(
    (item) => item.id === activePage
  );

  const capitalMap = useMemo(() => {
    return capitals.reduce((map, capital) => {
      map[capital.id] = capital;
      return map;
    }, {});
  }, [capitals]);

  const allClosedTrades = useMemo(() => {
    return trades.filter(
      (trade) =>
        trade.status === "closed" &&
        Number.isFinite(Number(trade.resultMoney))
    );
  }, [trades]);

  const totalTradePnL = useMemo(() => {
    return allClosedTrades.reduce(
      (total, trade) =>
        total + (Number(trade.resultMoney) || 0),
      0
    );
  }, [allClosedTrades]);

  const totalInitialCapital = useMemo(() => {
    return capitals.reduce(
      (total, capital) =>
        total + (Number(capital.initialCapital) || 0),
      0
    );
  }, [capitals]);

  const totalCurrentBalance = useMemo(() => {
    return capitals.reduce(
      (total, capital) =>
        total + (Number(capital.currentBalance) || 0),
      0
    );
  }, [capitals]);

  const totalWins = useMemo(() => {
    return allClosedTrades.filter(
      (trade) => Number(trade.resultMoney) > 0
    ).length;
  }, [allClosedTrades]);

  const winRate = useMemo(() => {
    if (allClosedTrades.length === 0) {
      return 0;
    }

    return (
      (totalWins / allClosedTrades.length) *
      100
    );
  }, [allClosedTrades, totalWins]);

  const handleCreateCapital = (capitalData) => {
    const capital = {
      id: createId(),
      name: capitalData.name.trim(),
      initialCapital: Number(
        capitalData.initialCapital
      ),
      currentBalance: Number(
        capitalData.initialCapital
      ),
      riskMode: capitalData.riskMode,
      riskPercent: Number(
        capitalData.riskPercent
      ),
      riskAmount: Number(
        capitalData.riskAmount
      ),
      targetRR: Number(capitalData.targetRR),
      status: "active",
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };

    setCapitals((current) => [
      capital,
      ...current,
    ]);
  };

  const handleUpdateCapital = (
    capitalId,
    updates
  ) => {
    setCapitals((current) =>
      current.map((capital) => {
        if (capital.id !== capitalId) {
          return capital;
        }

        return {
          ...capital,
          ...updates,
          initialCapital:
            updates.initialCapital !== undefined
              ? Number(updates.initialCapital)
              : capital.initialCapital,
          currentBalance:
            updates.currentBalance !== undefined
              ? Number(updates.currentBalance)
              : capital.currentBalance,
          riskPercent:
            updates.riskPercent !== undefined
              ? Number(updates.riskPercent)
              : capital.riskPercent,
          riskAmount:
            updates.riskAmount !== undefined
              ? Number(updates.riskAmount)
              : capital.riskAmount,
          targetRR:
            updates.targetRR !== undefined
              ? Number(updates.targetRR)
              : capital.targetRR,
        };
      })
    );
  };

  const handleArchiveCapital = (capitalId) => {
    setCapitals((current) =>
      current.map((capital) =>
        capital.id === capitalId
          ? {
              ...capital,
              status: "archived",
              archivedAt:
                new Date().toISOString(),
            }
          : capital
      )
    );
  };

  const handleRestoreCapital = (capitalId) => {
    setCapitals((current) =>
      current.map((capital) =>
        capital.id === capitalId
          ? {
              ...capital,
              status: "active",
              archivedAt: null,
            }
          : capital
      )
    );
  };

  const handleDeleteCapital = (capitalId) => {
    const relatedTrades = trades.some(
      (trade) => trade.capitalId === capitalId
    );

    if (relatedTrades) {
      alert(
        "Impossible de supprimer ce capital car des trades lui sont liés. Archive-le plutôt."
      );

      return;
    }

    if (
      !window.confirm(
        "Supprimer définitivement ce capital ?"
      )
    ) {
      return;
    }

    setCapitals((current) =>
      current.filter(
        (capital) => capital.id !== capitalId
      )
    );
  };

  const handleCreateTrade = (tradeData) => {
    const capital = capitalMap[tradeData.capitalId];

    if (!capital) {
      alert("Sélectionne un capital.");
      return;
    }

    const entry = Number(tradeData.entry);
    const sl = Number(tradeData.sl);
    const rr = Number(tradeData.rr);

    if (
      !Number.isFinite(entry) ||
      !Number.isFinite(sl) ||
      entry <= 0 ||
      sl <= 0
    ) {
      alert(
        "Vérifie le prix d'entrée et le Stop Loss."
      );

      return;
    }

    const stopPips = calculateStopPips(
      tradeData.asset,
      tradeData.direction,
      entry,
      sl
    );

    if (stopPips <= 0) {
      alert(
        "Le Stop Loss doit être placé du bon côté de l'entrée."
      );

      return;
    }

    const riskAmount = getCapitalRisk(capital);

    const lot = calculateLot({
      riskAmount,
      asset: tradeData.asset,
      entry,
      sl,
      direction: tradeData.direction,
    });

    if (lot <= 0) {
      alert(
        "Impossible de calculer le lot. Vérifie le risque, l'entrée et le Stop Loss."
      );

      return;
    }

    const tp = calculateTP(
      tradeData.direction,
      entry,
      sl,
      rr
    );

    const isClosed =
      tradeData.exitType === "TP" ||
      tradeData.exitType === "SL" ||
      tradeData.exitType === "BE";

    let exitPrice = null;

    if (tradeData.exitType === "TP") {
      exitPrice = tp;
    }

    if (tradeData.exitType === "SL") {
      exitPrice = sl;
    }

    if (tradeData.exitType === "BE") {
      exitPrice = Number(tradeData.exitPrice);

      if (
        !Number.isFinite(exitPrice) ||
        exitPrice <= 0
      ) {
        alert(
          "Pour une sortie BE, indique le prix de sortie manuellement."
        );

        return;
      }
    }

    let resultPips = null;
    let resultMoney = null;
    let resultR = null;

    if (isClosed && exitPrice) {
      resultPips = calculateDirectionalPips(
        tradeData.asset,
        tradeData.direction,
        entry,
        exitPrice
      );

      const pipValuePerLot =
        getPipValuePerLot(
          tradeData.asset,
          entry
        );

      const grossResult =
        resultPips *
        pipValuePerLot *
        lot;

      const fees =
        Number(tradeData.fees) || 0;

      const swap =
        Number(tradeData.swap) || 0;

      resultMoney =
        grossResult - fees - swap;

      resultR =
        riskAmount > 0
          ? resultMoney / riskAmount
          : 0;
    }

    const trade = {
      id: createId(),
      capitalId: tradeData.capitalId,
      createdAt: new Date().toISOString(),
      date: tradeData.date || new Date().toISOString(),

      asset: tradeData.asset,
      direction: tradeData.direction,
      timeframe: tradeData.timeframe,
      session: tradeData.session,
      setup: tradeData.setup,

      entry,
      sl,
      rr,
      tp,

      lot,

      riskAmount,
      riskPercent:
        getCapitalRiskPercent(capital),

      stopPips,

      exitType:
        tradeData.exitType || "TP",

      exitPrice,

      resultPips,
      resultMoney,
      resultR,

      fees: Number(tradeData.fees) || 0,
      swap: Number(tradeData.swap) || 0,

      emotion: tradeData.emotion || "",
      planAdherence:
        tradeData.planAdherence || "",
      mistakes: tradeData.mistakes || "",
      entryReason:
        tradeData.entryReason || "",
      exitReason:
        tradeData.exitReason || "",
      notes: tradeData.notes || "",

      status: isClosed ? "closed" : "open",
    };

    setTrades((current) => [
      trade,
      ...current,
    ]);

    if (
      isClosed &&
      Number.isFinite(Number(resultMoney))
    ) {
      setCapitals((current) =>
        current.map((item) =>
          item.id === capital.id
            ? {
                ...item,
                currentBalance:
                  Number(item.currentBalance) +
                  Number(resultMoney),
              }
            : item
        )
      );
    }

    setActivePage("trades");
  };

  const handleDeleteTrade = (tradeId) => {
    const trade = trades.find(
      (item) => item.id === tradeId
    );

    if (!trade) {
      return;
    }

    if (
      !window.confirm(
        "Supprimer définitivement ce trade ?"
      )
    ) {
      return;
    }

    if (
      trade.status === "closed" &&
      Number.isFinite(Number(trade.resultMoney))
    ) {
      setCapitals((current) =>
        current.map((capital) =>
          capital.id === trade.capitalId
            ? {
                ...capital,
                currentBalance:
                  Number(capital.currentBalance) -
                  Number(trade.resultMoney),
              }
            : capital
        )
      );
    }

    setTrades((current) =>
      current.filter(
        (item) => item.id !== tradeId
      )
    );
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : "sidebar-closed"
        }`}
      >
        <div className="sidebar-header">
          {sidebarOpen && (
            <div className="brand">
              <div className="brand-icon">
                TJ
              </div>

              <div className="brand-text">
                <strong>
                  Trading Journal
                </strong>

                <span>
                  Professional
                </span>
              </div>
            </div>
          )}

          {!sidebarOpen && (
            <div className="brand-icon">
              TJ
            </div>
          )}
        </div>

        <nav className="sidebar-navigation">
          <div className="navigation-section-title">
            {sidebarOpen
              ? "MENU PRINCIPAL"
              : ""}
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`navigation-item ${
                  isActive
                    ? "navigation-item-active"
                    : ""
                }`}
                onClick={() =>
                  setActivePage(item.id)
                }
                title={
                  !sidebarOpen
                    ? item.label
                    : ""
                }
              >
                <Icon
                  size={20}
                  strokeWidth={1.8}
                />

                {sidebarOpen && (
                  <span>{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="navigation-item"
          >
            <Settings
              size={20}
              strokeWidth={1.8}
            />

            {sidebarOpen && (
              <span>Paramètres</span>
            )}
          </button>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() =>
              setSidebarOpen(
                (current) => !current
              )
            }
          >
            <ChevronDown
              size={18}
              className={
                sidebarOpen
                  ? "rotate-90"
                  : "rotate-minus-90"
              }
            />

            {sidebarOpen && (
              <span>Réduire</span>
            )}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">
              TRADING JOURNAL
            </p>

            <h1>
              {activeNavigation?.label ||
                "Dashboard"}
            </h1>
          </div>

          <div className="topbar-status">
            <span className="status-dot"></span>

            <span>
              Système opérationnel
            </span>
          </div>
        </header>

        <section className="page-content">
          {activePage === "dashboard" && (
            <Dashboard
              totalCurrentBalance={
                totalCurrentBalance
              }
              totalInitialCapital={
                totalInitialCapital
              }
              totalTradePnL={
                totalTradePnL
              }
              winRate={winRate}
              tradeCount={
                trades.length
              }
              activeCapitalCount={
                capitals.filter(
                  (capital) =>
                    capital.status ===
                    "active"
                ).length
              }
              archivedCapitalCount={
                capitals.filter(
                  (capital) =>
                    capital.status ===
                    "archived"
                ).length
              }
              recentTrades={trades.slice(
                0,
                5
              )}
              capitalMap={capitalMap}
            />
          )}

          {activePage === "trades" && (
            <TradesPage
              capitals={capitals}
              trades={trades}
              capitalMap={capitalMap}
              onCreateTrade={
                handleCreateTrade
              }
              onDeleteTrade={
                handleDeleteTrade
              }
            />
          )}

          {activePage === "capitals" && (
            <CapitalsPage
              capitals={capitals}
              onCreateCapital={
                handleCreateCapital
              }
              onUpdateCapital={
                handleUpdateCapital
              }
              onArchiveCapital={
                handleArchiveCapital
              }
              onRestoreCapital={
                handleRestoreCapital
              }
              onDeleteCapital={
                handleDeleteCapital
              }
            />
          )}

          {activePage === "calendar" && (
            <PlaceholderPage
              title="Calendrier"
              icon={CalendarDays}
              description="Le calendrier de trading sera développé dans la prochaine étape."
            />
          )}

          {activePage === "calculator" && (
            <PlaceholderPage
              title="Calculateur"
              icon={Calculator}
              description="Le calculateur de risque avancé sera développé dans la prochaine étape."
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Dashboard({
  totalCurrentBalance,
  totalInitialCapital,
  totalTradePnL,
  winRate,
  tradeCount,
  activeCapitalCount,
  archivedCapitalCount,
  recentTrades,
  capitalMap,
}) {
  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="section-label">
            VUE D'ENSEMBLE
          </span>

          <h2>
            Performance générale
          </h2>

          <p>
            Analyse de tous les capitaux
            actifs et archivés.
          </p>
        </div>

        <div className="capital-selector">
          <span>Portefeuille global</span>

          <div className="dashboard-selector">
            Tous les capitaux
            <ChevronDown size={16} />
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Capital total"
          value={formatMoney(
            totalCurrentBalance
          )}
          subtitle={`${activeCapitalCount} actif(s) • ${archivedCapitalCount} archivé(s)`}
        />

        <StatCard
          title="P&L"
          value={formatMoney(
            totalTradePnL
          )}
          subtitle={`Capital initial : ${formatMoney(
            totalInitialCapital
          )}`}
        />

        <StatCard
          title="Win Rate"
          value={`${formatNumber(
            winRate
          )}%`}
          subtitle="Trades clôturés"
        />

        <StatCard
          title="Trades"
          value={tradeCount}
          subtitle="Total enregistré"
        />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card large-card">
          <div className="card-header">
            <div>
              <span className="card-label">
                ÉQUITY
              </span>

              <h3>
                Courbe de performance
              </h3>
            </div>

            <button
              type="button"
              className="card-action"
            >
              Tout
              <ChevronDown size={15} />
            </button>
          </div>

          <div className="empty-chart">
            <BarChart3 size={42} />

            <strong>
              Courbe bientôt disponible
            </strong>

            <span>
              Les données de tes trades
              seront utilisées pour construire
              l'equity curve.
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-label">
                RÉSUMÉ
              </span>

              <h3>
                Statistiques
              </h3>
            </div>
          </div>

          <div className="statistics-list">
            <StatisticRow
              label="Trades"
              value={tradeCount}
            />

            <StatisticRow
              label="Win Rate"
              value={`${formatNumber(
                winRate
              )}%`}
            />

            <StatisticRow
              label="P&L"
              value={formatMoney(
                totalTradePnL
              )}
            />

            <StatisticRow
              label="Capitaux"
              value={
                activeCapitalCount +
                archivedCapitalCount
              }
            />

            <StatisticRow
              label="Capital"
              value={formatMoney(
                totalCurrentBalance
              )}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-card recent-trades-card">
        <div className="card-header">
          <div>
            <span className="card-label">
              JOURNAL
            </span>

            <h3>
              Trades récents
            </h3>
          </div>

          <span className="trade-count">
            {recentTrades.length} trade
            {recentTrades.length > 1
              ? "s"
              : ""}
          </span>
        </div>

        {recentTrades.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />

            <strong>
              Ton journal est encore vide
            </strong>

            <span>
              Tes trades apparaîtront ici une
              fois enregistrés.
            </span>
          </div>
        ) : (
          <div className="recent-trades-list">
            {recentTrades.map((trade) => (
              <TradeMiniRow
                key={trade.id}
                trade={trade}
                capitalMap={capitalMap}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function TradesPage({
  capitals,
  trades,
  capitalMap,
  onCreateTrade,
  onDeleteTrade,
}) {
  const [showForm, setShowForm] =
    useState(false);

  const [filterCapital, setFilterCapital] =
    useState("all");

  const filteredTrades = trades.filter(
    (trade) =>
      filterCapital === "all" ||
      trade.capitalId === filterCapital
  );

  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="section-label">
            JOURNAL
          </span>

          <h2>
            Journal des trades
          </h2>

          <p>
            Enregistre chaque trade avec son
            risque, son objectif RR et son
            résultat réel.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setShowForm(true)
          }
        >
          <Plus size={18} />
          Ajouter un trade
        </button>
      </section>

      {showForm && (
        <TradeForm
          capitals={capitals}
          onCancel={() =>
            setShowForm(false)
          }
          onSubmit={(data) => {
            onCreateTrade(data);
            setShowForm(false);
          }}
        />
      )}

      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <span className="card-label">
              HISTORIQUE
            </span>

            <h3>
              Tous les trades
            </h3>
          </div>

          <select
            className="select-control"
            value={filterCapital}
            onChange={(event) =>
              setFilterCapital(
                event.target.value
              )
            }
          >
            <option value="all">
              Tous les capitaux
            </option>

            {capitals.map((capital) => (
              <option
                key={capital.id}
                value={capital.id}
              >
                {capital.name}
              </option>
            ))}
          </select>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} />

            <strong>
              Aucun trade enregistré
            </strong>

            <span>
              Clique sur « Ajouter un trade »
              pour commencer ton journal.
            </span>
          </div>
        ) : (
          <div className="trade-table-wrapper">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Capital</th>
                  <th>Actif</th>
                  <th>Direction</th>
                  <th>Entrée</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>RR</th>
                  <th>Sortie</th>
                  <th>Lot</th>
                  <th>Résultat</th>
                  <th>R</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredTrades.map(
                  (trade) => (
                    <TradeTableRow
                      key={trade.id}
                      trade={trade}
                      capital={
                        capitalMap[
                          trade.capitalId
                        ]
                      }
                      onDelete={
                        onDeleteTrade
                      }
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function TradeForm({
  capitals,
  onCancel,
  onSubmit,
}) {
  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status === "active"
    );

  const [form, setForm] = useState({
    capitalId:
      activeCapitals[0]?.id || "",
    asset: "XAUUSD",
    direction: "BUY",
    timeframe: "M15",
    session: "New York",
    setup: "ZS OA",
    date: new Date()
      .toISOString()
      .slice(0, 16),
    entry: "",
    sl: "",
    rr:
      activeCapitals[0]?.targetRR || 2,
    exitType: "TP",
    exitPrice: "",
    fees: "0",
    swap: "0",
    emotion: "",
    planAdherence: "",
    mistakes: "",
    entryReason: "",
    exitReason: "",
    notes: "",
  });

  const selectedCapital =
    capitals.find(
      (capital) =>
        capital.id === form.capitalId
    );

  useEffect(() => {
    if (
      selectedCapital &&
      !form.rr
    ) {
      setForm((current) => ({
        ...current,
        rr:
          selectedCapital.targetRR ||
          2,
      }));
    }
  }, [selectedCapital]);

  const entry = Number(form.entry);
  const sl = Number(form.sl);
  const rr = Number(form.rr);

  const riskAmount =
    getCapitalRisk(selectedCapital);

  const stopPips = calculateStopPips(
    form.asset,
    form.direction,
    entry,
    sl
  );

  const lot = calculateLot({
    riskAmount,
    asset: form.asset,
    entry,
    sl,
    direction: form.direction,
  });

  const tp = calculateTP(
    form.direction,
    entry,
    sl,
    rr
  );

  let previewExit = null;

  if (form.exitType === "TP") {
    previewExit = tp;
  }

  if (form.exitType === "SL") {
    previewExit = sl;
  }

  if (form.exitType === "BE") {
    previewExit = Number(
      form.exitPrice
    );
  }

  let previewPips = null;
  let previewMoney = null;
  let previewR = null;

  if (
    Number.isFinite(previewExit) &&
    previewExit > 0 &&
    lot > 0
  ) {
    previewPips =
      calculateDirectionalPips(
        form.asset,
        form.direction,
        entry,
        previewExit
      );

    const pipValuePerLot =
      getPipValuePerLot(
        form.asset,
        entry
      );

    const gross =
      previewPips *
      pipValuePerLot *
      lot;

    previewMoney =
      gross -
      (Number(form.fees) || 0) -
      (Number(form.swap) || 0);

    previewR =
      riskAmount > 0
        ? previewMoney / riskAmount
        : 0;
  }

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCapitalChange = (
    capitalId
  ) => {
    const capital = capitals.find(
      (item) =>
        item.id === capitalId
    );

    setForm((current) => ({
      ...current,
      capitalId,
      rr:
        capital?.targetRR || 2,
    }));
  };

  return (
    <section className="dashboard-card trade-form-card">
      <div className="card-header">
        <div>
          <span className="card-label">
            NOUVEAU TRADE
          </span>

          <h3>
            Ajouter un trade
          </h3>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </div>

      {activeCapitals.length === 0 ? (
        <div className="warning-box">
          <strong>
            Aucun capital actif
          </strong>

          <span>
            Crée d'abord un capital actif
            avant d'ajouter un trade.
          </span>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();

            onSubmit(form);
          }}
        >
          <div className="form-section">
            <div className="form-section-title">
              <span>01</span>
              CONTEXTE DU TRADE
            </div>

            <div className="form-grid">
              <FormField label="Capital">
                <select
                  className="form-control"
                  value={form.capitalId}
                  onChange={(event) =>
                    handleCapitalChange(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Sélectionner
                  </option>

                  {activeCapitals.map(
                    (capital) => (
                      <option
                        key={capital.id}
                        value={capital.id}
                      >
                        {capital.name} — RR
                        {capital.targetRR}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="Actif">
                <select
                  className="form-control"
                  value={form.asset}
                  onChange={(event) =>
                    updateField(
                      "asset",
                      event.target.value
                    )
                  }
                >
                  {ASSETS.map(
                    (asset) => (
                      <option
                        key={asset}
                        value={asset}
                      >
                        {asset}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="Date / heure">
                <input
                  className="form-control"
                  type="datetime-local"
                  value={form.date}
                  onChange={(event) =>
                    updateField(
                      "date",
                      event.target.value
                    )
                  }
                  required
                />
              </FormField>

              <FormField label="Session">
                <select
                  className="form-control"
                  value={form.session}
                  onChange={(event) =>
                    updateField(
                      "session",
                      event.target.value
                    )
                  }
                >
                  {SESSIONS.map(
                    (session) => (
                      <option
                        key={session}
                        value={session}
                      >
                        {session}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="Direction">
                <select
                  className="form-control"
                  value={form.direction}
                  onChange={(event) =>
                    updateField(
                      "direction",
                      event.target.value
                    )
                  }
                >
                  <option value="BUY">
                    BUY
                  </option>

                  <option value="SELL">
                    SELL
                  </option>
                </select>
              </FormField>

              <FormField label="Timeframe">
                <select
                  className="form-control"
                  value={form.timeframe}
                  onChange={(event) =>
                    updateField(
                      "timeframe",
                      event.target.value
                    )
                  }
                >
                  {TIMEFRAMES.map(
                    (timeframe) => (
                      <option
                        key={timeframe}
                        value={timeframe}
                      >
                        {timeframe}
                      </option>
                    )
                  )}
                </select>
              </FormField>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span>02</span>
              PLAN DU TRADE
            </div>

            <div className="form-grid">
              <FormField label="Prix d'entrée">
                <input
                  className="form-control"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ex. 2000.00"
                  value={form.entry}
                  onChange={(event) =>
                    updateField(
                      "entry",
                      event.target.value
                    )
                  }
                  required
                />
              </FormField>

              <FormField label="Stop Loss">
                <input
                  className="form-control"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ex. 1998.00"
                  value={form.sl}
                  onChange={(event) =>
                    updateField(
                      "sl",
                      event.target.value
                    )
                  }
                  required
                />
              </FormField>

              <FormField label="Objectif RR">
                <select
                  className="form-control"
                  value={form.rr}
                  onChange={(event) =>
                    updateField(
                      "rr",
                      Number(
                        event.target.value
                      )
                    )
                  }
                >
                  {RR_OPTIONS.map(
                    (ratio) => (
                      <option
                        key={ratio}
                        value={ratio}
                      >
                        RR{ratio}
                      </option>
                    )
                  )}
                </select>

                {selectedCapital && (
                  <small className="field-help">
                    Objectif de base du capital :
                    {" "}
                    <strong>
                      RR
                      {
                        selectedCapital.targetRR
                      }
                    </strong>
                  </small>
                )}
              </FormField>

              <FormField label="TP calculé">
                <div className="calculated-field">
                  {tp > 0
                    ? formatNumber(
                        tp,
                        form.asset ===
                          "XAUUSD"
                          ? 2
                          : form.asset.endsWith(
                              "JPY"
                            )
                          ? 3
                          : 5
                      )
                    : "—"}
                </div>
              </FormField>

              <FormField label="Distance SL">
                <div className="calculated-field">
                  {stopPips > 0
                    ? `${formatNumber(
                        stopPips,
                        1
                      )} pips`
                    : "—"}
                </div>
              </FormField>

              <FormField label="Lot automatique">
                <div className="calculated-field calculated-field-highlight">
                  {lot > 0
                    ? formatNumber(
                        lot,
                        2
                      )
                    : "—"}
                </div>
              </FormField>
            </div>

            {selectedCapital && (
              <div className="risk-preview">
                <div>
                  <span>
                    Risque du capital
                  </span>

                  <strong>
                    {formatMoney(
                      riskAmount
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Risque %
                  </span>

                  <strong>
                    {formatNumber(
                      getCapitalRiskPercent(
                        selectedCapital
                      ),
                      2
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>
                    Objectif choisi
                  </span>

                  <strong>
                    RR{form.rr}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span>03</span>
              RÉSULTAT
            </div>

            <div className="form-grid">
              <FormField label="Type de sortie">
                <select
                  className="form-control"
                  value={form.exitType}
                  onChange={(event) =>
                    updateField(
                      "exitType",
                      event.target.value
                    )
                  }
                >
                  <option value="TP">
                    TP — Take Profit
                  </option>

                  <option value="SL">
                    SL — Stop Loss
                  </option>

                  <option value="BE">
                    BE — Break Even
                  </option>
                </select>
              </FormField>

              {form.exitType ===
                "BE" && (
                <FormField label="Prix de sortie BE">
                  <input
                    className="form-control"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Prix réel de sortie"
                    value={
                      form.exitPrice
                    }
                    onChange={(event) =>
                      updateField(
                        "exitPrice",
                        event.target
                          .value
                      )
                    }
                    required
                  />

                  <small className="field-help">
                    Pour le BE, tu entres
                    manuellement le prix
                    réel de sortie.
                  </small>
                </FormField>
              )}

              <FormField label="Frais / commission">
                <input
                  className="form-control"
                  type="number"
                  step="any"
                  min="0"
                  value={form.fees}
                  onChange={(event) =>
                    updateField(
                      "fees",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField label="Swap">
                <input
                  className="form-control"
                  type="number"
                  step="any"
                  value={form.swap}
                  onChange={(event) =>
                    updateField(
                      "swap",
                      event.target.value
                    )
                  }
                />
              </FormField>
            </div>

            <div className="result-preview">
              <div>
                <span>
                  Prix de sortie
                </span>

                <strong>
                  {previewExit > 0
                    ? formatNumber(
                        previewExit,
                        form.asset ===
                          "XAUUSD"
                          ? 2
                          : form.asset.endsWith(
                              "JPY"
                            )
                          ? 3
                          : 5
                      )
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Résultat
                </span>

                <strong
                  className={
                    previewMoney > 0
                      ? "positive-text"
                      : previewMoney < 0
                      ? "negative-text"
                      : ""
                  }
                >
                  {previewMoney !==
                  null
                    ? formatMoney(
                        previewMoney
                      )
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Pips
                </span>

                <strong>
                  {previewPips !==
                  null
                    ? `${formatNumber(
                        previewPips,
                        1
                      )} pips`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  R réalisé
                </span>

                <strong>
                  {previewR !==
                  null
                    ? `${previewR >= 0 ? "+" : ""}${formatNumber(
                        previewR,
                        2
                      )}R`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span>04</span>
              ANALYSE
            </div>

            <div className="form-grid">
              <FormField label="Setup">
                <select
                  className="form-control"
                  value={form.setup}
                  onChange={(event) =>
                    updateField(
                      "setup",
                      event.target.value
                    )
                  }
                >
                  {SETUPS.map(
                    (setup) => (
                      <option
                        key={setup}
                        value={setup}
                      >
                        {setup}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="Émotion">
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex. calme, FOMO..."
                  value={form.emotion}
                  onChange={(event) =>
                    updateField(
                      "emotion",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField label="Respect du plan">
                <select
                  className="form-control"
                  value={
                    form.planAdherence
                  }
                  onChange={(event) =>
                    updateField(
                      "planAdherence",
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Sélectionner
                  </option>

                  <option value="Oui">
                    Oui
                  </option>

                  <option value="Partiellement">
                    Partiellement
                  </option>

                  <option value="Non">
                    Non
                  </option>
                </select>
              </FormField>

              <FormField label="Erreurs">
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex. entrée tardive..."
                  value={form.mistakes}
                  onChange={(event) =>
                    updateField(
                      "mistakes",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField
                label="Raison d'entrée"
                fullWidth
              >
                <textarea
                  className="form-control textarea-control"
                  placeholder="Pourquoi as-tu pris ce trade ?"
                  value={
                    form.entryReason
                  }
                  onChange={(event) =>
                    updateField(
                      "entryReason",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField
                label="Raison de sortie"
                fullWidth
              >
                <textarea
                  className="form-control textarea-control"
                  placeholder="Pourquoi es-tu sorti ?"
                  value={
                    form.exitReason
                  }
                  onChange={(event) =>
                    updateField(
                      "exitReason",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField
                label="Notes"
                fullWidth
              >
                <textarea
                  className="form-control textarea-control"
                  placeholder="Notes supplémentaires..."
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                />
              </FormField>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="primary-button"
            >
              <Check size={18} />
              Enregistrer le trade
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function TradeTableRow({
  trade,
  capital,
  onDelete,
}) {
  const result =
    Number(trade.resultMoney) || 0;

  return (
    <tr>
      <td>
        {formatDate(trade.date)}
      </td>

      <td>
        <strong>
          {capital?.name || "—"}
        </strong>
      </td>

      <td>
        <strong>
          {trade.asset}
        </strong>
      </td>

      <td>
        <span
          className={`direction-badge ${
            trade.direction === "BUY"
              ? "buy-badge"
              : "sell-badge"
          }`}
        >
          {trade.direction}
        </span>
      </td>

      <td>
        {formatNumber(
          trade.entry,
          trade.asset ===
            "XAUUSD"
            ? 2
            : trade.asset.endsWith(
                "JPY"
              )
            ? 3
            : 5
        )}
      </td>

      <td>
        {formatNumber(
          trade.sl,
          trade.asset ===
            "XAUUSD"
            ? 2
            : trade.asset.endsWith(
                "JPY"
              )
            ? 3
            : 5
        )}
      </td>

      <td>
        {formatNumber(
          trade.tp,
          trade.asset ===
            "XAUUSD"
            ? 2
            : trade.asset.endsWith(
                "JPY"
              )
            ? 3
            : 5
        )}
      </td>

      <td>
        <strong>
          RR{trade.rr}
        </strong>
      </td>

      <td>
        <div>
          <strong>
            {trade.exitType}
          </strong>

          <small className="table-secondary">
            {trade.exitPrice
              ? formatNumber(
                  trade.exitPrice,
                  trade.asset ===
                    "XAUUSD"
                    ? 2
                    : trade.asset.endsWith(
                        "JPY"
                      )
                    ? 3
                    : 5
                )
              : "—"}
          </small>
        </div>
      </td>

      <td>
        {formatNumber(
          trade.lot,
          2
        )}
      </td>

      <td
        className={
          result > 0
            ? "positive-text"
            : result < 0
            ? "negative-text"
            : ""
        }
      >
        {formatMoney(result)}
      </td>

      <td>
        {trade.resultR !==
        null
          ? `${
              Number(trade.resultR) >=
              0
                ? "+"
                : ""
            }${formatNumber(
              trade.resultR,
              2
            )}R`
          : "—"}
      </td>

      <td>
        <button
          type="button"
          className="table-delete-button"
          onClick={() =>
            onDelete(trade.id)
          }
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

function TradeMiniRow({
  trade,
  capitalMap,
}) {
  const result =
    Number(trade.resultMoney) || 0;

  return (
    <div className="trade-mini-row">
      <div>
        <strong>
          {trade.asset}
        </strong>

        <span>
          {capitalMap[
            trade.capitalId
          ]?.name || "—"}
        </span>
      </div>

      <div>
        <span>
          {trade.direction} • RR
          {trade.rr}
        </span>

        <span>
          {trade.exitType}
        </span>
      </div>

      <strong
        className={
          result > 0
            ? "positive-text"
            : result < 0
            ? "negative-text"
            : ""
        }
      >
        {formatMoney(result)}
      </strong>
    </div>
  );
}

function CapitalsPage({
  capitals,
  onCreateCapital,
  onUpdateCapital,
  onArchiveCapital,
  onRestoreCapital,
  onDeleteCapital,
}) {
  const [showForm, setShowForm] =
    useState(false);

  const [editingCapitalId, setEditingCapitalId] =
    useState(null);

  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status === "active"
    );

  const archivedCapitals =
    capitals.filter(
      (capital) =>
        capital.status === "archived"
    );

  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="section-label">
            GESTION
          </span>

          <h2>
            Capitaux
          </h2>

          <p>
            Gère tes comptes, ton risque et
            ton objectif RR de référence.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setShowForm(true)
          }
        >
          <Plus size={18} />
          Nouveau capital
        </button>
      </section>

      {showForm && (
        <CapitalForm
          onCancel={() =>
            setShowForm(false)
          }
          onSubmit={(data) => {
            onCreateCapital(data);
            setShowForm(false);
          }}
        />
      )}

      {activeCapitals.length > 0 && (
        <section className="capital-section">
          <div className="module-heading">
            <div>
              <span className="section-label">
                ACTIFS
              </span>

              <h3>
                Capitaux actifs
              </h3>
            </div>

            <span className="trade-count">
              {activeCapitals.length}
            </span>
          </div>

          <div className="capital-grid">
            {activeCapitals.map(
              (capital) => (
                <CapitalCard
                  key={capital.id}
                  capital={capital}
                  editing={
                    editingCapitalId ===
                    capital.id
                  }
                  onEdit={() =>
                    setEditingCapitalId(
                      capital.id
                    )
                  }
                  onCancelEdit={() =>
                    setEditingCapitalId(
                      null
                    )
                  }
                  onUpdate={
                    onUpdateCapital
                  }
                  onArchive={
                    onArchiveCapital
                  }
                  onDelete={
                    onDeleteCapital
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {archivedCapitals.length > 0 && (
        <section className="capital-section">
          <div className="module-heading">
            <div>
              <span className="section-label">
                ARCHIVES
              </span>

              <h3>
                Capitaux archivés
              </h3>
            </div>

            <span className="trade-count">
              {archivedCapitals.length}
            </span>
          </div>

          <div className="capital-grid">
            {archivedCapitals.map(
              (capital) => (
                <CapitalCard
                  key={capital.id}
                  capital={capital}
                  editing={false}
                  onEdit={() => {}}
                  onCancelEdit={() => {}}
                  onUpdate={
                    onUpdateCapital
                  }
                  onArchive={
                    onArchiveCapital
                  }
                  onRestore={
                    onRestoreCapital
                  }
                  onDelete={
                    onDeleteCapital
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {capitals.length === 0 && (
        <section className="dashboard-card">
          <div className="empty-state">
            <WalletCards size={42} />

            <strong>
              Aucun capital
            </strong>

            <span>
              Crée ton premier capital pour
              commencer ton journal.
            </span>
          </div>
        </section>
      )}
    </>
  );
}

function CapitalForm({
  onCancel,
  onSubmit,
}) {
  const [form, setForm] =
    useState({
      name: "",
      initialCapital: "",
      riskMode: "percentage",
      riskPercent: "1",
      riskAmount: "",
      targetRR: 2,
    });

  const balance =
    Number(form.initialCapital) || 0;

  const calculatedRiskAmount =
    form.riskMode === "percentage"
      ? (balance *
          (Number(
            form.riskPercent
          ) || 0)) /
        100
      : Number(form.riskAmount) || 0;

  const calculatedRiskPercent =
    form.riskMode === "fixed"
      ? balance > 0
        ? ((Number(
            form.riskAmount
          ) || 0) /
            balance) *
          100
        : 0
      : Number(form.riskPercent) || 0;

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <section className="dashboard-card capital-form-card">
      <div className="card-header">
        <div>
          <span className="card-label">
            NOUVEAU CAPITAL
          </span>

          <h3>
            Configurer un capital
          </h3>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (
            !form.name.trim() ||
            balance <= 0
          ) {
            alert(
              "Indique un nom et un capital initial valide."
            );

            return;
          }

          if (
            calculatedRiskAmount <= 0
          ) {
            alert(
              "Le risque par trade doit être supérieur à 0."
            );

            return;
          }

          onSubmit(form);
        }}
      >
        <div className="form-grid">
          <FormField label="Nom du capital">
            <input
              className="form-control"
              type="text"
              placeholder="Ex. Compte principal"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              required
            />
          </FormField>

          <FormField label="Capital initial">
            <input
              className="form-control"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex. 1000"
              value={
                form.initialCapital
              }
              onChange={(event) =>
                updateField(
                  "initialCapital",
                  event.target.value
                )
              }
              required
            />
          </FormField>

          <FormField label="Mode de risque">
            <select
              className="form-control"
              value={form.riskMode}
              onChange={(event) =>
                updateField(
                  "riskMode",
                  event.target.value
                )
              }
            >
              <option value="percentage">
                Pourcentage du capital
              </option>

              <option value="fixed">
                Montant fixe
              </option>
            </select>
          </FormField>

          {form.riskMode ===
          "percentage" ? (
            <FormField label="Risque % par trade">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.riskPercent
                }
                onChange={(event) =>
                  updateField(
                    "riskPercent",
                    event.target.value
                  )
                }
              />
            </FormField>
          ) : (
            <FormField label="Risque $ par trade">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex. 10"
                value={
                  form.riskAmount
                }
                onChange={(event) =>
                  updateField(
                    "riskAmount",
                    event.target.value
                  )
                }
              />
            </FormField>
          )}

          <FormField label="Objectif RR de base">
            <select
              className="form-control"
              value={form.targetRR}
              onChange={(event) =>
                updateField(
                  "targetRR",
                  Number(
                    event.target.value
                  )
                )
              }
            >
              {RR_OPTIONS.map(
                (ratio) => (
                  <option
                    key={ratio}
                    value={ratio}
                  >
                    RR{ratio}
                  </option>
                )
              )}
            </select>

            <small className="field-help">
              Cet objectif sera proposé par
              défaut lors de chaque nouveau
              trade.
            </small>
          </FormField>
        </div>

        <div className="risk-preview">
          <div>
            <span>
              Risque monétaire
            </span>

            <strong>
              {formatMoney(
                calculatedRiskAmount
              )}
            </strong>
          </div>

          <div>
            <span>
              Risque en %
            </span>

            <strong>
              {formatNumber(
                calculatedRiskPercent,
                2
              )}
              %
            </strong>
          </div>

          <div>
            <span>
              Objectif par défaut
            </span>

            <strong>
              RR{form.targetRR}
            </strong>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="primary-button"
          >
            <Check size={18} />
            Créer le capital
          </button>
        </div>
      </form>
    </section>
  );
}

function CapitalCard({
  capital,
  editing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
}) {
  const [form, setForm] =
    useState({
      name: capital.name,
      initialCapital:
        capital.initialCapital,
      currentBalance:
        capital.currentBalance,
      riskMode:
        capital.riskMode,
      riskPercent:
        capital.riskPercent,
      riskAmount:
        capital.riskAmount,
      targetRR:
        capital.targetRR || 2,
    });

  useEffect(() => {
    setForm({
      name: capital.name,
      initialCapital:
        capital.initialCapital,
      currentBalance:
        capital.currentBalance,
      riskMode:
        capital.riskMode,
      riskPercent:
        capital.riskPercent,
      riskAmount:
        capital.riskAmount,
      targetRR:
        capital.targetRR || 2,
    });
  }, [capital]);

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveChanges = () => {
    if (!form.name.trim()) {
      return;
    }

    onUpdate(
      capital.id,
      {
        name: form.name,
        initialCapital:
          Number(
            form.initialCapital
          ),
        currentBalance:
          Number(
            form.currentBalance
          ),
        riskMode:
          form.riskMode,
        riskPercent:
          Number(
            form.riskPercent
          ),
        riskAmount:
          Number(
            form.riskAmount
          ),
        targetRR:
          Number(form.targetRR),
      }
    );

    onCancelEdit();
  };

  const riskAmount =
    getCapitalRisk({
      ...capital,
      ...form,
      currentBalance:
        Number(
          form.currentBalance
        ),
      riskPercent:
        Number(
          form.riskPercent
        ),
      riskAmount:
        Number(
          form.riskAmount
        ),
    });

  const riskPercent =
    getCapitalRiskPercent({
      ...capital,
      ...form,
      currentBalance:
        Number(
          form.currentBalance
        ),
      riskPercent:
        Number(
          form.riskPercent
        ),
      riskAmount:
        Number(
          form.riskAmount
        ),
    });

  if (editing) {
    return (
      <article className="capital-card capital-card-editing">
        <div className="capital-card-header">
          <div>
            <span className="card-label">
              MODIFICATION
            </span>

            <h3>
              {capital.name}
            </h3>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onCancelEdit}
          >
            <X size={18} />
          </button>
        </div>

        <div className="form-grid compact-grid">
          <FormField label="Nom">
            <input
              className="form-control"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
            />
          </FormField>

          <FormField label="Capital initial">
            <input
              className="form-control"
              type="number"
              step="0.01"
              value={
                form.initialCapital
              }
              onChange={(event) =>
                updateField(
                  "initialCapital",
                  event.target.value
                )
              }
            />
          </FormField>

          <FormField label="Solde actuel">
            <input
              className="form-control"
              type="number"
              step="0.01"
              value={
                form.currentBalance
              }
              onChange={(event) =>
                updateField(
                  "currentBalance",
                  event.target.value
                )
              }
            />
          </FormField>

          <FormField label="Mode de risque">
            <select
              className="form-control"
              value={form.riskMode}
              onChange={(event) =>
                updateField(
                  "riskMode",
                  event.target.value
                )
              }
            >
              <option value="percentage">
                Pourcentage
              </option>

              <option value="fixed">
                Fixe
              </option>
            </select>
          </FormField>

          {form.riskMode ===
          "percentage" ? (
            <FormField label="Risque %">
              <input
                className="form-control"
                type="number"
                step="0.01"
                value={
                  form.riskPercent
                }
                onChange={(event) =>
                  updateField(
                    "riskPercent",
                    event.target.value
                  )
                }
              />
            </FormField>
          ) : (
            <FormField label="Risque $">
              <input
                className="form-control"
                type="number"
                step="0.01"
                value={
                  form.riskAmount
                }
                onChange={(event) =>
                  updateField(
                    "riskAmount",
                    event.target.value
                  )
                }
              />
            </FormField>
          )}

          <FormField label="RR objectif">
            <select
              className="form-control"
              value={form.targetRR}
              onChange={(event) =>
                updateField(
                  "targetRR",
                  Number(
                    event.target.value
                  )
                )
              }
            >
              {RR_OPTIONS.map(
                (ratio) => (
                  <option
                    key={ratio}
                    value={ratio}
                  >
                    RR{ratio}
                  </option>
                )
              )}
            </select>
          </FormField>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancelEdit}
          >
            Annuler
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={saveChanges}
          >
            <Check size={18} />
            Enregistrer
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`capital-card ${
        capital.status ===
        "archived"
          ? "capital-card-archived"
          : ""
      }`}
    >
      <div className="capital-card-header">
        <div>
          <span className="card-label">
            {capital.status ===
            "active"
              ? "ACTIF"
              : "ARCHIVÉ"}
          </span>

          <h3>
            {capital.name}
          </h3>
        </div>

        <CircleDollarSign
          size={28}
        />
      </div>

      <div className="capital-balance">
        <span>
          Solde actuel
        </span>

        <strong>
          {formatMoney(
            capital.currentBalance
          )}
        </strong>
      </div>

      <div className="capital-details">
        <div>
          <span>
            Capital initial
          </span>

          <strong>
            {formatMoney(
              capital.initialCapital
            )}
          </strong>
        </div>

        <div>
          <span>
            Risque / trade
          </span>

          <strong>
            {formatMoney(
              riskAmount
            )}
          </strong>
        </div>

        <div>
          <span>
            Risque %
          </span>

          <strong>
            {formatNumber(
              riskPercent,
              2
            )}
            %
          </strong>
        </div>

        <div>
          <span>
            RR objectif
          </span>

          <strong>
            RR{capital.targetRR ||
              2}
          </strong>
        </div>
      </div>

      <div className="capital-actions">
        {capital.status ===
          "active" && (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={onEdit}
            >
              <Pencil size={16} />
              Modifier
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                onArchive(
                  capital.id
                )
              }
            >
              <Archive size={16} />
              Archiver
            </button>
          </>
        )}

        {capital.status ===
          "archived" && (
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onRestore(
                capital.id
              )
            }
          >
            <RotateCcw
              size={16}
            />
            Restaurer
          </button>
        )}

        <button
          type="button"
          className="danger-button"
          onClick={() =>
            onDelete(
              capital.id
            )
          }
        >
          <Trash2 size={16} />
          Supprimer
        </button>
      </div>
    </article>
  );
}

function FormField({
  label,
  children,
  fullWidth = false,
}) {
  return (
    <label
      className={`form-field ${
        fullWidth
          ? "form-field-full"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      {children}
    </label>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}) {
  return (
    <article className="stat-card">
      <span className="stat-title">
        {title}
      </span>

      <strong className="stat-value">
        {value}
      </strong>

      <span className="stat-subtitle">
        {subtitle}
      </span>
    </article>
  );
}

function StatisticRow({
  label,
  value,
}) {
  return (
    <div className="statistic-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function PlaceholderPage({
  title,
  icon: Icon,
  description,
}) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <Icon size={34} />
      </div>

      <span className="section-label">
        MODULE
      </span>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>
    </section>
  );
}

export default App;
