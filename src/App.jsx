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
  Menu,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =========================================================
   CONSTANTES
========================================================= */

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

const RR_OPTIONS = Array.from(
  { length: 10 },
  (_, index) => index + 1
);

/* =========================================================
   HELPERS
========================================================= */

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function formatMoney(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatNumber(value, decimals = 2) {
  return (Number(value) || 0).toFixed(decimals);
}

function formatPercent(value, decimals = 2) {
  return `${(Number(value) || 0).toFixed(decimals)}%`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getTradeTimestamp(trade) {
  const value =
    trade?.dateTime ||
    trade?.date ||
    trade?.createdAt;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getPipMultiplier(asset) {
  if (asset === "XAUUSD") {
    return 100;
  }

  if (asset === "USDJPY") {
    return 100;
  }

  return 10000;
}

function getPipValuePerLot(asset, price) {
  const currentPrice = Number(price);

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return 0;
  }

  if (asset === "XAUUSD") {
    return 1;
  }

  if (
    ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD"].includes(
      asset
    )
  ) {
    return 10;
  }

  if (asset === "USDJPY") {
    return 1000 / currentPrice;
  }

  if (asset === "USDCAD") {
    return 10 / currentPrice;
  }

  if (asset === "USDCHF") {
    return 10 / currentPrice;
  }

  return 10;
}

function calculatePips(asset, priceDifference) {
  return (
    Math.abs(Number(priceDifference) || 0) *
    getPipMultiplier(asset)
  );
}

function calculateDirectionalPips(
  asset,
  direction,
  entry,
  exit
) {
  const difference =
    direction === "BUY"
      ? Number(exit) - Number(entry)
      : Number(entry) - Number(exit);

  return (
    difference * getPipMultiplier(asset)
  );
}

function calculateStopPips(
  asset,
  entry,
  stopLoss
) {
  return calculatePips(
    asset,
    Number(entry) - Number(stopLoss)
  );
}

function calculateTP(
  direction,
  entry,
  stopLoss,
  rr
) {
  const e = Number(entry);
  const sl = Number(stopLoss);
  const riskDistance = Math.abs(e - sl);
  const ratio = Number(rr) || 1;

  if (
    !Number.isFinite(e) ||
    !Number.isFinite(sl) ||
    riskDistance <= 0
  ) {
    return 0;
  }

  if (direction === "BUY") {
    return e + riskDistance * ratio;
  }

  return e - riskDistance * ratio;
}

function calculateLot(
  riskMoney,
  stopPips,
  pipValuePerLot
) {
  const risk = Number(riskMoney) || 0;
  const pips = Number(stopPips) || 0;
  const pipValue = Number(pipValuePerLot) || 0;

  if (
    risk <= 0 ||
    pips <= 0 ||
    pipValue <= 0
  ) {
    return 0;
  }

  const rawLot =
    risk / (pips * pipValue);

  return Math.floor(rawLot * 100) / 100;
}

function getCapitalRisk(capital) {
  if (!capital) return 0;

  if (capital.riskMode === "fixed") {
    return Number(capital.riskAmount) || 0;
  }

  const balance =
    Number(capital.currentBalance) ||
    Number(capital.initialCapital) ||
    0;

  const percentage =
    Number(capital.riskPercent) || 0;

  return (
    balance *
    (percentage / 100)
  );
}

function getCapitalRiskPercent(capital) {
  if (!capital) return 0;

  if (capital.riskMode === "percentage") {
    return Number(capital.riskPercent) || 0;
  }

  const balance =
    Number(capital.currentBalance) ||
    Number(capital.initialCapital) ||
    0;

  const riskAmount =
    Number(capital.riskAmount) || 0;

  if (balance <= 0) {
    return 0;
  }

  return (
    (riskAmount / balance) *
    100
  );
}

function getResultColor(value) {
  if (value > 0) return "#22c55e";
  if (value < 0) return "#ef4444";
  return "#94a3b8";
}

function getResultClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function isClosedTrade(trade) {
  return (
    trade &&
    String(trade.status || "closed")
      .toLowerCase() === "closed"
  );
}

/*
  Cette fonction corrige également les anciens trades
  dont pnl était éventuellement enregistré à 0 alors
  que resultR / riskMoney étaient corrects.
*/
function getTradeNetPnl(trade) {
  const storedPnl = Number(trade?.pnl);
  const resultR = Number(trade?.resultR);
  const riskMoney = Number(trade?.riskMoney);
  const grossPnl = Number(trade?.grossPnl);
  const fees = Number(trade?.fees) || 0;
  const swap = Number(trade?.swap) || 0;

  if (
    Number.isFinite(storedPnl) &&
    storedPnl !== 0
  ) {
    return storedPnl;
  }

  if (
    Number.isFinite(resultR) &&
    Number.isFinite(riskMoney) &&
    resultR !== 0 &&
    riskMoney > 0
  ) {
    return resultR * riskMoney;
  }

  if (Number.isFinite(grossPnl)) {
    return grossPnl - fees + swap;
  }

  return Number.isFinite(storedPnl)
    ? storedPnl
    : 0;
}

function getTradeR(trade) {
  const value = Number(trade?.resultR);

  if (Number.isFinite(value)) {
    return value;
  }

  const pnl = getTradeNetPnl(trade);
  const risk = Number(trade?.riskMoney) || 0;

  if (risk > 0) {
    return pnl / risk;
  }

  return 0;
}

function getTradeDate(trade) {
  const timestamp =
    getTradeTimestamp(trade);

  return timestamp
    ? new Date(timestamp)
    : null;
}

function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) return false;

  return (
    dateA.getFullYear() ===
      dateB.getFullYear() &&
    dateA.getMonth() ===
      dateB.getMonth() &&
    dateA.getDate() ===
      dateB.getDate()
  );
}

function getStartOfWeek(date) {
  const result = new Date(date);

  const day = result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + diff
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function isSameWeek(date, reference) {
  if (!date || !reference) {
    return false;
  }

  const start =
    getStartOfWeek(reference);

  const end = new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  return (
    date >= start &&
    date < end
  );
}

function isSameMonth(date, reference) {
  if (!date || !reference) {
    return false;
  }

  return (
    date.getFullYear() ===
      reference.getFullYear() &&
    date.getMonth() ===
      reference.getMonth()
  );
}

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

/* =========================================================
   PERFORMANCE ENGINE
========================================================= */

function calculatePerformanceStats(
  trades,
  initialCapital = 0
) {
  const list = Array.isArray(trades)
    ? trades.filter(isClosedTrade)
    : [];

  const chronologicalTrades = [
    ...list,
  ].sort(
    (a, b) =>
      getTradeTimestamp(a) -
      getTradeTimestamp(b)
  );

  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  let grossProfit = 0;
  let grossLoss = 0;

  let sumWin = 0;
  let sumLoss = 0;
  let sumR = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let bestWinStreak = 0;
  let bestLossStreak = 0;

  let equity =
    Number(initialCapital) || 0;

  let peakEquity = equity;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurve = [];

  const now = new Date();

  let pnlToday = 0;
  let pnlWeek = 0;
  let pnlMonth = 0;

  chronologicalTrades.forEach(
    (trade) => {
      const pnl =
        getTradeNetPnl(trade);

      const resultR =
        getTradeR(trade);

      const tradeDate =
        getTradeDate(trade);

      if (pnl > 0) {
        wins += 1;
        grossProfit += pnl;
        sumWin += pnl;

        currentWinStreak += 1;
        currentLossStreak = 0;

        bestWinStreak = Math.max(
          bestWinStreak,
          currentWinStreak
        );
      } else if (pnl < 0) {
        losses += 1;
        grossLoss += Math.abs(pnl);
        sumLoss += pnl;

        currentLossStreak += 1;
        currentWinStreak = 0;

        bestLossStreak = Math.max(
          bestLossStreak,
          currentLossStreak
        );
      } else {
        breakeven += 1;
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      sumR += resultR;

      equity += pnl;

      peakEquity = Math.max(
        peakEquity,
        equity
      );

      const drawdown =
        peakEquity - equity;

      const drawdownPercent =
        peakEquity > 0
          ? (drawdown / peakEquity) *
            100
          : 0;

      maxDrawdown = Math.max(
        maxDrawdown,
        drawdown
      );

      maxDrawdownPercent =
        Math.max(
          maxDrawdownPercent,
          drawdownPercent
        );

      equityCurve.push({
        date:
          tradeDate
            ? tradeDate.toLocaleDateString(
                "fr-FR"
              )
            : "-",
        timestamp:
          getTradeTimestamp(trade),
        equity,
        pnl,
      });

      if (tradeDate) {
        if (
          isSameDay(
            tradeDate,
            now
          )
        ) {
          pnlToday += pnl;
        }

        if (
          isSameWeek(
            tradeDate,
            now
          )
        ) {
          pnlWeek += pnl;
        }

        if (
          isSameMonth(
            tradeDate,
            now
          )
        ) {
          pnlMonth += pnl;
        }
      }
    }
  );

  const totalPnl =
    list.reduce(
      (sum, trade) =>
        sum + getTradeNetPnl(trade),
      0
    );

  const tradeCount = list.length;

  const winRate =
    tradeCount > 0
      ? (wins / tradeCount) * 100
      : 0;

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
      ? Infinity
      : 0;

  const avgWin =
    wins > 0
      ? sumWin / wins
      : 0;

  const avgLoss =
    losses > 0
      ? sumLoss / losses
      : 0;

  const avgR =
    tradeCount > 0
      ? sumR / tradeCount
      : 0;

  const startCapital =
    Number(initialCapital) || 0;

  const pnlPercent =
    startCapital > 0
      ? (totalPnl / startCapital) *
        100
      : 0;

  const expectancy =
    avgR;

  return {
    trades: tradeCount,
    wins,
    losses,
    breakeven,
    grossProfit,
    grossLoss,
    totalPnl,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgR,
    expectancy,
    pnlPercent,
    pnlToday,
    pnlWeek,
    pnlMonth,
    maxDrawdown,
    maxDrawdownPercent,
    bestWinStreak,
    bestLossStreak,
    equityCurve,
  };
}

function buildGroupedStats(
  trades,
  field
) {
  const groups = {};

  trades
    .filter(isClosedTrade)
    .forEach((trade) => {
      const key =
        trade?.[field] ||
        "Non renseigné";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(trade);
    });

  return Object.entries(groups)
    .map(([name, list]) => {
      const stats =
        calculatePerformanceStats(
          list,
          0
        );

      return {
        name,
        ...stats,
      };
    })
    .sort(
      (a, b) =>
        b.totalPnl -
        a.totalPnl
    );
}

function buildRRStats(trades) {
  return RR_OPTIONS.map(
    (rr) => {
      const list = trades.filter(
        (trade) =>
          isClosedTrade(trade) &&
          Number(trade.rr) === rr
      );

      const stats =
        calculatePerformanceStats(
          list,
          0
        );

      return {
        rr,
        ...stats,
      };
    }
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  app: {
    minHeight: "100vh",
    background: "#020617",
    color: "#e2e8f0",
    display: "flex",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    width: "250px",
    background: "#0f172a",
    borderRight:
      "1px solid #1e293b",
    padding: "20px 14px",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "30px",
    padding: "0 8px",
  },

  logoIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },

  logoTitle: {
    fontSize: "17px",
    fontWeight: 800,
    color: "#f8fafc",
  },

  logoSubtitle: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  navButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    padding: "11px 12px",
    borderRadius: "9px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 600,
  },

  navButtonActive: {
    background: "#1e3a8a",
    color: "#dbeafe",
  },

  main: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },

  topbar: {
    height: "64px",
    borderBottom:
      "1px solid #1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 22px",
    background: "#020617",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  topbarTitle: {
    fontSize: "15px",
    fontWeight: 700,
  },

  topbarStatus: {
    fontSize: "12px",
    color: "#64748b",
  },

  content: {
    padding: "24px",
    maxWidth: "1800px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  pageTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  pageTitleText: {
    fontSize: "25px",
    fontWeight: 800,
    margin: 0,
  },

  pageSubtitle: {
    color: "#64748b",
    fontSize: "13px",
    marginTop: "5px",
  },

  card: {
    background: "#0f172a",
    border:
      "1px solid #1e293b",
    borderRadius: "14px",
    padding: "18px",
    boxSizing: "border-box",
  },

  metricCard: {
    background: "#0f172a",
    border:
      "1px solid #1e293b",
    borderRadius: "13px",
    padding: "17px",
    minWidth: 0,
  },

  metricLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  metricValue: {
    fontSize: "22px",
    fontWeight: 800,
    marginTop: "7px",
  },

  grid4: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "13px",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "13px",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "13px",
  },

  section: {
    marginTop: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    fontSize: "16px",
    fontWeight: 800,
    margin: 0,
  },

  sectionSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "4px",
  },

  button: {
    border: "1px solid #334155",
    background: "#111827",
    color: "#cbd5e1",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: 700,
  },

  primaryButton: {
    background: "#2563eb",
    border:
      "1px solid #2563eb",
    color: "white",
  },

  dangerButton: {
    background: "#450a0a",
    border:
      "1px solid #7f1d1d",
    color: "#fecaca",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#020617",
    color: "#e2e8f0",
    border:
      "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 11px",
    outline: "none",
    fontSize: "13px",
  },

  label: {
    display: "block",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 700,
    marginBottom: "6px",
  },

  formGrid2: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "13px",
  },

  formGrid3: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "13px",
  },

  tableWrapper: {
    overflowX: "auto",
    border:
      "1px solid #1e293b",
    borderRadius: "10px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },

  th: {
    padding: "10px 12px",
    textAlign: "left",
    color: "#64748b",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom:
      "1px solid #1e293b",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "10px 12px",
    borderBottom:
      "1px solid #172033",
    fontSize: "12px",
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#172033",
    color: "#cbd5e1",
    fontSize: "10px",
    fontWeight: 700,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(2, 6, 23, 0.78)",
    backdropFilter: "blur(5px)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "min(850px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#0f172a",
    border:
      "1px solid #334155",
    borderRadius: "15px",
    padding: "20px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },

  modalTitle: {
    fontSize: "18px",
    fontWeight: 800,
    margin: 0,
  },

  closeButton: {
    width: "32px",
    height: "32px",
    border: "none",
    background: "#172033",
    color: "#94a3b8",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  notification: {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: 200,
    padding: "12px 16px",
    borderRadius: "10px",
    background: "#0f172a",
    border:
      "1px solid #334155",
    boxShadow:
      "0 15px 40px rgba(0,0,0,.35)",
    fontSize: "13px",
    fontWeight: 700,
  },
};

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [capitals, setCapitals] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            CAPITALS_STORAGE_KEY
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  const [trades, setTrades] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            TRADES_STORAGE_KEY
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  /*
    IMPORTANT :
    "" = Tous les capitaux
    id = capital individuel
  */
  const [dashboardCapitalFilter, setDashboardCapitalFilter] =
    useState("");

  const [capitalModalOpen, setCapitalModalOpen] =
    useState(false);

  const [editingCapitalId, setEditingCapitalId] =
    useState(null);

  const [capitalForm, setCapitalForm] =
    useState({
      name: "",
      initialCapital: "",
      currentBalance: "",
      riskMode: "percentage",
      riskPercent: "1",
      riskAmount: "",
      defaultRR: "2",
    });

  const [tradeModalOpen, setTradeModalOpen] =
    useState(false);

  const [tradeForm, setTradeForm] =
    useState({
      capitalId: "",
      asset: "XAUUSD",
      dateTime: "",
      session: "New York",
      direction: "BUY",
      timeframe: "M15",
      entry: "",
      stopLoss: "",
      rr: "2",
      exitType: "TP",
      exitPrice: "",
      fees: "",
      swap: "",
      setup: "ZS OA",
      emotion: "",
      planAdherence: "Oui",
      mistakes: "",
      entryReason: "",
      exitReason: "",
      notes: "",
    });

  const [tradeCapitalFilter, setTradeCapitalFilter] =
    useState("all");

  const [notification, setNotification] =
    useState(null);

  /* =======================================================
     PERSISTENCE
  ======================================================= */

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

  useEffect(() => {
    if (!notification) return;

    const timer =
      setTimeout(() => {
        setNotification(null);
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notification]);

  /*
    Si le filtre sélectionné n'existe plus,
    on revient sur "Tous les capitaux".
  */
  useEffect(() => {
    if (
      dashboardCapitalFilter !== "" &&
      !capitals.some(
        (capital) =>
          capital.id ===
          dashboardCapitalFilter
      )
    ) {
      setDashboardCapitalFilter("");
    }
  }, [
    capitals,
    dashboardCapitalFilter,
  ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function showNotification(
    message,
    type = "success"
  ) {
    setNotification({
      message,
      type,
    });
  }

  function navigate(page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  /* =======================================================
     CAPITALS
  ======================================================= */

  const activeCapitals = useMemo(
    () =>
      capitals.filter(
        (capital) =>
          capital.status !==
          "archived"
      ),
    [capitals]
  );

  const archivedCapitals = useMemo(
    () =>
      capitals.filter(
        (capital) =>
          capital.status ===
          "archived"
      ),
    [capitals]
  );

  function openNewCapitalModal() {
    setEditingCapitalId(null);

    setCapitalForm({
      name: "",
      initialCapital: "",
      currentBalance: "",
      riskMode: "percentage",
      riskPercent: "1",
      riskAmount: "",
      defaultRR: "2",
    });

    setCapitalModalOpen(true);
  }

  function openEditCapitalModal(
    capital
  ) {
    setEditingCapitalId(
      capital.id
    );

    setCapitalForm({
      name: capital.name || "",
      initialCapital:
        capital.initialCapital ?? "",
      currentBalance:
        capital.currentBalance ?? "",
      riskMode:
        capital.riskMode ||
        "percentage",
      riskPercent:
        capital.riskPercent ??
        "1",
      riskAmount:
        capital.riskAmount ?? "",
      defaultRR:
        capital.defaultRR ??
        "2",
    });

    setCapitalModalOpen(true);
  }

  function saveCapital() {
    const name =
      capitalForm.name.trim();

    const initial =
      Number(
        capitalForm.initialCapital
      );

    if (!name) {
      showNotification(
        "Le nom du capital est obligatoire.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(initial) ||
      initial <= 0
    ) {
      showNotification(
        "Le capital initial doit être supérieur à 0.",
        "error"
      );
      return;
    }

    if (
      capitalForm.riskMode ===
        "percentage" &&
      Number(
        capitalForm.riskPercent
      ) <= 0
    ) {
      showNotification(
        "Le risque en pourcentage doit être supérieur à 0.",
        "error"
      );
      return;
    }

    if (
      capitalForm.riskMode ===
        "fixed" &&
      Number(
        capitalForm.riskAmount
      ) <= 0
    ) {
      showNotification(
        "Le risque fixe doit être supérieur à 0.",
        "error"
      );
      return;
    }

    const existing =
      editingCapitalId
        ? capitals.find(
            (capital) =>
              capital.id ===
              editingCapitalId
          )
        : null;

    const currentBalance =
      capitalForm.currentBalance !==
        "" &&
      capitalForm.currentBalance !==
        null
        ? Number(
            capitalForm.currentBalance
          )
        : existing
        ? Number(
            existing.currentBalance
          )
        : initial;

    const capitalData = {
      id:
        editingCapitalId ||
        createId("capital"),
      name,
      initialCapital: initial,
      currentBalance:
        Number.isFinite(
          currentBalance
        )
          ? currentBalance
          : initial,
      riskMode:
        capitalForm.riskMode,
      riskPercent:
        Number(
          capitalForm.riskPercent
        ) || 0,
      riskAmount:
        Number(
          capitalForm.riskAmount
        ) || 0,
      defaultRR:
        Number(
          capitalForm.defaultRR
        ) || 2,
      status:
        existing?.status ||
        "active",
      createdAt:
        existing?.createdAt ||
        new Date().toISOString(),
    };

    if (editingCapitalId) {
      setCapitals(
        (current) =>
          current.map(
            (capital) =>
              capital.id ===
              editingCapitalId
                ? capitalData
                : capital
          )
      );

      showNotification(
        "Capital modifié avec succès."
      );
    } else {
      setCapitals(
        (current) => [
          ...current,
          capitalData,
        ]
      );

      showNotification(
        "Capital créé avec succès."
      );
    }

    setCapitalModalOpen(false);
  }

  function archiveCapital(
    capitalId
  ) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            capitalId
              ? {
                  ...capital,
                  status:
                    "archived",
                }
              : capital
        )
    );

    showNotification(
      "Capital archivé."
    );
  }

  function restoreCapital(
    capitalId
  ) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            capitalId
              ? {
                  ...capital,
                  status: "active",
                }
              : capital
        )
    );

    showNotification(
      "Capital restauré."
    );
  }

  function deleteCapital(
    capitalId
  ) {
    const linkedTrades =
      trades.some(
        (trade) =>
          trade.capitalId ===
          capitalId
      );

    if (linkedTrades) {
      showNotification(
        "Impossible de supprimer ce capital : des trades lui sont liés.",
        "error"
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

    setCapitals(
      (current) =>
        current.filter(
          (capital) =>
            capital.id !==
            capitalId
        )
    );

    showNotification(
      "Capital supprimé."
    );
  }

  /* =======================================================
     TRADES
  ======================================================= */

  function openNewTradeModal() {
    const defaultCapital =
      activeCapitals[0];

    setTradeForm({
      capitalId:
        defaultCapital?.id ||
        "",
      asset: "XAUUSD",
      dateTime:
        new Date()
          .toISOString()
          .slice(0, 16),
      session: "New York",
      direction: "BUY",
      timeframe: "M15",
      entry: "",
      stopLoss: "",
      rr:
        defaultCapital?.defaultRR ||
        "2",
      exitType: "TP",
      exitPrice: "",
      fees: "",
      swap: "",
      setup: "ZS OA",
      emotion: "",
      planAdherence: "Oui",
      mistakes: "",
      entryReason: "",
      exitReason: "",
      notes: "",
    });

    setTradeModalOpen(true);
  }

  const selectedTradeCapital =
    capitals.find(
      (capital) =>
        capital.id ===
        tradeForm.capitalId
    );

  const tradeRisk =
    getCapitalRisk(
      selectedTradeCapital
    );

  const tradeRiskPercent =
    getCapitalRiskPercent(
      selectedTradeCapital
    );

  const tradeEntry =
    Number(tradeForm.entry) || 0;

  const tradeSL =
    Number(
      tradeForm.stopLoss
    ) || 0;

  const tradeRR =
    Number(tradeForm.rr) || 1;

  const tradeTP =
    calculateTP(
      tradeForm.direction,
      tradeEntry,
      tradeSL,
      tradeRR
    );

  const tradeStopPips =
    calculateStopPips(
      tradeForm.asset,
      tradeEntry,
      tradeSL
    );

  const tradePipValue =
    getPipValuePerLot(
      tradeForm.asset,
      tradeEntry
    );

  const tradeLot =
    calculateLot(
      tradeRisk,
      tradeStopPips,
      tradePipValue
    );

  let tradeExitPrice = 0;

  if (
    tradeForm.exitType ===
    "TP"
  ) {
    tradeExitPrice = tradeTP;
  } else if (
    tradeForm.exitType ===
    "SL"
  ) {
    tradeExitPrice = tradeSL;
  } else {
    tradeExitPrice =
      Number(
        tradeForm.exitPrice
      ) || 0;
  }

  const tradeResultPips =
    tradeEntry &&
    tradeExitPrice
      ? calculateDirectionalPips(
          tradeForm.asset,
          tradeForm.direction,
          tradeEntry,
          tradeExitPrice
        )
      : 0;

  const tradeGrossResult =
    tradeResultPips *
    tradeLot *
    tradePipValue;

  const tradeFees =
    Number(
      tradeForm.fees
    ) || 0;

  const tradeSwap =
    Number(
      tradeForm.swap
    ) || 0;

  const tradeNetResult =
    tradeGrossResult -
    tradeFees +
    tradeSwap;

  const tradeResultR =
    tradeRisk > 0
      ? tradeNetResult /
        tradeRisk
      : 0;

  function saveTrade() {
    if (
      !tradeForm.capitalId
    ) {
      showNotification(
        "Sélectionne un capital.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(
        tradeEntry
      ) ||
      tradeEntry <= 0
    ) {
      showNotification(
        "Le prix d'entrée est obligatoire.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(
        tradeSL
      ) ||
      tradeSL <= 0
    ) {
      showNotification(
        "Le Stop Loss est obligatoire.",
        "error"
      );
      return;
    }

    if (
      tradeStopPips <= 0
    ) {
      showNotification(
        "La distance entre l'entrée et le Stop Loss doit être supérieure à 0.",
        "error"
      );
      return;
    }

    if (
      tradeLot <= 0
    ) {
      showNotification(
        "Le lot calculé est nul. Vérifie le risque, l'entrée et le SL.",
        "error"
      );
      return;
    }

    if (
      tradeForm.exitType ===
        "BE" &&
      (!Number.isFinite(
        Number(
          tradeForm.exitPrice
        )
      ) ||
        Number(
          tradeForm.exitPrice
        ) <= 0)
    ) {
      showNotification(
        "Entre le prix réel de sortie pour un BE.",
        "error"
      );
      return;
    }

    const capital =
      capitals.find(
        (item) =>
          item.id ===
          tradeForm.capitalId
      );

    if (!capital) {
      showNotification(
        "Capital introuvable.",
        "error"
      );
      return;
    }

    const trade = {
      id: createId("trade"),

      capitalId:
        tradeForm.capitalId,

      asset:
        tradeForm.asset,

      dateTime:
        tradeForm.dateTime,

      session:
        tradeForm.session,

      direction:
        tradeForm.direction,

      timeframe:
        tradeForm.timeframe,

      entry:
        tradeEntry,

      stopLoss:
        tradeSL,

      rr:
        tradeRR,

      tp:
        tradeTP,

      stopPips:
        tradeStopPips,

      pipValue:
        tradePipValue,

      lot:
        tradeLot,

      riskMoney:
        tradeRisk,

      riskPercent:
        tradeRiskPercent,

      exitType:
        tradeForm.exitType,

      exitPrice:
        tradeExitPrice,

      grossPnl:
        tradeGrossResult,

      fees:
        tradeFees,

      swap:
        tradeSwap,

      pnl:
        tradeNetResult,

      resultPips:
        tradeResultPips,

      resultR:
        tradeResultR,

      result:
        tradeNetResult > 0
          ? "WIN"
          : tradeNetResult < 0
          ? "LOSS"
          : "BE",

      setup:
        tradeForm.setup,

      emotion:
        tradeForm.emotion,

      planAdherence:
        tradeForm.planAdherence,

      mistakes:
        tradeForm.mistakes,

      entryReason:
        tradeForm.entryReason,

      exitReason:
        tradeForm.exitReason,

      notes:
        tradeForm.notes,

      status: "closed",

      createdAt:
        new Date().toISOString(),

      capitalRiskSnapshot: {
        riskMode:
          capital.riskMode,
        riskPercent:
          getCapitalRiskPercent(
            capital
          ),
        riskAmount:
          getCapitalRisk(
            capital
          ),
      },
    };

    setTrades(
      (current) => [
        ...current,
        trade,
      ]
    );

    setCapitals(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            capital.id
              ? {
                  ...item,
                  currentBalance:
                    Number(
                      item.currentBalance
                    ) +
                    tradeNetResult,
                }
              : item
        )
    );

    setTradeModalOpen(false);

    showNotification(
      "Trade enregistré avec succès."
    );
  }

  function deleteTrade(
    tradeId
  ) {
    const trade =
      trades.find(
        (item) =>
          item.id ===
          tradeId
      );

    if (!trade) return;

    if (
      !window.confirm(
        "Supprimer ce trade ? Le P&L sera retiré du capital."
      )
    ) {
      return;
    }

    const pnl =
      getTradeNetPnl(trade);

    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            trade.capitalId
              ? {
                  ...capital,
                  currentBalance:
                    Number(
                      capital.currentBalance
                    ) - pnl,
                }
              : capital
        )
    );

    setTrades(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            tradeId
        )
    );

    showNotification(
      "Trade supprimé et capital recalculé."
    );
  }

  /* =======================================================
     DASHBOARD DATA
  ======================================================= */

  const closedTrades =
    useMemo(
      () =>
        trades.filter(
          isClosedTrade
        ),
      [trades]
    );

  /*
    FILTRE DU DASHBOARD

    "" = TOUS LES CAPITAUX
    id = CAPITAL INDIVIDUEL
  */

  const dashboardTrades =
    useMemo(() => {
      if (
        dashboardCapitalFilter ===
        ""
      ) {
        return closedTrades;
      }

      return closedTrades.filter(
        (trade) =>
          trade.capitalId ===
          dashboardCapitalFilter
      );
    }, [
      closedTrades,
      dashboardCapitalFilter,
    ]);

  const dashboardSelectedCapital =
    useMemo(
      () =>
        capitals.find(
          (capital) =>
            capital.id ===
            dashboardCapitalFilter
        ),
      [
        capitals,
        dashboardCapitalFilter,
      ]
    );

  const dashboardInitialCapital =
    useMemo(() => {
      if (
        dashboardCapitalFilter ===
        ""
      ) {
        return capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.initialCapital
            ) || 0),
          0
        );
      }

      return (
        Number(
          dashboardSelectedCapital?.initialCapital
        ) || 0
      );
    }, [
      capitals,
      dashboardCapitalFilter,
      dashboardSelectedCapital,
    ]);

  const dashboardCurrentBalance =
    useMemo(() => {
      if (
        dashboardCapitalFilter ===
        ""
      ) {
        return capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.currentBalance
            ) || 0),
          0
        );
      }

      return (
        Number(
          dashboardSelectedCapital?.currentBalance
        ) || 0
      );
    }, [
      capitals,
      dashboardCapitalFilter,
      dashboardSelectedCapital,
    ]);

  const dashboardStats =
    useMemo(
      () =>
        calculatePerformanceStats(
          dashboardTrades,
          dashboardInitialCapital
        ),
      [
        dashboardTrades,
        dashboardInitialCapital,
      ]
    );

  /*
    Performance globale :
    TOUJOURS tous les capitaux.
    Actifs + archivés.
  */

  const globalTrades =
    closedTrades;

  const globalInitialCapital =
    useMemo(
      () =>
        capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.initialCapital
            ) || 0),
          0
        ),
      [capitals]
    );

  const globalCurrentBalance =
    useMemo(
      () =>
        capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.currentBalance
            ) || 0),
          0
        ),
      [capitals]
    );

  const globalStats =
    useMemo(
      () =>
        calculatePerformanceStats(
          globalTrades,
          globalInitialCapital
        ),
      [
        globalTrades,
        globalInitialCapital,
      ]
    );

  const dashboardGroupedAsset =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "asset"
        ),
      [dashboardTrades]
    );

  const dashboardGroupedSetup =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "setup"
        ),
      [dashboardTrades]
    );

  const dashboardGroupedSession =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "session"
        ),
      [dashboardTrades]
    );

  const dashboardGroupedTimeframe =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "timeframe"
        ),
      [dashboardTrades]
    );

  const dashboardGroupedDirection =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "direction"
        ),
      [dashboardTrades]
    );

  const dashboardGroupedExit =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "exitType"
        ),
      [dashboardTrades]
    );

  const dashboardRRStats =
    useMemo(
      () =>
        buildRRStats(
          dashboardTrades
        ),
      [dashboardTrades]
    );

  const globalGroupedAsset =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "asset"
        ),
      [globalTrades]
    );

  const globalGroupedSetup =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "setup"
        ),
      [globalTrades]
    );

  const globalGroupedSession =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "session"
        ),
      [globalTrades]
    );

  const globalGroupedTimeframe =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "timeframe"
        ),
      [globalTrades]
    );

  const globalGroupedDirection =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "direction"
        ),
      [globalTrades]
    );

  const globalGroupedExit =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "exitType"
        ),
      [globalTrades]
    );

  const globalRRStats =
    useMemo(
      () =>
        buildRRStats(
          globalTrades
        ),
      [globalTrades]
    );

  /* =======================================================
     RENDER
  ======================================================= */

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage />;

      case "journal":
        return <JournalPage />;

      case "capitals":
        return <CapitalPage />;

      case "calendar":
        return <CalendarPage />;

      case "calculator":
        return <CalculatorPage />;

      case "settings":
        return <SettingsPage />;

      default:
        return <DashboardPage />;
    }
  }

  /* =======================================================
     DASHBOARD PAGE
  ======================================================= */

  function DashboardPage() {
    const selectedName =
      dashboardCapitalFilter === ""
        ? "Tous les capitaux"
        : dashboardSelectedCapital
        ? dashboardSelectedCapital.name
        : "Capital";

    return (
      <>
        <PageTitle
          title="Dashboard"
          subtitle="Vue complète de tes performances de trading"
          action={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <label style={styles.label}>
                Capital analysé
              </label>

              <select
                value={
                  dashboardCapitalFilter
                }
                onChange={(event) =>
                  setDashboardCapitalFilter(
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  width: "260px",
                }}
              >
                <option value="">
                  Tous les capitaux
                </option>

                {capitals.map(
                  (capital) => (
                    <option
                      key={capital.id}
                      value={capital.id}
                    >
                      {capital.name}
                      {capital.status ===
                      "archived"
                        ? " — Archivé"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>
          }
        />

        {/* =================================================
            VUE DU CAPITAL ANALYSÉ
        ================================================= */}

        <div
          style={{
            ...styles.sectionHeader,
            marginTop: "4px",
          }}
        >
          <div>
            <h2 style={styles.sectionTitle}>
              Capital analysé :{" "}
              {selectedName}
            </h2>

            <p
              style={styles.sectionSubtitle}
            >
              {dashboardCapitalFilter ===
              ""
                ? "Calcul basé sur tous les capitaux actifs et archivés."
                : "Calcul basé uniquement sur le capital sélectionné."}
            </p>
          </div>
        </div>

        <div style={styles.grid4}>
          <MetricCard
            label="Balance actuelle"
            value={formatMoney(
              dashboardCurrentBalance
            )}
          />

          <MetricCard
            label="P&L"
            value={formatMoney(
              dashboardStats.totalPnl
            )}
            valueColor={getResultColor(
              dashboardStats.totalPnl
            )}
          />

          <MetricCard
            label="Rendement"
            value={formatPercent(
              dashboardStats.pnlPercent
            )}
            valueColor={getResultColor(
              dashboardStats.pnlPercent
            )}
          />

          <MetricCard
            label="Trades"
            value={
              dashboardStats.trades
            }
          />

          <MetricCard
            label="Win Rate"
            value={formatPercent(
              dashboardStats.winRate
            )}
          />

          <MetricCard
            label="Profit Factor"
            value={
              Number.isFinite(
                dashboardStats.profitFactor
              )
                ? formatNumber(
                    dashboardStats.profitFactor
                  )
                : "∞"
            }
          />

          <MetricCard
            label="Avg R"
            value={`${formatNumber(
              dashboardStats.avgR
            )} R`}
            valueColor={getResultColor(
              dashboardStats.avgR
            )}
          />

          <MetricCard
            label="Max Drawdown"
            value={formatMoney(
              dashboardStats.maxDrawdown
            )}
            valueColor="#ef4444"
          />
        </div>

        <div
          style={{
            ...styles.grid4,
            marginTop: "13px",
          }}
        >
          <MetricCard
            label="P&L aujourd'hui"
            value={formatMoney(
              dashboardStats.pnlToday
            )}
            valueColor={getResultColor(
              dashboardStats.pnlToday
            )}
          />

          <MetricCard
            label="P&L cette semaine"
            value={formatMoney(
              dashboardStats.pnlWeek
            )}
            valueColor={getResultColor(
              dashboardStats.pnlWeek
            )}
          />

          <MetricCard
            label="P&L ce mois"
            value={formatMoney(
              dashboardStats.pnlMonth
            )}
            valueColor={getResultColor(
              dashboardStats.pnlMonth
            )}
          />

          <MetricCard
            label="Expectancy"
            value={`${formatNumber(
              dashboardStats.expectancy
            )} R`}
            valueColor={getResultColor(
              dashboardStats.expectancy
            )}
          />
        </div>

        <div
          style={{
            ...styles.grid4,
            marginTop: "13px",
          }}
        >
          <MetricCard
            label="Gain moyen"
            value={formatMoney(
              dashboardStats.avgWin
            )}
            valueColor="#22c55e"
          />

          <MetricCard
            label="Perte moyenne"
            value={formatMoney(
              dashboardStats.avgLoss
            )}
            valueColor="#ef4444"
          />

          <MetricCard
            label="Meilleure série"
            value={`${dashboardStats.bestWinStreak} W`}
            valueColor="#22c55e"
          />

          <MetricCard
            label="Pire série"
            value={`${dashboardStats.bestLossStreak} L`}
            valueColor="#ef4444"
          />
        </div>

        <div
          style={{
            ...styles.grid4,
            marginTop: "13px",
          }}
        >
          <MetricCard
            label="Capital initial"
            value={formatMoney(
              dashboardInitialCapital
            )}
          />

          <MetricCard
            label="Wins"
            value={
              dashboardStats.wins
            }
            valueColor="#22c55e"
          />

          <MetricCard
            label="Loss"
            value={
              dashboardStats.losses
            }
            valueColor="#ef4444"
          />

          <MetricCard
            label="Break Even"
            value={
              dashboardStats.breakeven
            }
          />
        </div>

        {/* EQUITY */}
        <div style={styles.section}>
          <div style={styles.card}>
            <div
              style={styles.sectionHeader}
            >
              <div>
                <h3
                  style={styles.sectionTitle}
                >
                  Courbe d'equity
                </h3>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Évolution du capital selon
                  les trades clôturés.
                </p>
              </div>
            </div>

            {dashboardStats
              .equityCurve
              .length === 0 ? (
              <EmptyState
                text="Aucun trade pour ce filtre."
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 300,
                }}
              >
                <ResponsiveContainer>
                  <AreaChart
                    data={
                      dashboardStats.equityCurve
                    }
                  >
                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      tick={{
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background:
                          "#0f172a",
                        border:
                          "1px solid #334155",
                        borderRadius: 8,
                        color:
                          "#e2e8f0",
                      }}
                      formatter={(
                        value
                      ) =>
                        formatMoney(
                          value
                        )
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#60a5fa"
                      fill="#2563eb"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* GROUPES DU CAPITAL ANALYSÉ */}
        <div style={styles.section}>
          <h3
            style={{
              ...styles.sectionTitle,
              marginBottom: "12px",
            }}
          >
            Analyse détaillée —{" "}
            {selectedName}
          </h3>

          <div style={styles.grid2}>
            <StatsTable
              title="Par actif"
              subtitle="Performance selon l'instrument."
              rows={
                dashboardGroupedAsset
              }
            />

            <StatsTable
              title="Par setup"
              subtitle="Performance selon le setup."
              rows={
                dashboardGroupedSetup
              }
            />

            <StatsTable
              title="Par session"
              subtitle="Performance selon la session."
              rows={
                dashboardGroupedSession
              }
            />

            <StatsTable
              title="Par timeframe"
              subtitle="Performance selon le timeframe."
              rows={
                dashboardGroupedTimeframe
              }
            />

            <StatsTable
              title="Par direction"
              subtitle="BUY vs SELL."
              rows={
                dashboardGroupedDirection
              }
            />

            <StatsTable
              title="Par sortie"
              subtitle="TP, SL et BE."
              rows={
                dashboardGroupedExit
              }
            />
          </div>
        </div>

        <RRTable
          title={`Analyse RR — ${selectedName}`}
          rows={dashboardRRStats}
        />

        {/* =================================================
            PERFORMANCE GLOBALE
        ================================================= */}

        <div
          style={{
            ...styles.section,
            marginTop: "38px",
          }}
        >
          <div
            style={{
              border:
                "1px solid #2563eb",
              background:
                "linear-gradient(135deg, rgba(30,58,138,.22), rgba(15,23,42,.95))",
              borderRadius: "15px",
              padding: "20px",
            }}
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <div>
                <h2
                  style={{
                    ...styles.sectionTitle,
                    fontSize: "19px",
                  }}
                >
                  Performance globale
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Tous les capitaux — actifs
                  et archivés. Cette section
                  représente la performance
                  historique globale du journal.
                </p>
              </div>
            </div>

            <div style={styles.grid4}>
              <MetricCard
                label="Capital initial global"
                value={formatMoney(
                  globalInitialCapital
                )}
              />

              <MetricCard
                label="Balance globale"
                value={formatMoney(
                  globalCurrentBalance
                )}
              />

              <MetricCard
                label="P&L global"
                value={formatMoney(
                  globalStats.totalPnl
                )}
                valueColor={getResultColor(
                  globalStats.totalPnl
                )}
              />

              <MetricCard
                label="Rendement global"
                value={formatPercent(
                  globalStats.pnlPercent
                )}
                valueColor={getResultColor(
                  globalStats.pnlPercent
                )}
              />

              <MetricCard
                label="Trades globaux"
                value={
                  globalStats.trades
                }
              />

              <MetricCard
                label="Win Rate global"
                value={formatPercent(
                  globalStats.winRate
                )}
              />

              <MetricCard
                label="Profit Factor global"
                value={
                  Number.isFinite(
                    globalStats.profitFactor
                  )
                    ? formatNumber(
                        globalStats.profitFactor
                      )
                    : "∞"
                }
              />

              <MetricCard
                label="Avg R global"
                value={`${formatNumber(
                  globalStats.avgR
                )} R`}
                valueColor={getResultColor(
                  globalStats.avgR
                )}
              />
            </div>

            <div
              style={{
                ...styles.grid4,
                marginTop: "13px",
              }}
            >
              <MetricCard
                label="Max Drawdown global"
                value={formatMoney(
                  globalStats.maxDrawdown
                )}
                valueColor="#ef4444"
              />

              <MetricCard
                label="Drawdown %"
                value={formatPercent(
                  globalStats.maxDrawdownPercent
                )}
                valueColor="#ef4444"
              />

              <MetricCard
                label="Gain moyen global"
                value={formatMoney(
                  globalStats.avgWin
                )}
                valueColor="#22c55e"
              />

              <MetricCard
                label="Perte moyenne globale"
                value={formatMoney(
                  globalStats.avgLoss
                )}
                valueColor="#ef4444"
              />

              <MetricCard
                label="P&L aujourd'hui"
                value={formatMoney(
                  globalStats.pnlToday
                )}
                valueColor={getResultColor(
                  globalStats.pnlToday
                )}
              />

              <MetricCard
                label="P&L semaine"
                value={formatMoney(
                  globalStats.pnlWeek
                )}
                valueColor={getResultColor(
                  globalStats.pnlWeek
                )}
              />

              <MetricCard
                label="P&L mois"
                value={formatMoney(
                  globalStats.pnlMonth
                )}
                valueColor={getResultColor(
                  globalStats.pnlMonth
                )}
              />

              <MetricCard
                label="Expectancy"
                value={`${formatNumber(
                  globalStats.expectancy
                )} R`}
                valueColor={getResultColor(
                  globalStats.expectancy
                )}
              />
            </div>

            <div
              style={{
                ...styles.grid4,
                marginTop: "13px",
              }}
            >
              <MetricCard
                label="Wins"
                value={
                  globalStats.wins
                }
                valueColor="#22c55e"
              />

              <MetricCard
                label="Loss"
                value={
                  globalStats.losses
                }
                valueColor="#ef4444"
              />

              <MetricCard
                label="Break Even"
                value={
                  globalStats.breakeven
                }
              />

              <MetricCard
                label="Meilleure série"
                value={`${globalStats.bestWinStreak} W`}
                valueColor="#22c55e"
              />
            </div>

            <div
              style={{
                ...styles.card,
                marginTop: "18px",
              }}
            >
              <h3
                style={
                  styles.sectionTitle
                }
              >
                Equity globale
              </h3>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Tous les trades clôturés de
                tous les capitaux.
              </p>

              {globalStats.equityCurve
                .length === 0 ? (
                <EmptyState
                  text="Aucun trade enregistré."
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 300,
                    marginTop: "12px",
                  }}
                >
                  <ResponsiveContainer>
                    <AreaChart
                      data={
                        globalStats.equityCurve
                      }
                    >
                      <CartesianGrid
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "#64748b",
                          fontSize: 10,
                        }}
                      />

                      <YAxis
                        tick={{
                          fill: "#64748b",
                          fontSize: 10,
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          background:
                            "#0f172a",
                          border:
                            "1px solid #334155",
                          borderRadius: 8,
                        }}
                        formatter={(
                          value
                        ) =>
                          formatMoney(
                            value
                          )
                        }
                      />

                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#60a5fa"
                        fill="#2563eb"
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <div style={styles.grid2}>
                <StatsTable
                  title="Global — Actifs"
                  subtitle="Tous les instruments."
                  rows={
                    globalGroupedAsset
                  }
                />

                <StatsTable
                  title="Global — Setups"
                  subtitle="Tous les setups."
                  rows={
                    globalGroupedSetup
                  }
                />

                <StatsTable
                  title="Global — Sessions"
                  subtitle="Toutes les sessions."
                  rows={
                    globalGroupedSession
                  }
                />

                <StatsTable
                  title="Global — Timeframes"
                  subtitle="Tous les timeframes."
                  rows={
                    globalGroupedTimeframe
                  }
                />

                <StatsTable
                  title="Global — Direction"
                  subtitle="BUY / SELL."
                  rows={
                    globalGroupedDirection
                  }
                />

                <StatsTable
                  title="Global — Sorties"
                  subtitle="TP / SL / BE."
                  rows={
                    globalGroupedExit
                  }
                />
              </div>
            </div>

            <RRTable
              title="Performance globale par RR"
              rows={globalRRStats}
            />
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     CAPITAL PAGE
  ======================================================= */

  function CapitalPage() {
    return (
      <>
        <PageTitle
          title="Capitaux"
          subtitle="Gère tes capitaux actifs et archivés"
          action={
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={
                openNewCapitalModal
              }
            >
              <Plus size={15} />
              Nouveau capital
            </button>
          }
        />

        <div style={styles.section}>
          <div
            style={styles.sectionHeader}
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Capitaux actifs
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Capitaux actuellement utilisés
                pour le trading.
              </p>
            </div>
          </div>

          {activeCapitals.length ===
          0 ? (
            <EmptyState
              text="Aucun capital actif."
              action={
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                  }}
                  onClick={
                    openNewCapitalModal
                  }
                >
                  <Plus size={15} />
                  Créer un capital
                </button>
              }
            />
          ) : (
            <div style={styles.grid3}>
              {activeCapitals.map(
                (capital) => (
                  <CapitalCard
                    key={capital.id}
                    capital={capital}
                  />
                )
              )}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div
            style={styles.sectionHeader}
          >
            <div>
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Capitaux archivés
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Les capitaux archivés restent
                disponibles dans les statistiques
                globales.
              </p>
            </div>
          </div>

          {archivedCapitals.length ===
          0 ? (
            <EmptyState
              text="Aucun capital archivé."
            />
          ) : (
            <div style={styles.grid3}>
              {archivedCapitals.map(
                (capital) => (
                  <CapitalCard
                    key={capital.id}
                    capital={capital}
                  />
                )
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  function CapitalCard({
    capital,
  }) {
    const capitalTrades =
      trades.filter(
        (trade) =>
          trade.capitalId ===
          capital.id
      );

    const pnl =
      capitalTrades.reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(trade),
        0
      );

    return (
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "16px",
              }}
            >
              {capital.name}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                marginTop: "4px",
              }}
            >
              {capital.status ===
              "archived"
                ? "Archivé"
                : "Actif"}
            </div>
          </div>

          <span
            style={{
              ...styles.badge,
              color:
                capital.status ===
                "archived"
                  ? "#fbbf24"
                  : "#86efac",
            }}
          >
            {capital.status ===
            "archived"
              ? "ARCHIVÉ"
              : "ACTIF"}
          </span>
        </div>

        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gap: "9px",
          }}
        >
          <CapitalInfoRow
            label="Balance"
            value={formatMoney(
              capital.currentBalance
            )}
          />

          <CapitalInfoRow
            label="Capital initial"
            value={formatMoney(
              capital.initialCapital
            )}
          />

          <CapitalInfoRow
            label="P&L"
            value={formatMoney(
              pnl
            )}
            valueColor={getResultColor(
              pnl
            )}
          />

          <CapitalInfoRow
            label="Trades"
            value={
              capitalTrades.length
            }
          />

          <CapitalInfoRow
            label="Risque / trade"
            value={
              capital.riskMode ===
              "percentage"
                ? `${formatNumber(
                    capital.riskPercent
                  )}% (${formatMoney(
                    getCapitalRisk(
                      capital
                    )
                  )})`
                : `${formatMoney(
                    capital.riskAmount
                  )} (${formatPercent(
                    getCapitalRiskPercent(
                      capital
                    )
                  )})`
            }
          />

          <CapitalInfoRow
            label="RR de base"
            value={`RR${capital.defaultRR}`}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "7px",
            flexWrap: "wrap",
            marginTop: "18px",
          }}
        >
          <button
            style={styles.button}
            onClick={() =>
              openEditCapitalModal(
                capital
              )
            }
          >
            <Pencil size={13} />
            Modifier
          </button>

          {capital.status ===
          "archived" ? (
            <button
              style={styles.button}
              onClick={() =>
                restoreCapital(
                  capital.id
                )
              }
            >
              <RotateCcw
                size={13}
              />
              Restaurer
            </button>
          ) : (
            <button
              style={styles.button}
              onClick={() =>
                archiveCapital(
                  capital.id
                )
              }
            >
              <Archive
                size={13}
              />
              Archiver
            </button>
          )}

          <button
            style={{
              ...styles.button,
              ...styles.dangerButton,
            }}
            onClick={() =>
              deleteCapital(
                capital.id
              )
            }
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        </div>

        <p
          style={{
            color: "#64748b",
            fontSize: "10px",
            marginTop: "13px",
            lineHeight: 1.5,
          }}
        >
          Le RR de base est une recommandation.
          Chaque trade peut choisir indépendamment
          RR1 à RR10.
        </p>
      </div>
    );
  }

  /* =======================================================
     JOURNAL
  ======================================================= */

  function JournalPage() {
    const visibleTrades =
      closedTrades
        .filter((trade) => {
          if (
            tradeCapitalFilter ===
            "all"
          ) {
            return true;
          }

          return (
            trade.capitalId ===
            tradeCapitalFilter
          );
        })
        .sort(
          (a, b) =>
            getTradeTimestamp(b) -
            getTradeTimestamp(a)
        );

    return (
      <>
        <PageTitle
          title="Journal"
          subtitle="Historique détaillé de tes trades"
          action={
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <select
                value={
                  tradeCapitalFilter
                }
                onChange={(event) =>
                  setTradeCapitalFilter(
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  width: "220px",
                }}
              >
                <option value="all">
                  Tous les capitaux
                </option>

                {capitals.map(
                  (capital) => (
                    <option
                      key={capital.id}
                      value={capital.id}
                    >
                      {capital.name}
                      {capital.status ===
                      "archived"
                        ? " — Archivé"
                        : ""}
                    </option>
                  )
                )}
              </select>

              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                }}
                onClick={
                  openNewTradeModal
                }
              >
                <Plus size={15} />
                Nouveau trade
              </button>
            </div>
          }
        />

        <div style={styles.card}>
          {visibleTrades.length ===
          0 ? (
            <EmptyState
              text="Aucun trade pour ce filtre."
              action={
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                  }}
                  onClick={
                    openNewTradeModal
                  }
                >
                  <Plus size={15} />
                  Ajouter un trade
                </button>
              }
            />
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
              <table
                style={styles.table}
              >
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Date
                    </th>
                    <th style={styles.th}>
                      Capital
                    </th>
                    <th style={styles.th}>
                      Actif
                    </th>
                    <th style={styles.th}>
                      Dir.
                    </th>
                    <th style={styles.th}>
                      Entrée
                    </th>
                    <th style={styles.th}>
                      SL
                    </th>
                    <th style={styles.th}>
                      TP
                    </th>
                    <th style={styles.th}>
                      RR
                    </th>
                    <th style={styles.th}>
                      Sortie
                    </th>
                    <th style={styles.th}>
                      Lot
                    </th>
                    <th style={styles.th}>
                      Résultat
                    </th>
                    <th style={styles.th}>
                      R
                    </th>
                    <th style={styles.th}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleTrades.map(
                    (trade) => {
                      const capital =
                        capitals.find(
                          (item) =>
                            item.id ===
                            trade.capitalId
                        );

                      const pnl =
                        getTradeNetPnl(
                          trade
                        );

                      return (
                        <tr
                          key={
                            trade.id
                          }
                        >
                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatDate(
                              trade.dateTime
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {capital?.name ||
                              "-"}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            <strong>
                              {
                                trade.asset
                              }
                            </strong>
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            <span
                              style={{
                                ...styles.badge,
                                color:
                                  trade.direction ===
                                  "BUY"
                                    ? "#86efac"
                                    : "#fca5a5",
                              }}
                            >
                              {
                                trade.direction
                              }
                            </span>
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.entry,
                              trade.asset ===
                                "XAUUSD" ||
                              trade.asset ===
                                "USDJPY"
                                ? 2
                                : 5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.stopLoss,
                              trade.asset ===
                                "XAUUSD" ||
                              trade.asset ===
                                "USDJPY"
                                ? 2
                                : 5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.tp,
                              trade.asset ===
                                "XAUUSD" ||
                              trade.asset ===
                                "USDJPY"
                                ? 2
                                : 5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            RR
                            {trade.rr}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.exitPrice,
                              trade.asset ===
                                "XAUUSD" ||
                              trade.asset ===
                                "USDJPY"
                                ? 2
                                : 5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.lot
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                getResultColor(
                                  pnl
                                ),
                              fontWeight: 800,
                            }}
                          >
                            {formatMoney(
                              pnl
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                getResultColor(
                                  getTradeR(
                                    trade
                                  )
                                ),
                              fontWeight: 800,
                            }}
                          >
                            {formatNumber(
                              getTradeR(
                                trade
                              )
                            )}
                            R
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            <button
                              style={{
                                ...styles.button,
                                padding:
                                  "6px 8px",
                              }}
                              onClick={() =>
                                deleteTrade(
                                  trade.id
                                )
                              }
                            >
                              <Trash2
                                size={
                                  13
                                }
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  /* =======================================================
     CALENDAR
  ======================================================= */

  function CalendarPage() {
    const now =
      new Date();

    const [calendarDate, setCalendarDate] =
      useState(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        )
      );

    const year =
      calendarDate.getFullYear();

    const month =
      calendarDate.getMonth();

    const monthName =
      calendarDate.toLocaleDateString(
        "fr-FR",
        {
          month: "long",
          year: "numeric",
        }
      );

    const monthTrades =
      closedTrades.filter(
        (trade) => {
          const date =
            getTradeDate(trade);

          return (
            date &&
            date.getFullYear() ===
              year &&
            date.getMonth() ===
              month
          );
        }
      );

    const monthStats =
      calculatePerformanceStats(
        monthTrades,
        0
      );

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const mondayIndex =
      firstDay === 0
        ? 6
        : firstDay - 1;

    const calendarCells = [];

    for (
      let i = 0;
      i < mondayIndex;
      i += 1
    ) {
      calendarCells.push(
        null
      );
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day += 1
    ) {
      calendarCells.push(day);
    }

    const dailyData =
      Array.from(
        {
          length:
            daysInMonth,
        },
        (_, index) => {
          const day =
            index + 1;

          const dayTrades =
            monthTrades.filter(
              (trade) => {
                const date =
                  getTradeDate(
                    trade
                  );

                return (
                  date &&
                  date.getDate() ===
                    day
                );
              }
            );

          const pnl =
            dayTrades.reduce(
              (sum, trade) =>
                sum +
                getTradeNetPnl(
                  trade
                ),
              0
            );

          const r =
            dayTrades.reduce(
              (sum, trade) =>
                sum +
                getTradeR(trade),
              0
            );

          return {
            day,
            trades:
              dayTrades.length,
            pnl,
            r,
            wins:
              dayTrades.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) > 0
              ).length,
            losses:
              dayTrades.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) < 0
              ).length,
          };
        }
      );

    const activeDays =
      dailyData.filter(
        (day) =>
          day.trades > 0
      );

    const bestDay =
      [...activeDays].sort(
        (a, b) =>
          b.pnl - a.pnl
      )[0];

    const worstDay =
      [...activeDays].sort(
        (a, b) =>
          a.pnl - b.pnl
      )[0];

    function changeMonth(
      amount
    ) {
      setCalendarDate(
        new Date(
          year,
          month + amount,
          1
        )
      );
    }

    return (
      <>
        <PageTitle
          title="Calendrier"
          subtitle="Vue quotidienne et mensuelle des performances"
          action={
            <div
              style={{
                display: "flex",
                gap: "7px",
              }}
            >
              <button
                style={styles.button}
                onClick={() =>
                  changeMonth(-1)
                }
              >
                ←
              </button>

              <button
                style={styles.button}
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1
                    )
                  )
                }
              >
                Aujourd'hui
              </button>

              <button
                style={styles.button}
                onClick={() =>
                  changeMonth(1)
                }
              >
                →
              </button>
            </div>
          }
        />

        <div
          style={{
            ...styles.sectionHeader,
            marginBottom: "15px",
          }}
        >
          <div>
            <h2
              style={{
                ...styles.sectionTitle,
                textTransform:
                  "capitalize",
              }}
            >
              {monthName}
            </h2>
          </div>
        </div>

        <div style={styles.grid4}>
          <MetricCard
            label="P&L du mois"
            value={formatMoney(
              monthStats.totalPnl
            )}
            valueColor={getResultColor(
              monthStats.totalPnl
            )}
          />

          <MetricCard
            label="Trades"
            value={
              monthStats.trades
            }
          />

          <MetricCard
            label="Win Rate"
            value={formatPercent(
              monthStats.winRate
            )}
          />

          <MetricCard
            label="Avg R"
            value={`${formatNumber(
              monthStats.avgR
            )} R`}
          />
        </div>

        <div
          style={{
            ...styles.grid2,
            marginTop: "13px",
          }}
        >
          <MetricCard
            label="Meilleur jour"
            value={
              bestDay
                ? `${bestDay.day} — ${formatMoney(
                    bestDay.pnl
                  )}`
                : "-"
            }
            valueColor="#22c55e"
          />

          <MetricCard
            label="Pire jour"
            value={
              worstDay
                ? `${worstDay.day} — ${formatMoney(
                    worstDay.pnl
                  )}`
                : "-"
            }
            valueColor="#ef4444"
          />
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(7, minmax(0, 1fr))",
              gap: "6px",
              marginBottom: "7px",
            }}
          >
            {[
              "Lun",
              "Mar",
              "Mer",
              "Jeu",
              "Ven",
              "Sam",
              "Dim",
            ].map((day) => (
              <div
                key={day}
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                  fontWeight:
                    800,
                  textAlign:
                    "center",
                  padding:
                    "7px",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(7, minmax(0, 1fr))",
              gap: "6px",
            }}
          >
            {calendarCells.map(
              (day, index) => {
                if (
                  day ===
                  null
                ) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={{
                        minHeight:
                          "82px",
                      }}
                    />
                  );
                }

                const data =
                  dailyData[
                    day - 1
                  ];

                const hasTrades =
                  data.trades >
                  0;

                return (
                  <div
                    key={day}
                    style={{
                      minHeight:
                        "82px",
                      border:
                        "1px solid #1e293b",
                      borderRadius:
                        "8px",
                      padding:
                        "8px",
                      background:
                        hasTrades
                          ? data.pnl >
                            0
                            ? "rgba(34,197,94,.08)"
                            : data.pnl <
                              0
                            ? "rgba(239,68,68,.08)"
                            : "#0b1220"
                          : "#0b1220",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "11px",
                        fontWeight:
                          800,
                      }}
                    >
                      {day}
                    </div>

                    {hasTrades && (
                      <>
                        <div
                          style={{
                            fontSize:
                              "12px",
                            fontWeight:
                              800,
                            color:
                              getResultColor(
                                data.pnl
                              ),
                            marginTop:
                              "10px",
                          }}
                        >
                          {formatMoney(
                            data.pnl
                          )}
                        </div>

                        <div
                          style={{
                            fontSize:
                              "9px",
                            color:
                              "#64748b",
                            marginTop:
                              "4px",
                          }}
                        >
                          {
                            data.trades
                          }{" "}
                          trade
                          {data.trades >
                          1
                            ? "s"
                            : ""}
                        </div>
                      </>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: "20px",
          }}
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            Détail quotidien
          </h3>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Résumé de chaque journée ayant
            au moins un trade.
          </p>

          <div
            style={{
              ...styles.tableWrapper,
              marginTop: "12px",
            }}
          >
            <table
              style={styles.table}
            >
              <thead>
                <tr>
                  <th
                    style={
                      styles.th
                    }
                  >
                    Jour
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Trades
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Wins
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Loss
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    P&L
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    R
                  </th>
                </tr>
              </thead>

              <tbody>
                {activeDays.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...styles.td,
                        textAlign:
                          "center",
                        color:
                          "#64748b",
                      }}
                    >
                      Aucun trade ce
                      mois-ci.
                    </td>
                  </tr>
                ) : (
                  activeDays.map(
                    (day) => (
                      <tr
                        key={
                          day.day
                        }
                      >
                        <td
                          style={
                            styles.td
                          }
                        >
                          {day.day}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {
                            day.trades
                          }
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              "#22c55e",
                          }}
                        >
                          {
                            day.wins
                          }
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              "#ef4444",
                          }}
                        >
                          {
                            day.losses
                          }
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              getResultColor(
                                day.pnl
                              ),
                            fontWeight:
                              800,
                          }}
                        >
                          {formatMoney(
                            day.pnl
                          )}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              getResultColor(
                                day.r
                              ),
                          }}
                        >
                          {formatNumber(
                            day.r
                          )}{" "}
                          R
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     CALCULATOR
  ======================================================= */

  function CalculatorPage() {
    const defaultCapital =
      activeCapitals[0];

    const [calculatorCapitalId, setCalculatorCapitalId] =
      useState(
        defaultCapital?.id ||
          ""
      );

    const [calculatorAsset, setCalculatorAsset] =
      useState("XAUUSD");

    const [calculatorDirection, setCalculatorDirection] =
      useState("BUY");

    const [calculatorEntry, setCalculatorEntry] =
      useState("");

    const [calculatorSL, setCalculatorSL] =
      useState("");

    const calculatorCapital =
      activeCapitals.find(
        (capital) =>
          capital.id ===
          calculatorCapitalId
      );

    const calcRisk =
      getCapitalRisk(
        calculatorCapital
      );

    const calcEntry =
      Number(
        calculatorEntry
      ) || 0;

    const calcSL =
      Number(
        calculatorSL
      ) || 0;

    const calcStopPips =
      calculateStopPips(
        calculatorAsset,
        calcEntry,
        calcSL
      );

    const calcPipValue =
      getPipValuePerLot(
        calculatorAsset,
        calcEntry
      );

    const calcLot =
      calculateLot(
        calcRisk,
        calcStopPips,
        calcPipValue
      );

    return (
      <>
        <PageTitle
          title="Calculateur"
          subtitle="Calcule automatiquement le risque, le lot et les TP"
        />

        <div
          style={{
            ...styles.card,
            marginBottom: "15px",
          }}
        >
          <div
            style={styles.formGrid2}
          >
            <div>
              <label
                style={styles.label}
              >
                Capital
              </label>

              <select
                value={
                  calculatorCapitalId
                }
                onChange={(event) =>
                  setCalculatorCapitalId(
                    event.target.value
                  )
                }
                style={styles.input}
              >
                <option value="">
                  Sélectionner
                </option>

                {activeCapitals.map(
                  (capital) => (
                    <option
                      key={
                        capital.id
                      }
                      value={
                        capital.id
                      }
                    >
                      {
                        capital.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={styles.label}
              >
                Actif
              </label>

              <select
                value={
                  calculatorAsset
                }
                onChange={(event) =>
                  setCalculatorAsset(
                    event.target.value
                  )
                }
                style={styles.input}
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
            </div>

            <div>
              <label
                style={styles.label}
              >
                Direction
              </label>

              <select
                value={
                  calculatorDirection
                }
                onChange={(event) =>
                  setCalculatorDirection(
                    event.target.value
                  )
                }
                style={styles.input}
              >
                <option value="BUY">
                  BUY
                </option>
                <option value="SELL">
                  SELL
                </option>
              </select>
            </div>

            <div>
              <label
                style={styles.label}
              >
                Entrée
              </label>

              <input
                type="number"
                step="any"
                value={
                  calculatorEntry
                }
                onChange={(event) =>
                  setCalculatorEntry(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : 2000"
              />
            </div>

            <div>
              <label
                style={styles.label}
              >
                Stop Loss
              </label>

              <input
                type="number"
                step="any"
                value={
                  calculatorSL
                }
                onChange={(event) =>
                  setCalculatorSL(
                    event.target.value
                  )
                }
                style={styles.input}
                placeholder="Ex : 1998"
              />
            </div>
          </div>
        </div>

        <div style={styles.grid4}>
          <MetricCard
            label="Risque"
            value={formatMoney(
              calcRisk
            )}
          />

          <MetricCard
            label="Risque %"
            value={formatPercent(
              getCapitalRiskPercent(
                calculatorCapital
              )
            )}
          />

          <MetricCard
            label="SL"
            value={`${formatNumber(
              calcStopPips
            )} pips`}
          />

          <MetricCard
            label="Pip value / lot"
            value={formatMoney(
              calcPipValue
            )}
          />

          <MetricCard
            label="Lot calculé"
            value={formatNumber(
              calcLot
            )}
          />

          <MetricCard
            label="Perte au SL"
            value={formatMoney(
              -calcRisk
            )}
            valueColor="#ef4444"
          />
        </div>

        <div
          style={{
            ...styles.card,
            marginTop: "20px",
          }}
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            TP selon chaque RR
          </h3>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Le RR choisi détermine
            automatiquement le TP.
          </p>

          <div
            style={{
              ...styles.tableWrapper,
              marginTop: "12px",
            }}
          >
            <table
              style={styles.table}
            >
              <thead>
                <tr>
                  <th
                    style={
                      styles.th
                    }
                  >
                    RR
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    TP
                  </th>

                  <th
                    style={
                      styles.th
                    }
                  >
                    Gain théorique
                  </th>
                </tr>
              </thead>

              <tbody>
                {RR_OPTIONS.map(
                  (rr) => {
                    const tp =
                      calculateTP(
                        calculatorDirection,
                        calcEntry,
                        calcSL,
                        rr
                      );

                    const gain =
                      calcRisk * rr;

                    return (
                      <tr
                        key={rr}
                      >
                        <td
                          style={
                            styles.td
                          }
                        >
                          <strong>
                            RR{rr}
                          </strong>
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {tp > 0
                            ? formatNumber(
                                tp,
                                calculatorAsset ===
                                  "XAUUSD" ||
                                calculatorAsset ===
                                  "USDJPY"
                                  ? 2
                                  : 5
                              )
                            : "-"}
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            color:
                              "#22c55e",
                          }}
                        >
                          {calcRisk >
                          0
                            ? formatMoney(
                                gain
                              )
                            : "-"}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  function SettingsPage() {
    function clearTrades() {
      if (
        !window.confirm(
          "Supprimer TOUS les trades ? Cette action est irréversible."
        )
      ) {
        return;
      }

      setTrades([]);

      showNotification(
        "Tous les trades ont été supprimés."
      );
    }

    function clearAllData() {
      if (
        !window.confirm(
          "Supprimer TOUS les capitaux et TOUS les trades ? Cette action est irréversible."
        )
      ) {
        return;
      }

      setTrades([]);
      setCapitals([]);

      showNotification(
        "Toutes les données ont été supprimées."
      );
    }

    return (
      <>
        <PageTitle
          title="Paramètres"
          subtitle="Gestion des données locales du journal"
        />

        <div style={styles.grid2}>
          <div style={styles.card}>
            <Settings
              size={35}
              color="#60a5fa"
            />

            <h3
              style={{
                ...styles.sectionTitle,
                marginTop: "13px",
              }}
            >
              Stockage local
            </h3>

            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Les données du journal sont
              actuellement enregistrées dans
              le stockage local du navigateur.
            </p>

            <div
              style={{
                marginTop: "15px",
                display: "grid",
                gap: "8px",
              }}
            >
              <CapitalInfoRow
                label="Capitaux"
                value={
                  capitals.length
                }
              />

              <CapitalInfoRow
                label="Trades"
                value={
                  trades.length
                }
              />

              <CapitalInfoRow
                label="Capitaux actifs"
                value={
                  activeCapitals.length
                }
              />

              <CapitalInfoRow
                label="Capitaux archivés"
                value={
                  archivedCapitals.length
                }
              />
            </div>
          </div>

          <div style={styles.card}>
            <h3
              style={
                styles.sectionTitle
              }
            >
              Gestion des données
            </h3>

            <p
              style={
                styles.sectionSubtitle
              }
            >
              Utilise ces actions avec
              précaution.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                style={{
                  ...styles.button,
                  ...styles.dangerButton,
                }}
                onClick={
                  clearTrades
                }
              >
                <Trash2 size={14} />
                Supprimer tous les trades
              </button>

              <button
                style={{
                  ...styles.button,
                  ...styles.dangerButton,
                }}
                onClick={
                  clearAllData
                }
              >
                <Trash2 size={14} />
                Réinitialiser toutes les données
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =======================================================
     CAPITAL MODAL
  ======================================================= */

  function CapitalModal() {
    if (!capitalModalOpen) {
      return null;
    }

    const previewCapital = {
      initialCapital:
        Number(
          capitalForm.initialCapital
        ) || 0,
      currentBalance:
        Number(
          capitalForm.currentBalance
        ) ||
        Number(
          capitalForm.initialCapital
        ) ||
        0,
      riskMode:
        capitalForm.riskMode,
      riskPercent:
        Number(
          capitalForm.riskPercent
        ) || 0,
      riskAmount:
        Number(
          capitalForm.riskAmount
        ) || 0,
    };

    const previewRisk =
      getCapitalRisk(
        previewCapital
      );

    const previewRiskPercent =
      getCapitalRiskPercent(
        previewCapital
      );

    return (
      <div
        style={
          styles.modalOverlay
        }
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            setCapitalModalOpen(
              false
            );
          }
        }}
      >
        <div
          style={styles.modal}
        >
          <div
            style={
              styles.modalHeader
            }
          >
            <div>
              <h2
                style={
                  styles.modalTitle
                }
              >
                {editingCapitalId
                  ? "Modifier le capital"
                  : "Nouveau capital"}
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Paramètres de gestion du risque.
              </p>
            </div>

            <button
              style={
                styles.closeButton
              }
              onClick={() =>
                setCapitalModalOpen(
                  false
                )
              }
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={
              styles.formGrid2
            }
          >
            <div>
              <label
                style={styles.label}
              >
                Nom du capital
              </label>

              <input
                value={
                  capitalForm.name
                }
                onChange={(event) =>
                  setCapitalForm(
                    (current) => ({
                      ...current,
                      name:
                        event.target
                          .value,
                    })
                  )
                }
                style={styles.input}
                placeholder="Ex : Compte principal"
              />
            </div>

            <div>
              <label
                style={styles.label}
              >
                Capital initial
              </label>

              <input
                type="number"
                step="any"
                value={
                  capitalForm.initialCapital
                }
                onChange={(event) =>
                  setCapitalForm(
                    (current) => ({
                      ...current,
                      initialCapital:
                        event.target
                          .value,
                      currentBalance:
                        current.currentBalance ||
                        event.target
                          .value,
                    })
                  )
                }
                style={styles.input}
                placeholder="2000"
              />
            </div>

            <div>
              <label
                style={styles.label}
              >
                Balance actuelle
              </label>

              <input
                type="number"
                step="any"
                value={
                  capitalForm.currentBalance
                }
                onChange={(event) =>
                  setCapitalForm(
                    (current) => ({
                      ...current,
                      currentBalance:
                        event.target
                          .value,
                    })
                  )
                }
                style={styles.input}
                placeholder="2000"
              />
            </div>

            <div>
              <label
                style={styles.label}
              >
                RR de base
              </label>

              <select
                value={
                  capitalForm.defaultRR
                }
                onChange={(event) =>
                  setCapitalForm(
                    (current) => ({
                      ...current,
                      defaultRR:
                        event.target
                          .value,
                    })
                  )
                }
                style={styles.input}
              >
                {RR_OPTIONS.map(
                  (rr) => (
                    <option
                      key={rr}
                      value={rr}
                    >
                      RR{rr}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={styles.label}
              >
                Mode de risque
              </label>

              <select
                value={
                  capitalForm.riskMode
                }
                onChange={(event) =>
                  setCapitalForm(
                    (current) => ({
                      ...current,
                      riskMode:
                        event.target
                          .value,
                    })
                  )
                }
                style={styles.input}
              >
                <option value="percentage">
                  Pourcentage
                </option>

                <option value="fixed">
                  Montant fixe
                </option>
              </select>
            </div>

            {capitalForm.riskMode ===
            "percentage" ? (
              <div>
                <label
                  style={styles.label}
                >
                  Risque %
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={
                    capitalForm.riskPercent
                  }
                  onChange={(event) =>
                    setCapitalForm(
                      (current) => ({
                        ...current,
                        riskPercent:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={styles.input}
                  placeholder="1"
                />
              </div>
            ) : (
              <div>
                <label
                  style={styles.label}
                >
                  Risque fixe $
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={
                    capitalForm.riskAmount
                  }
                  onChange={(event) =>
                    setCapitalForm(
                      (current) => ({
                        ...current,
                        riskAmount:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={styles.input}
                  placeholder="20"
                />
              </div>
            )}
          </div>

          <div
            style={{
              ...styles.card,
              marginTop: "18px",
              background:
                "#020617",
            }}
          >
            <div
              style={styles.grid2}
            >
              <CapitalInfoRow
                label="Risque actuel"
                value={formatMoney(
                  previewRisk
                )}
              />

              <CapitalInfoRow
                label="Risque %"
                value={formatPercent(
                  previewRiskPercent
                )}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            <button
              style={styles.button}
              onClick={() =>
                setCapitalModalOpen(
                  false
                )
              }
            >
              Annuler
            </button>

            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={
                saveCapital
              }
            >
              <Check size={14} />
              {editingCapitalId
                ? "Enregistrer"
                : "Créer le capital"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     TRADE MODAL
  ======================================================= */

  function TradeModal() {
    if (!tradeModalOpen) {
      return null;
    }

    return (
      <div
        style={
          styles.modalOverlay
        }
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            setTradeModalOpen(
              false
            );
          }
        }}
      >
        <div
          style={{
            ...styles.modal,
            width: "min(1050px, 100%)",
          }}
        >
          <div
            style={
              styles.modalHeader
            }
          >
            <div>
              <h2
                style={
                  styles.modalTitle
                }
              >
                Nouveau trade
              </h2>

              <p
                style={
                  styles.sectionSubtitle
                }
              >
                Le lot et le TP sont calculés
                automatiquement.
              </p>
            </div>

            <button
              style={
                styles.closeButton
              }
              onClick={() =>
                setTradeModalOpen(
                  false
                )
              }
            >
              <X size={16} />
            </button>
          </div>

          <FormSectionTitle
            title="Contexte"
          />

          <div
            style={
              styles.formGrid3
            }
          >
            <FormField
              label="Capital"
              input={
                <select
                  value={
                    tradeForm.capitalId
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        capitalId:
                          event.target
                            .value,
                        rr:
                          capitals.find(
                            (
                              capital
                            ) =>
                              capital.id ===
                              event.target
                                .value
                          )?.defaultRR ||
                          "2",
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  <option value="">
                    Sélectionner
                  </option>

                  {activeCapitals.map(
                    (capital) => (
                      <option
                        key={
                          capital.id
                        }
                        value={
                          capital.id
                        }
                      >
                        {
                          capital.name
                        }
                      </option>
                    )
                  )}
                </select>
              }
            />

            <FormField
              label="Actif"
              input={
                <select
                  value={
                    tradeForm.asset
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        asset:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
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
              }
            />

            <FormField
              label="Date / heure"
              input={
                <input
                  type="datetime-local"
                  value={
                    tradeForm.dateTime
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        dateTime:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                />
              }
            />

            <FormField
              label="Session"
              input={
                <select
                  value={
                    tradeForm.session
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        session:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  {SESSIONS.map(
                    (session) => (
                      <option
                        key={session}
                        value={
                          session
                        }
                      >
                        {session}
                      </option>
                    )
                  )}
                </select>
              }
            />

            <FormField
              label="Direction"
              input={
                <select
                  value={
                    tradeForm.direction
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        direction:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  <option value="BUY">
                    BUY
                  </option>

                  <option value="SELL">
                    SELL
                  </option>
                </select>
              }
            />

            <FormField
              label="Timeframe"
              input={
                <select
                  value={
                    tradeForm.timeframe
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        timeframe:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  {TIMEFRAMES.map(
                    (timeframe) => (
                      <option
                        key={
                          timeframe
                        }
                        value={
                          timeframe
                        }
                      >
                        {
                          timeframe
                        }
                      </option>
                    )
                  )}
                </select>
              }
            />
          </div>

          <FormSectionTitle
            title="Plan du trade"
          />

          <div
            style={
              styles.formGrid3
            }
          >
            <FormField
              label="Entrée"
              input={
                <input
                  type="number"
                  step="any"
                  value={
                    tradeForm.entry
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        entry:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                  placeholder="Ex : 2000"
                />
              }
            />

            <FormField
              label="Stop Loss"
              input={
                <input
                  type="number"
                  step="any"
                  value={
                    tradeForm.stopLoss
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        stopLoss:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                  placeholder="Ex : 1998"
                />
              }
            />

            <FormField
              label="RR du trade"
              input={
                <select
                  value={
                    tradeForm.rr
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        rr:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  {RR_OPTIONS.map(
                    (rr) => (
                      <option
                        key={rr}
                        value={rr}
                      >
                        RR{rr}
                      </option>
                    )
                  )}
                </select>
              }
            />
          </div>

          <div
            style={{
              ...styles.grid4,
              marginTop: "13px",
            }}
          >
            <MetricCard
              label="Risque"
              value={formatMoney(
                tradeRisk
              )}
            />

            <MetricCard
              label="SL"
              value={`${formatNumber(
                tradeStopPips
              )} pips`}
            />

            <MetricCard
              label="Lot automatique"
              value={formatNumber(
                tradeLot
              )}
            />

            <MetricCard
              label={`TP — RR${tradeRR}`}
              value={
                tradeTP
                  ? formatNumber(
                      tradeTP,
                      tradeForm.asset ===
                        "XAUUSD" ||
                        tradeForm.asset ===
                          "USDJPY"
                        ? 2
                        : 5
                    )
                  : "-"
              }
            />
          </div>

          <FormSectionTitle
            title="Résultat"
          />

          <div
            style={
              styles.formGrid3
            }
          >
            <FormField
              label="Type de sortie"
              input={
                <select
                  value={
                    tradeForm.exitType
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        exitType:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  <option value="TP">
                    TP
                  </option>

                  <option value="SL">
                    SL
                  </option>

                  <option value="BE">
                    BE
                  </option>
                </select>
              }
            />

            {tradeForm.exitType ===
            "BE" ? (
              <FormField
                label="Prix réel de sortie"
                input={
                  <input
                    type="number"
                    step="any"
                    value={
                      tradeForm.exitPrice
                    }
                    onChange={(event) =>
                      setTradeForm(
                        (current) => ({
                          ...current,
                          exitPrice:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={
                      styles.input
                    }
                    placeholder="Prix réel"
                  />
                }
              />
            ) : (
              <FormField
                label="Prix de sortie"
                input={
                  <input
                    value={
                      tradeExitPrice
                        ? formatNumber(
                            tradeExitPrice,
                            tradeForm.asset ===
                              "XAUUSD" ||
                              tradeForm.asset ===
                                "USDJPY"
                              ? 2
                              : 5
                          )
                        : "-"
                    }
                    readOnly
                    style={
                      styles.input
                    }
                  />
                }
              />
            )}

            <FormField
              label="Frais"
              input={
                <input
                  type="number"
                  step="0.01"
                  value={
                    tradeForm.fees
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        fees:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                  placeholder="0"
                />
              }
            />

            <FormField
              label="Swap"
              input={
                <input
                  type="number"
                  step="0.01"
                  value={
                    tradeForm.swap
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        swap:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                  placeholder="0"
                />
              }
            />
          </div>

          <div
            style={{
              ...styles.grid4,
              marginTop: "13px",
            }}
          >
            <MetricCard
              label="Prix de sortie"
              value={
                tradeExitPrice
                  ? formatNumber(
                      tradeExitPrice,
                      tradeForm.asset ===
                        "XAUUSD" ||
                        tradeForm.asset ===
                          "USDJPY"
                        ? 2
                        : 5
                    )
                  : "-"
              }
            />

            <MetricCard
              label="Résultat pips"
              value={`${formatNumber(
                tradeResultPips
              )} pips`}
              valueColor={getResultColor(
                tradeResultPips
              )}
            />

            <MetricCard
              label="Résultat"
              value={formatMoney(
                tradeNetResult
              )}
              valueColor={getResultColor(
                tradeNetResult
              )}
            />

            <MetricCard
              label="Résultat R"
              value={`${formatNumber(
                tradeResultR
              )} R`}
              valueColor={getResultColor(
                tradeResultR
              )}
            />
          </div>

          <FormSectionTitle
            title="Analyse du trade"
          />

          <div
            style={
              styles.formGrid3
            }
          >
            <FormField
              label="Setup"
              input={
                <select
                  value={
                    tradeForm.setup
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        setup:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
                  {SETUPS.map(
                    (setup) => (
                      <option
                        key={setup}
                        value={
                          setup
                        }
                      >
                        {setup}
                      </option>
                    )
                  )}
                </select>
              }
            />

            <FormField
              label="Émotion"
              input={
                <input
                  value={
                    tradeForm.emotion
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        emotion:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                  placeholder="Ex : calme, FOMO..."
                />
              }
            />

            <FormField
              label="Respect du plan"
              input={
                <select
                  value={
                    tradeForm.planAdherence
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        planAdherence:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={
                    styles.input
                  }
                >
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
              }
            />
          </div>

          <div
            style={{
              marginTop: "13px",
              display: "grid",
              gap: "13px",
            }}
          >
            <FormField
              label="Raison d'entrée"
              input={
                <textarea
                  value={
                    tradeForm.entryReason
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        entryReason:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={{
                    ...styles.input,
                    minHeight:
                      "70px",
                    resize:
                      "vertical",
                  }}
                />
              }
            />

            <FormField
              label="Raison de sortie"
              input={
                <textarea
                  value={
                    tradeForm.exitReason
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        exitReason:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={{
                    ...styles.input,
                    minHeight:
                      "70px",
                    resize:
                      "vertical",
                  }}
                />
              }
            />

            <FormField
              label="Erreurs / fautes"
              input={
                <textarea
                  value={
                    tradeForm.mistakes
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        mistakes:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={{
                    ...styles.input,
                    minHeight:
                      "70px",
                    resize:
                      "vertical",
                  }}
                />
              }
            />

            <FormField
              label="Notes"
              input={
                <textarea
                  value={
                    tradeForm.notes
                  }
                  onChange={(event) =>
                    setTradeForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target
                            .value,
                      })
                    )
                  }
                  style={{
                    ...styles.input,
                    minHeight:
                      "90px",
                    resize:
                      "vertical",
                  }}
                />
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            <button
              style={styles.button}
              onClick={() =>
                setTradeModalOpen(
                  false
                )
              }
            >
              Annuler
            </button>

            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={
                saveTrade
              }
            >
              <Check size={14} />
              Enregistrer le trade
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     SIDEBAR
  ======================================================= */

  function Sidebar() {
    const items = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "journal",
        label: "Journal",
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
      {
        id: "settings",
        label: "Paramètres",
        icon: Settings,
      },
    ];

    return (
      <>
        {sidebarOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(2,6,23,.65)",
              zIndex: 39,
            }}
            onClick={() =>
              setSidebarOpen(false)
            }
          />
        )}

        <aside
          style={{
            ...styles.sidebar,
            position:
              window.innerWidth <=
              800
                ? "fixed"
                : "relative",
            left:
              window.innerWidth <=
              800
                ? sidebarOpen
                  ? 0
                  : "-270px"
                : 0,
            top: 0,
            bottom: 0,
            zIndex: 40,
            transition:
              "left .2s ease",
            height:
              window.innerWidth <=
              800
                ? "100vh"
                : "auto",
          }}
        >
          <div
            style={styles.logo}
          >
            <div
              style={
                styles.logoIcon
              }
            >
              <BarChart3
                size={21}
              />
            </div>

            <div>
              <div
                style={
                  styles.logoTitle
                }
              >
                Trading Journal
              </div>

              <div
                style={
                  styles.logoSubtitle
                }
              >
                ARCH
              </div>
            </div>
          </div>

          <nav style={styles.nav}>
            {items.map(
              (item) => {
                const Icon =
                  item.icon;

                const active =
                  activePage ===
                  item.id;

                return (
                  <button
                    key={
                      item.id
                    }
                    style={{
                      ...styles.navButton,
                      ...(active
                        ? styles.navButtonActive
                        : {}),
                    }}
                    onClick={() =>
                      navigate(
                        item.id
                      )
                    }
                  >
                    <Icon
                      size={17}
                    />

                    {item.label}
                  </button>
                );
              }
            )}
          </nav>

          <div
            style={{
              marginTop:
                "auto",
              padding:
                "15px 8px 0",
              borderTop:
                "1px solid #1e293b",
            }}
          >
            <div
              style={{
                color:
                  "#475569",
                fontSize:
                  "10px",
                lineHeight: 1.5,
              }}
            >
              Données locales
              <br />
              Trading Journal v1.0
            </div>
          </div>
        </aside>
      </>
    );
  }

  /* =======================================================
     TOPBAR
  ======================================================= */

  function Topbar() {
    const titles = {
      dashboard:
        "Dashboard",
      journal:
        "Journal",
      capitals:
        "Capitaux",
      calendar:
        "Calendrier",
      calculator:
        "Calculateur",
      settings:
        "Paramètres",
    };

    return (
      <header
        style={
          styles.topbar
        }
      >
        <div
          style={
            styles.topbarLeft
          }
        >
          <button
            style={{
              ...styles.button,
              padding: "7px",
            }}
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
          >
            <Menu size={16} />
          </button>

          <span
            style={
              styles.topbarTitle
            }
          >
            {titles[
              activePage
            ]}
          </span>
        </div>

        <span
          style={
            styles.topbarStatus
          }
        >
          ● Données locales
        </span>
      </header>
    );
  }

  return (
    <div style={styles.app}>
      <Sidebar />

      <main
        style={styles.main}
      >
        <Topbar />

        <div
          style={styles.content}
        >
          {renderPage()}
        </div>
      </main>

      {notification && (
        <div
          style={{
            ...styles.notification,
            borderColor:
              notification.type ===
              "error"
                ? "#7f1d1d"
                : "#14532d",
          }}
        >
          {notification.message}
        </div>
      )}

      <CapitalModal />
      <TradeModal />
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function PageTitle({
  title,
  subtitle,
  action,
}) {
  return (
    <div
      style={
        styles.pageTitle
      }
    >
      <div>
        <h1
          style={
            styles.pageTitleText
          }
        >
          {title}
        </h1>

        <p
          style={
            styles.pageSubtitle
          }
        >
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueColor,
}) {
  return (
    <div
      style={
        styles.metricCard
      }
    >
      <div
        style={
          styles.metricLabel
        }
      >
        {label}
      </div>

      <div
        style={{
          ...styles.metricValue,
          color:
            valueColor ||
            "#f8fafc",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CapitalInfoRow({
  label,
  value,
  valueColor,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: "12px",
        alignItems:
          "center",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: "11px",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          fontSize: "12px",
          color:
            valueColor ||
            "#cbd5e1",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  text,
  action,
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "45px 20px",
        color: "#64748b",
      }}
    >
      <CircleDollarSign
        size={35}
        style={{
          marginBottom:
            "10px",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          fontSize: "13px",
          marginBottom:
            action
              ? "14px"
              : 0,
        }}
      >
        {text}
      </div>

      {action}
    </div>
  );
}

function FormField({
  label,
  input,
}) {
  return (
    <div>
      <label
        style={
          styles.label
        }
      >
        {label}
      </label>

      {input}
    </div>
  );
}

function FormSectionTitle({
  title,
}) {
  return (
    <div
      style={{
        marginTop: "22px",
        marginBottom:
          "12px",
        paddingBottom:
          "8px",
        borderBottom:
          "1px solid #1e293b",
      }}
    >
      <h3
        style={{
          ...styles.sectionTitle,
          fontSize: "14px",
        }}
      >
        {title}
      </h3>
    </div>
  );
}

function StatsTable({
  title,
  subtitle,
  rows,
}) {
  return (
    <div style={styles.card}>
      <div
        style={
          styles.sectionHeader
        }
      >
        <div>
          <h3
            style={
              styles.sectionTitle
            }
          >
            {title}
          </h3>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            {subtitle}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          text="Pas encore de données."
        />
      ) : (
        <div
          style={
            styles.tableWrapper
          }
        >
          <table
            style={styles.table}
          >
            <thead>
              <tr>
                <th
                  style={
                    styles.th
                  }
                >
                  Groupe
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Trades
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Win
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Loss
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  BE
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Win Rate
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  Avg R
                </th>

                <th
                  style={
                    styles.th
                  }
                >
                  P&L
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row) => (
                  <tr
                    key={
                      row.name
                    }
                  >
                    <td
                      style={
                        styles.td
                      }
                    >
                      <strong>
                        {row.name}
                      </strong>
                    </td>

                    <td
                      style={
                        styles.td
                      }
                    >
                      {row.trades}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          "#22c55e",
                      }}
                    >
                      {row.wins}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          "#ef4444",
                      }}
                    >
                      {row.losses}
                    </td>

                    <td
                      style={
                        styles.td
                      }
                    >
                      {
                        row.breakeven
                      }
                    </td>

                    <td
                      style={
                        styles.td
                      }
                    >
                      {formatPercent(
                        row.winRate
                      )}
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          getResultColor(
                            row.avgR
                          ),
                      }}
                    >
                      {formatNumber(
                        row.avgR
                      )}{" "}
                      R
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          getResultColor(
                            row.totalPnl
                          ),
                        fontWeight:
                          800,
                      }}
                    >
                      {formatMoney(
                        row.totalPnl
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RRTable({
  title,
  rows,
}) {
  return (
    <div
      style={{
        ...styles.card,
        marginTop: "20px",
      }}
    >
      <div
        style={
          styles.sectionHeader
        }
      >
        <div>
          <h3
            style={
              styles.sectionTitle
            }
          >
            {title}
          </h3>

          <p
            style={
              styles.sectionSubtitle
            }
          >
            Comparaison de la performance
            selon le RR utilisé sur les trades.
          </p>
        </div>
      </div>

      <div
        style={
          styles.tableWrapper
        }
      >
        <table
          style={styles.table}
        >
          <thead>
            <tr>
              <th
                style={
                  styles.th
                }
              >
                RR
              </th>

              <th
                style={
                  styles.th
                }
              >
                Trades
              </th>

              <th
                style={
                  styles.th
                }
              >
                Win
              </th>

              <th
                style={
                  styles.th
                }
              >
                Loss
              </th>

              <th
                style={
                  styles.th
                }
              >
                BE
              </th>

              <th
                style={
                  styles.th
                }
              >
                Win Rate
              </th>

              <th
                style={
                  styles.th
                }
              >
                Avg R
              </th>

              <th
                style={
                  styles.th
                }
              >
                P&L
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (row) => (
                <tr
                  key={
                    row.rr
                  }
                >
                  <td
                    style={
                      styles.td
                    }
                  >
                    <strong>
                      RR{row.rr}
                    </strong>
                  </td>

                  <td
                    style={
                      styles.td
                    }
                  >
                    {row.trades}
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color:
                        "#22c55e",
                    }}
                  >
                    {row.wins}
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color:
                        "#ef4444",
                    }}
                  >
                    {row.losses}
                  </td>

                  <td
                    style={
                      styles.td
                    }
                  >
                    {
                      row.breakeven
                    }
                  </td>

                  <td
                    style={
                      styles.td
                    }
                  >
                    {formatPercent(
                      row.winRate
                    )}
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color:
                        getResultColor(
                          row.avgR
                        ),
                    }}
                  >
                    {formatNumber(
                      row.avgR
                    )}{" "}
                    R
                  </td>

                  <td
                    style={{
                      ...styles.td,
                      color:
                        getResultColor(
                          row.totalPnl
                        ),
                      fontWeight:
                        800,
                    }}
                  >
                    {formatMoney(
                      row.totalPnl
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
