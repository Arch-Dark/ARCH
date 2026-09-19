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

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =====================================================
   STORAGE
===================================================== */

const CAPITALS_STORAGE_KEY =
  "trading-journal-capitals";

const TRADES_STORAGE_KEY =
  "trading-journal-trades";

/* =====================================================
   CONSTANTS
===================================================== */

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

/* =====================================================
   HELPERS
===================================================== */

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
  return `${(Number(value) || 0).toFixed(
    decimals
  )}%`;
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

  const timestamp =
    new Date(value).getTime();

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
  const currentPrice =
    Number(price);

  if (
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return 0;
  }

  if (asset === "XAUUSD") {
    return 1;
  }

  if (
    [
      "EURUSD",
      "GBPUSD",
      "AUDUSD",
      "NZDUSD",
    ].includes(asset)
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

function calculatePips(
  asset,
  priceDifference
) {
  return (
    Math.abs(
      Number(priceDifference) || 0
    ) *
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
    difference *
    getPipMultiplier(asset)
  );
}

function calculateStopPips(
  asset,
  entry,
  stopLoss
) {
  return calculatePips(
    asset,
    Number(entry) -
      Number(stopLoss)
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
  const riskDistance =
    Math.abs(e - sl);
  const ratio =
    Number(rr) || 1;

  if (
    !Number.isFinite(e) ||
    !Number.isFinite(sl) ||
    riskDistance <= 0
  ) {
    return 0;
  }

  if (direction === "BUY") {
    return (
      e +
      riskDistance * ratio
    );
  }

  return (
    e -
    riskDistance * ratio
  );
}

function calculateLot(
  riskMoney,
  stopPips,
  pipValuePerLot
) {
  const risk =
    Number(riskMoney) || 0;

  const pips =
    Number(stopPips) || 0;

  const pipValue =
    Number(pipValuePerLot) || 0;

  if (
    risk <= 0 ||
    pips <= 0 ||
    pipValue <= 0
  ) {
    return 0;
  }

  const rawLot =
    risk /
    (pips * pipValue);

  return (
    Math.floor(rawLot * 100) /
    100
  );
}

function getCapitalRisk(capital) {
  if (!capital) return 0;

  if (
    capital.riskMode ===
    "fixed"
  ) {
    return (
      Number(
        capital.riskAmount
      ) || 0
    );
  }

  const balance =
    Number(
      capital.currentBalance
    ) ||
    Number(
      capital.initialCapital
    ) ||
    0;

  const percentage =
    Number(
      capital.riskPercent
    ) || 0;

  return (
    balance *
    (percentage / 100)
  );
}

function getCapitalRiskPercent(
  capital
) {
  if (!capital) return 0;

  if (
    capital.riskMode ===
    "percentage"
  ) {
    return (
      Number(
        capital.riskPercent
      ) || 0
    );
  }

  const balance =
    Number(
      capital.currentBalance
    ) ||
    Number(
      capital.initialCapital
    ) ||
    0;

  const riskAmount =
    Number(
      capital.riskAmount
    ) || 0;

  if (balance <= 0) {
    return 0;
  }

  return (
    (riskAmount / balance) *
    100
  );
}

/*
  Important :
  certains anciens trades peuvent avoir pnl = 0
  alors que resultR et riskMoney sont corrects.

  On utilise donc :
  1. pnl enregistré lorsqu'il est non nul
  2. resultR × riskMoney pour les anciennes données
  3. grossPnl - fees + swap comme dernier fallback
*/
function getTradeNetPnl(trade) {
  const storedPnl =
    Number(trade?.pnl);

  if (
    Number.isFinite(
      storedPnl
    ) &&
    storedPnl !== 0
  ) {
    return storedPnl;
  }

  const resultR =
    Number(trade?.resultR);

  const riskMoney =
    Number(trade?.riskMoney);

  if (
    Number.isFinite(resultR) &&
    Number.isFinite(
      riskMoney
    ) &&
    riskMoney > 0 &&
    resultR !== 0
  ) {
    return (
      resultR * riskMoney
    );
  }

  const gross =
    Number(trade?.grossPnl);

  const fees =
    Number(trade?.fees) || 0;

  const swap =
    Number(trade?.swap) || 0;

  if (
    Number.isFinite(gross)
  ) {
    return (
      gross -
      fees +
      swap
    );
  }

  return Number.isFinite(
    storedPnl
  )
    ? storedPnl
    : 0;
}

function getTradeR(trade) {
  const stored =
    Number(trade?.resultR);

  if (
    Number.isFinite(stored)
  ) {
    return stored;
  }

  const pnl =
    getTradeNetPnl(trade);

  const risk =
    Number(trade?.riskMoney);

  if (
    Number.isFinite(risk) &&
    risk > 0
  ) {
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

function getResultColor(value) {
  if (value > 0)
    return "#22c55e";

  if (value < 0)
    return "#ef4444";

  return "#94a3b8";
}

function getResultClass(value) {
  if (value > 0)
    return "positive";

  if (value < 0)
    return "negative";

  return "neutral";
}

function isClosedTrade(trade) {
  return (
    trade &&
    String(
      trade.status || "closed"
    ).toLowerCase() ===
      "closed"
  );
}

function isSameDay(
  dateA,
  dateB
) {
  if (!dateA || !dateB)
    return false;

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
  const result =
    new Date(date);

  const day =
    result.getDay();

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

function isSameWeek(
  date,
  reference
) {
  if (
    !date ||
    !reference
  ) {
    return false;
  }

  const start =
    getStartOfWeek(
      reference
    );

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  return (
    date >= start &&
    date < end
  );
}

function isSameMonth(
  date,
  reference
) {
  if (
    !date ||
    !reference
  ) {
    return false;
  }

  return (
    date.getFullYear() ===
      reference.getFullYear() &&
    date.getMonth() ===
      reference.getMonth()
  );
}

/* =====================================================
   PERFORMANCE ENGINE
===================================================== */

function buildPerformanceStats(
  list,
  initialCapital
) {
  const trades = [...list].sort(
    (a, b) =>
      getTradeTimestamp(a) -
      getTradeTimestamp(b)
  );

  const wins =
    trades.filter(
      (trade) =>
        getTradeNetPnl(trade) >
        0
    ).length;

  const losses =
    trades.filter(
      (trade) =>
        getTradeNetPnl(trade) <
        0
    ).length;

  const breakEven =
    trades.filter(
      (trade) =>
        getTradeNetPnl(trade) ===
        0
    ).length;

  const grossProfit =
    trades.reduce(
      (sum, trade) => {
        const pnl =
          getTradeNetPnl(
            trade
          );

        return pnl > 0
          ? sum + pnl
          : sum;
      },
      0
    );

  const grossLoss =
    trades.reduce(
      (sum, trade) => {
        const pnl =
          getTradeNetPnl(
            trade
          );

        return pnl < 0
          ? sum + pnl
          : sum;
      },
      0
    );

  const totalPnl =
    trades.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(
          trade
        ),
      0
    );

  const totalR =
    trades.reduce(
      (sum, trade) =>
        sum +
        getTradeR(trade),
      0
    );

  const winRate =
    trades.length > 0
      ? (wins /
          trades.length) *
        100
      : 0;

  const profitFactor =
    grossLoss < 0
      ? grossProfit /
        Math.abs(grossLoss)
      : grossProfit > 0
      ? Infinity
      : 0;

  const avgWin =
    wins > 0
      ? grossProfit / wins
      : 0;

  const avgLoss =
    losses > 0
      ? grossLoss / losses
      : 0;

  const avgR =
    trades.length > 0
      ? totalR /
        trades.length
      : 0;

  const expectancyR =
    trades.length > 0
      ? totalR /
        trades.length
      : 0;

  let equity =
    Number(
      initialCapital
    ) || 0;

  let peak =
    equity;

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurve = [
    {
      index: 0,
      label: "Capital initial",
      equity,
    },
  ];

  trades.forEach(
    (trade, index) => {
      equity +=
        getTradeNetPnl(
          trade
        );

      if (
        equity > peak
      ) {
        peak = equity;
      }

      const drawdown =
        peak - equity;

      const drawdownPercent =
        peak > 0
          ? (drawdown /
              peak) *
            100
          : 0;

      if (
        drawdown >
        maxDrawdown
      ) {
        maxDrawdown =
          drawdown;
      }

      if (
        drawdownPercent >
        maxDrawdownPercent
      ) {
        maxDrawdownPercent =
          drawdownPercent;
      }

      equityCurve.push({
        index:
          index + 1,
        label:
          formatDate(
            trade.dateTime ||
              trade.createdAt
          ),
        equity,
      });
    }
  );

  let currentWinStreak = 0;
  let currentLossStreak = 0;

  let bestWinStreak = 0;
  let bestLossStreak = 0;

  trades.forEach(
    (trade) => {
      const pnl =
        getTradeNetPnl(
          trade
        );

      if (pnl > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;

        bestWinStreak =
          Math.max(
            bestWinStreak,
            currentWinStreak
          );
      } else if (
        pnl < 0
      ) {
        currentLossStreak += 1;
        currentWinStreak = 0;

        bestLossStreak =
          Math.max(
            bestLossStreak,
            currentLossStreak
          );
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    }
  );

  const now =
    new Date();

  const pnlToday =
    trades
      .filter(
        (trade) =>
          isSameDay(
            getTradeDate(
              trade
            ),
            now
          )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(
            trade
          ),
        0
      );

  const pnlWeek =
    trades
      .filter(
        (trade) =>
          isSameWeek(
            getTradeDate(
              trade
            ),
            now
          )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(
            trade
          ),
        0
      );

  const pnlMonth =
    trades
      .filter(
        (trade) =>
          isSameMonth(
            getTradeDate(
              trade
            ),
            now
          )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(
            trade
          ),
        0
      );

  const pnlPercent =
    Number(initialCapital) >
    0
      ? (totalPnl /
          Number(
            initialCapital
          )) *
        100
      : 0;

  return {
    trades,
    wins,
    losses,
    breakEven,
    grossProfit,
    grossLoss,
    totalPnl,
    totalR,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgR,
    expectancyR,
    equity,
    equityCurve,
    maxDrawdown,
    maxDrawdownPercent,
    bestWinStreak,
    bestLossStreak,
    pnlToday,
    pnlWeek,
    pnlMonth,
    pnlPercent,
  };
}

function buildGroupedStats(
  list,
  field,
  labelFallback = "-"
) {
  const groups = {};

  list.forEach(
    (trade) => {
      const label =
        trade?.[field] ||
        labelFallback;

      if (!groups[label]) {
        groups[label] = {
          label,
          trades: 0,
          wins: 0,
          losses: 0,
          be: 0,
          pnl: 0,
          r: 0,
        };
      }

      const pnl =
        getTradeNetPnl(
          trade
        );

      const r =
        getTradeR(trade);

      groups[label].trades +=
        1;

      groups[label].pnl +=
        pnl;

      groups[label].r +=
        r;

      if (pnl > 0) {
        groups[label].wins +=
          1;
      } else if (
        pnl < 0
      ) {
        groups[label].losses +=
          1;
      } else {
        groups[label].be +=
          1;
      }
    }
  );

  return Object.values(
    groups
  )
    .map((item) => ({
      ...item,
      avgR:
        item.trades > 0
          ? item.r /
            item.trades
          : 0,
      winRate:
        item.trades > 0
          ? (item.wins /
              item.trades) *
            100
          : 0,
    }))
    .sort(
      (a, b) =>
        b.pnl - a.pnl
    );
}

/* =====================================================
   STYLES
===================================================== */

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
    width: "235px",
    minWidth: "235px",
    background: "#07101f",
    borderRight:
      "1px solid #172033",
    padding: "18px 12px",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    zIndex: 110,
  },

  mobileOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,0.65)",
    zIndex: 105,
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  topbar: {
    height: "68px",
    borderBottom:
      "1px solid #172033",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    padding: "0 22px",
    background:
      "rgba(2,6,23,0.92)",
    position: "sticky",
    top: 0,
    zIndex: 80,
    backdropFilter:
      "blur(14px)",
  },

  content: {
    padding: "22px",
    maxWidth: "1700px",
    margin: "0 auto",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding:
      "2px 8px 18px",
    fontWeight: 850,
    letterSpacing:
      "0.08em",
  },

  logoIcon: {
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    background:
      "rgba(96,165,250,0.12)",
    color: "#60a5fa",
    border:
      "1px solid rgba(96,165,250,0.2)",
    borderRadius: "9px",
  },

  nav: {
    display: "grid",
    gap: "5px",
  },

  navButton: {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    color: "#94a3b8",
    borderRadius: "9px",
    padding: "10px 11px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 650,
  },

  navButtonActive: {
    background:
      "rgba(96,165,250,0.1)",
    border:
      "1px solid rgba(96,165,250,0.16)",
    color: "#dbeafe",
  },

  card: {
    background:
      "linear-gradient(145deg,#0b1220,#08101d)",
    border:
      "1px solid #1b293c",
    borderRadius: "12px",
    padding: "17px",
    boxShadow:
      "0 10px 35px rgba(0,0,0,0.14)",
  },

  grid4: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "10px",
    marginBottom: "10px",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "12px",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "12px",
  },

  metricCard: {
    background:
      "rgba(15,23,42,0.75)",
    border:
      "1px solid #1e293b",
    borderRadius: "10px",
    padding: "13px",
    minWidth: 0,
  },

  metricLabel: {
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 750,
    textTransform:
      "uppercase",
    letterSpacing:
      "0.08em",
  },

  metricValue: {
    marginTop: "7px",
    fontSize: "20px",
    fontWeight: 850,
    overflow: "hidden",
    textOverflow:
      "ellipsis",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 800,
  },

  sectionSubtitle: {
    color: "#64748b",
    fontSize: "11px",
    marginTop: "4px",
    lineHeight: 1.5,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "12px",
    marginBottom: "14px",
  },

  button: {
    border:
      "1px solid #263449",
    background: "#0f172a",
    color: "#cbd5e1",
    borderRadius: "8px",
    padding: "9px 12px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent:
      "center",
    gap: "7px",
    fontSize: "11px",
    fontWeight: 700,
  },

  primaryButton: {
    background:
      "#2563eb",
    border:
      "1px solid #3b82f6",
    color: "#fff",
  },

  dangerButton: {
    background:
      "rgba(239,68,68,0.08)",
    border:
      "1px solid rgba(239,68,68,0.2)",
    color: "#f87171",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#08111f",
    border:
      "1px solid #263449",
    color: "#e2e8f0",
    borderRadius: "8px",
    padding: "9px 10px",
    outline: "none",
    fontSize: "12px",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 700,
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "700px",
  },

  th: {
    textAlign: "left",
    padding: "10px",
    borderBottom:
      "1px solid #263449",
    color: "#64748b",
    fontSize: "9px",
    fontWeight: 750,
    whiteSpace: "nowrap",
  },

  td: {
    padding: "10px",
    borderBottom:
      "1px solid #172033",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "4px 7px",
    fontSize: "9px",
    fontWeight: 750,
  },
};

/* =====================================================
   MAIN APP
===================================================== */

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

  /* =====================================================
     PERSISTENCE
  ===================================================== */

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
    if (!notification)
      return;

    const timer =
      setTimeout(() => {
        setNotification(null);
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notification]);

  /* =====================================================
     CAPITALS
  ===================================================== */

  const activeCapitals =
    useMemo(
      () =>
        capitals.filter(
          (capital) =>
            capital.status !==
            "archived"
        ),
      [capitals]
    );

  const archivedCapitals =
    useMemo(
      () =>
        capitals.filter(
          (capital) =>
            capital.status ===
            "archived"
        ),
      [capitals]
    );

  const selectedDashboardCapital =
    useMemo(
      () =>
        capitals.find(
          (capital) =>
            capital.id ===
            dashboardCapitalFilter
        ) || null,
      [
        capitals,
        dashboardCapitalFilter,
      ]
    );

  useEffect(() => {
    if (!capitals.length) {
      if (
        dashboardCapitalFilter !==
        ""
      ) {
        setDashboardCapitalFilter(
          ""
        );
      }

      return;
    }

    const exists =
      capitals.some(
        (capital) =>
          capital.id ===
          dashboardCapitalFilter
      );

    if (!exists) {
      const preferred =
        activeCapitals[0] ||
        capitals[0];

      setDashboardCapitalFilter(
        preferred.id
      );
    }
  }, [
    capitals,
    activeCapitals,
    dashboardCapitalFilter,
  ]);

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
      name:
        capital.name || "",
      initialCapital:
        String(
          capital.initialCapital ??
            ""
        ),
      currentBalance:
        String(
          capital.currentBalance ??
            ""
        ),
      riskMode:
        capital.riskMode ||
        "percentage",
      riskPercent:
        String(
          capital.riskPercent ??
            "1"
        ),
      riskAmount:
        String(
          capital.riskAmount ??
            ""
        ),
      defaultRR:
        String(
          capital.defaultRR ??
            "2"
        ),
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

    const current =
      Number(
        capitalForm.currentBalance
      );

    if (!name) {
      showNotification(
        "Le nom du capital est obligatoire.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(
        initial
      ) ||
      initial <= 0
    ) {
      showNotification(
        "Le capital initial doit être supérieur à 0.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(
        current
      ) ||
      current < 0
    ) {
      showNotification(
        "La balance actuelle est invalide.",
        "error"
      );
      return;
    }

    if (
      capitalForm.riskMode ===
      "percentage"
    ) {
      const riskPercent =
        Number(
          capitalForm.riskPercent
        );

      if (
        !Number.isFinite(
          riskPercent
        ) ||
        riskPercent <= 0
      ) {
        showNotification(
          "Le risque en pourcentage doit être supérieur à 0.",
          "error"
        );
        return;
      }
    } else {
      const riskAmount =
        Number(
          capitalForm.riskAmount
        );

      if (
        !Number.isFinite(
          riskAmount
        ) ||
        riskAmount <= 0
      ) {
        showNotification(
          "Le risque fixe doit être supérieur à 0.",
          "error"
        );
        return;
      }
    }

    const capitalData = {
      name,
      initialCapital:
        initial,
      currentBalance:
        current,
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
    };

    if (editingCapitalId) {
      setCapitals(
        (previous) =>
          previous.map(
            (capital) =>
              capital.id ===
              editingCapitalId
                ? {
                    ...capital,
                    ...capitalData,
                  }
                : capital
          )
      );

      showNotification(
        "Capital modifié."
      );
    } else {
      const newCapital = {
        id: createId("capital"),
        ...capitalData,
        status: "active",
        createdAt:
          new Date().toISOString(),
      };

      setCapitals(
        (previous) => [
          ...previous,
          newCapital,
        ]
      );

      if (
        !dashboardCapitalFilter
      ) {
        setDashboardCapitalFilter(
          newCapital.id
        );
      }

      showNotification(
        "Capital créé."
      );
    }

    setCapitalModalOpen(false);
  }

  function archiveCapital(
    capitalId
  ) {
    setCapitals(
      (previous) =>
        previous.map(
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
      (previous) =>
        previous.map(
          (capital) =>
            capital.id ===
            capitalId
              ? {
                  ...capital,
                  status:
                    "active",
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
    const hasTrades =
      trades.some(
        (trade) =>
          trade.capitalId ===
          capitalId
      );

    if (hasTrades) {
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
      (previous) =>
        previous.filter(
          (capital) =>
            capital.id !==
            capitalId
        )
    );

    showNotification(
      "Capital supprimé."
    );
  }

  /* =====================================================
     TRADE FORM CALCULATIONS
  ===================================================== */

  const selectedTradeCapital =
    useMemo(
      () =>
        capitals.find(
          (capital) =>
            capital.id ===
            tradeForm.capitalId
        ) || null,
      [
        capitals,
        tradeForm.capitalId,
      ]
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
    Number(
      tradeForm.entry
    );

  const tradeSL =
    Number(
      tradeForm.stopLoss
    );

  const tradeRR =
    Number(
      tradeForm.rr
    ) || 1;

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

  const tradeExitPrice =
    tradeForm.exitType ===
    "TP"
      ? tradeTP
      : tradeForm.exitType ===
        "SL"
      ? tradeSL
      : Number(
          tradeForm.exitPrice
        );

  const tradeResultPips =
    calculateDirectionalPips(
      tradeForm.asset,
      tradeForm.direction,
      tradeEntry,
      tradeExitPrice
    );

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

  function openNewTradeModal() {
    const defaultCapital =
      activeCapitals[0] ||
      null;

    setTradeForm({
      capitalId:
        defaultCapital?.id ||
        "",
      asset: "XAUUSD",
      dateTime:
        new Date(
          Date.now() -
            new Date().getTimezoneOffset() *
              60000
        )
          .toISOString()
          .slice(0, 16),
      session: "New York",
      direction: "BUY",
      timeframe: "M15",
      entry: "",
      stopLoss: "",
      rr:
        String(
          defaultCapital?.defaultRR ||
            2
        ),
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
      !selectedTradeCapital
    ) {
      showNotification(
        "Le capital sélectionné est introuvable.",
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
        "L'Entry est invalide.",
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
        "Le Stop Loss est invalide.",
        "error"
      );
      return;
    }

    if (
      tradeStopPips <= 0
    ) {
      showNotification(
        "Le Stop Loss doit être différent de l'Entry.",
        "error"
      );
      return;
    }

    if (
      tradeLot <= 0
    ) {
      showNotification(
        "Le lot calculé est nul. Vérifie le risque et le Stop Loss.",
        "error"
      );
      return;
    }

    if (
      tradeForm.exitType ===
        "BE" &&
      (!Number.isFinite(
        tradeExitPrice
      ) ||
        tradeExitPrice <= 0)
    ) {
      showNotification(
        "Entre le prix réel de sortie du BE.",
        "error"
      );
      return;
    }

    const newTrade = {
      id: createId("trade"),
      capitalId:
        tradeForm.capitalId,
      asset:
        tradeForm.asset,
      dateTime:
        tradeForm.dateTime ||
        new Date().toISOString(),
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
        tradeNetResult,
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
      status:
        "closed",
      createdAt:
        new Date().toISOString(),
      capitalRiskSnapshot:
        tradeRisk,
    };

    setTrades(
      (previous) => [
        ...previous,
        newTrade,
      ]
    );

    setCapitals(
      (previous) =>
        previous.map(
          (capital) =>
            capital.id ===
            tradeForm.capitalId
              ? {
                  ...capital,
                  currentBalance:
                    Number(
                      capital.currentBalance
                    ) +
                    tradeNetResult,
                }
              : capital
        )
    );

    setTradeModalOpen(false);

    showNotification(
      `Trade enregistré : ${formatMoney(
        tradeNetResult
      )}`
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
        "Supprimer ce trade ? La balance du capital sera recalculée en retirant son résultat."
      )
    ) {
      return;
    }

    const pnl =
      getTradeNetPnl(
        trade
      );

    setCapitals(
      (previous) =>
        previous.map(
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
      (previous) =>
        previous.filter(
          (item) =>
            item.id !==
            tradeId
        )
    );

    showNotification(
      "Trade supprimé."
    );
  }

  /* =====================================================
     DASHBOARD DATA
  ===================================================== */

  const selectedCapitalTrades =
    useMemo(
      () =>
        trades.filter(
          (trade) =>
            isClosedTrade(
              trade
            ) &&
            trade.capitalId ===
              dashboardCapitalFilter
        ),
      [
        trades,
        dashboardCapitalFilter,
      ]
    );

  const globalTrades =
    useMemo(
      () =>
        trades.filter(
          isClosedTrade
        ),
      [trades]
    );

  const selectedInitialCapital =
    Number(
      selectedDashboardCapital?.initialCapital
    ) || 0;

  const selectedCurrentBalance =
    Number(
      selectedDashboardCapital?.currentBalance
    ) || 0;

  const globalInitialCapital =
    capitals.reduce(
      (sum, capital) =>
        sum +
        (Number(
          capital.initialCapital
        ) || 0),
      0
    );

  const globalCurrentBalance =
    capitals.reduce(
      (sum, capital) =>
        sum +
        (Number(
          capital.currentBalance
        ) || 0),
      0
    );

  const dashboardStats =
    useMemo(
      () =>
        buildPerformanceStats(
          selectedCapitalTrades,
          selectedInitialCapital
        ),
      [
        selectedCapitalTrades,
        selectedInitialCapital,
      ]
    );

  const globalStats =
    useMemo(
      () =>
        buildPerformanceStats(
          globalTrades,
          globalInitialCapital
        ),
      [
        globalTrades,
        globalInitialCapital,
      ]
    );

  const selectedAssetStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "asset"
        ),
      [selectedCapitalTrades]
    );

  const selectedSetupStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "setup"
        ),
      [selectedCapitalTrades]
    );

  const selectedSessionStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "session"
        ),
      [selectedCapitalTrades]
    );

  const selectedTimeframeStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "timeframe"
        ),
      [selectedCapitalTrades]
    );

  const selectedDirectionStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "direction"
        ),
      [selectedCapitalTrades]
    );

  const selectedExitStats =
    useMemo(
      () =>
        buildGroupedStats(
          selectedCapitalTrades,
          "exitType"
        ),
      [selectedCapitalTrades]
    );

  const globalAssetStats =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "asset"
        ),
      [globalTrades]
    );

  const globalSetupStats =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "setup"
        ),
      [globalTrades]
    );

  const globalSessionStats =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "session"
        ),
      [globalTrades]
    );

  const globalTimeframeStats =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "timeframe"
        ),
      [globalTrades]
    );

  const globalDirectionStats =
    useMemo(
      () =>
        buildGroupedStats(
          globalTrades,
          "direction"
        ),
      [globalTrades]
    );

  const globalExitStats =
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
        RR_OPTIONS.map(
          (rr) => {
            const rrTrades =
              globalTrades.filter(
                (trade) =>
                  Number(
                    trade.rr
                  ) === rr
              );

            const wins =
              rrTrades.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) > 0
              ).length;

            const losses =
              rrTrades.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) < 0
              ).length;

            const be =
              rrTrades.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) === 0
              ).length;

            const pnl =
              rrTrades.reduce(
                (sum, trade) =>
                  sum +
                  getTradeNetPnl(
                    trade
                  ),
                0
              );

            const r =
              rrTrades.reduce(
                (sum, trade) =>
                  sum +
                  getTradeR(
                    trade
                  ),
                0
              );

            return {
              label:
                `RR${rr}`,
              trades:
                rrTrades.length,
              wins,
              losses,
              be,
              pnl,
              winRate:
                rrTrades.length
                  ? (wins /
                      rrTrades.length) *
                    100
                  : 0,
              avgR:
                rrTrades.length
                  ? r /
                    rrTrades.length
                  : 0,
            };
          }
        ),
      [globalTrades]
    );

  /* =====================================================
     JOURNAL
  ===================================================== */

  const visibleTrades =
    useMemo(
      () =>
        trades
          .filter(
            isClosedTrade
          )
          .filter(
            (trade) =>
              tradeCapitalFilter ===
                "all" ||
              trade.capitalId ===
                tradeCapitalFilter
          )
          .sort(
            (a, b) =>
              getTradeTimestamp(
                b
              ) -
              getTradeTimestamp(
                a
              )
          ),
      [
        trades,
        tradeCapitalFilter,
      ]
    );

  /* =====================================================
     PAGE TITLE
  ===================================================== */

  function PageTitle({
    title,
    subtitle,
    action,
  }) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-end",
          gap: "12px",
          marginBottom:
            "18px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "25px",
              fontWeight: 850,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              color:
                "#64748b",
              fontSize: "12px",
              marginTop:
                "5px",
            }}
          >
            {subtitle}
          </div>
        </div>

        {action}
      </div>
    );
  }

  function MetricCard({
    label,
    value,
    secondary,
    color,
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
              color ||
              "#f8fafc",
          }}
        >
          {value}
        </div>

        {secondary && (
          <div
            style={{
              marginTop:
                "5px",
              color:
                "#64748b",
              fontSize:
                "9px",
            }}
          >
            {secondary}
          </div>
        )}
      </div>
    );
  }

  function StatsTable({
    title,
    subtitle,
    rows,
    firstColumn = "Catégorie",
  }) {
    return (
      <div
        style={
          styles.card
        }
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

            <div
              style={
                styles.sectionSubtitle
              }
            >
              {subtitle}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "11px",
              padding:
                "20px 0",
              textAlign:
                "center",
            }}
          >
            Aucune donnée.
          </div>
        ) : (
          <div
            style={
              styles.tableWrapper
            }
          >
            <table
              style={
                styles.table
              }
            >
              <thead>
                <tr>
                  <th
                    style={
                      styles.th
                    }
                  >
                    {firstColumn}
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
                        row.label
                      }
                    >
                      <td
                        style={{
                          ...styles.td,
                          fontWeight:
                            750,
                        }}
                      >
                        {row.label}
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
                            "#4ade80",
                        }}
                      >
                        {row.wins}
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color:
                            "#f87171",
                        }}
                      >
                        {row.losses}
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color:
                            "#94a3b8",
                        }}
                      >
                        {row.be}
                      </td>

                      <td
                        style={
                          styles.td
                        }
                      >
                        {row.winRate.toFixed(
                          1
                        )}
                        %
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
                        {row.avgR >=
                        0
                          ? "+"
                          : ""}
                        {row.avgR.toFixed(
                          2
                        )}{" "}
                        R
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color:
                            getResultColor(
                              row.pnl
                            ),
                          fontWeight:
                            800,
                        }}
                      >
                        {row.pnl >
                        0
                          ? "+"
                          : ""}
                        {formatMoney(
                          row.pnl
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

  /* =====================================================
     DASHBOARD
  ===================================================== */

  function PerformanceOverview({
    title,
    stats,
    initialCapital,
    currentBalance,
    global = false,
  }) {
    const balanceChange =
      currentBalance -
      initialCapital;

    return (
      <div
        style={{
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            marginBottom:
              "11px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize:
                "18px",
              fontWeight:
                850,
            }}
          >
            {title}
          </h2>

          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "11px",
              marginTop:
                "4px",
            }}
          >
            {global
              ? "Performance consolidée de tous les capitaux actifs et archivés."
              : "Performance du capital sélectionné uniquement."}
          </div>
        </div>

        <div
          style={
            styles.grid4
          }
        >
          <MetricCard
            label={
              global
                ? "Capital initial global"
                : "Capital initial"
            }
            value={formatMoney(
              initialCapital
            )}
          />

          <MetricCard
            label={
              global
                ? "Balance globale"
                : "Balance actuelle"
            }
            value={formatMoney(
              currentBalance
            )}
            secondary={`${balanceChange >= 0 ? "+" : ""}${formatMoney(
              balanceChange
            )} depuis le capital initial`}
            color={getResultColor(
              balanceChange
            )}
          />

          <MetricCard
            label="P&L total"
            value={formatMoney(
              stats.totalPnl
            )}
            secondary={formatPercent(
              stats.pnlPercent
            )}
            color={getResultColor(
              stats.totalPnl
            )}
          />

          <MetricCard
            label="Trades"
            value={String(
              stats.trades.length
            )}
            secondary={`${stats.wins} W · ${stats.losses} L · ${stats.breakEven} BE`}
          />
        </div>

        <div
          style={
            styles.grid4
          }
        >
          <MetricCard
            label="Win Rate"
            value={formatPercent(
              stats.winRate,
              1
            )}
          />

          <MetricCard
            label="Profit Factor"
            value={
              stats.profitFactor ===
              Infinity
                ? "∞"
                : stats.profitFactor.toFixed(
                    2
                  )
            }
            secondary={`Gain brut ${formatMoney(
              stats.grossProfit
            )}`}
          />

          <MetricCard
            label="Expectancy"
            value={`${stats.expectancyR.toFixed(
              2
            )} R`}
            color={getResultColor(
              stats.expectancyR
            )}
          />

          <MetricCard
            label="Avg R"
            value={`${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(
              2
            )} R`}
            color={getResultColor(
              stats.avgR
            )}
          />
        </div>

        <div
          style={
            styles.grid4
          }
        >
          <MetricCard
            label="P&L aujourd'hui"
            value={formatMoney(
              stats.pnlToday
            )}
            color={getResultColor(
              stats.pnlToday
            )}
          />

          <MetricCard
            label="P&L semaine"
            value={formatMoney(
              stats.pnlWeek
            )}
            color={getResultColor(
              stats.pnlWeek
            )}
          />

          <MetricCard
            label="P&L mois"
            value={formatMoney(
              stats.pnlMonth
            )}
            color={getResultColor(
              stats.pnlMonth
            )}
          />

          <MetricCard
            label="Séries"
            value={`${stats.bestWinStreak} W / ${stats.bestLossStreak} L`}
            secondary="meilleures séries"
          />
        </div>

        <div
          style={
            styles.grid4
          }
        >
          <MetricCard
            label="Gain moyen"
            value={formatMoney(
              stats.avgWin
            )}
            color="#22c55e"
          />

          <MetricCard
            label="Perte moyenne"
            value={formatMoney(
              stats.avgLoss
            )}
            color="#ef4444"
          />

          <MetricCard
            label="Max Drawdown"
            value={formatMoney(
              stats.maxDrawdown
            )}
            secondary={formatPercent(
              stats.maxDrawdownPercent
            )}
            color="#ef4444"
          />

          <MetricCard
            label="R cumulé"
            value={`${stats.totalR >= 0 ? "+" : ""}${stats.totalR.toFixed(
              2
            )} R`}
            color={getResultColor(
              stats.totalR
            )}
          />
        </div>
      </div>
    );
  }

  function EquityCurve({
    stats,
    title,
  }) {
    return (
      <div
        style={{
          ...styles.card,
          marginBottom:
            "16px",
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

            <div
              style={
                styles.sectionSubtitle
              }
            >
              Évolution de l'equity à partir du capital initial.
            </div>
          </div>
        </div>

        <div
          style={{
            height: "300px",
          }}
        >
          {stats.equityCurve
            .length <= 1 ? (
            <div
              style={{
                height:
                  "100%",
                display:
                  "grid",
                placeItems:
                  "center",
                color:
                  "#64748b",
                fontSize:
                  "11px",
              }}
            >
              Aucun trade clôturé.
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={
                  stats.equityCurve
                }
              >
                <defs>
                  <linearGradient
                    id={`equity-${title
                      .replace(
                        /\s/g,
                        "-"
                      )
                      .toLowerCase()}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#3b82f6"
                      stopOpacity={
                        0.4
                      }
                    />

                    <stop
                      offset="100%"
                      stopColor="#3b82f6"
                      stopOpacity={
                        0
                      }
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="index"
                  stroke="#64748b"
                  fontSize={9}
                />

                <YAxis
                  stroke="#64748b"
                  fontSize={9}
                  tickFormatter={(
                    value
                  ) =>
                    `$${Number(
                      value
                    ).toFixed(0)}`
                  }
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0f172a",
                    border:
                      "1px solid #334155",
                    borderRadius:
                      "8px",
                    fontSize:
                      "10px",
                  }}
                  formatter={(
                    value
                  ) => [
                    formatMoney(
                      value
                    ),
                    "Equity",
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#60a5fa"
                  fill={`url(#equity-${title
                    .replace(
                      /\s/g,
                      "-"
                    )
                    .toLowerCase()})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }

  function RRTable({
    rows,
    title,
  }) {
    return (
      <div
        style={
          styles.card
        }
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

            <div
              style={
                styles.sectionSubtitle
              }
            >
              Performance selon le RR choisi sur chaque trade.
            </div>
          </div>
        </div>

        <div
          style={
            styles.tableWrapper
          }
        >
          <table
            style={
              styles.table
            }
          >
            <thead>
              <tr>
                {[
                  "RR",
                  "Trades",
                  "Win",
                  "Loss",
                  "BE",
                  "Win Rate",
                  "Avg R",
                  "P&L",
                ].map(
                  (heading) => (
                    <th
                      key={
                        heading
                      }
                      style={
                        styles.th
                      }
                    >
                      {
                        heading
                      }
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row) => (
                  <tr
                    key={
                      row.label
                    }
                  >
                    <td
                      style={{
                        ...styles.td,
                        fontWeight:
                          800,
                      }}
                    >
                      {
                        row.label
                      }
                    </td>

                    <td
                      style={
                        styles.td
                      }
                    >
                      {
                        row.trades
                      }
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          "#4ade80",
                      }}
                    >
                      {
                        row.wins
                      }
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          "#f87171",
                      }}
                    >
                      {
                        row.losses
                      }
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          "#94a3b8",
                      }}
                    >
                      {
                        row.be
                      }
                    </td>

                    <td
                      style={
                        styles.td
                      }
                    >
                      {row.winRate.toFixed(
                        1
                      )}
                      %
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
                      {row.avgR >=
                      0
                        ? "+"
                        : ""}
                      {row.avgR.toFixed(
                        2
                      )}{" "}
                      R
                    </td>

                    <td
                      style={{
                        ...styles.td,
                        color:
                          getResultColor(
                            row.pnl
                          ),
                        fontWeight:
                          800,
                      }}
                    >
                      {row.pnl >
                      0
                        ? "+"
                        : ""}
                      {formatMoney(
                        row.pnl
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

  function DashboardPage() {
    return (
      <>
        <PageTitle
          title="Dashboard"
          subtitle="Vue détaillée du capital sélectionné et performance globale"
          action={
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                }}
              >
                Capital analysé
              </span>

              <select
                value={
                  dashboardCapitalFilter
                }
                onChange={(
                  event
                ) =>
                  setDashboardCapitalFilter(
                    event.target
                      .value
                  )
                }
                style={{
                  ...styles.input,
                  width:
                    "230px",
                }}
              >
                {capitals.length ===
                0 ? (
                  <option value="">
                    Aucun capital
                  </option>
                ) : (
                  capitals.map(
                    (
                      capital
                    ) => (
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
                        {capital.status ===
                        "archived"
                          ? " — Archivé"
                          : ""}
                      </option>
                    )
                  )
                )}
              </select>
            </div>
          }
        />

        {!selectedDashboardCapital ? (
          <div
            style={{
              ...styles.card,
              textAlign:
                "center",
              padding:
                "60px 20px",
              marginBottom:
                "20px",
            }}
          >
            <WalletCards
              size={45}
              color="#60a5fa"
            />

            <h3
              style={{
                marginTop:
                  "14px",
              }}
            >
              Aucun capital
            </h3>

            <p
              style={{
                color:
                  "#64748b",
                fontSize:
                  "12px",
              }}
            >
              Crée ton premier capital pour commencer à enregistrer tes performances.
            </p>

            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                marginTop:
                  "8px",
              }}
              onClick={
                openNewCapitalModal
              }
            >
              <Plus size={15} />
              Créer un capital
            </button>
          </div>
        ) : (
          <>
            <PerformanceOverview
              title={`Capital sélectionné : ${selectedDashboardCapital.name}`}
              stats={
                dashboardStats
              }
              initialCapital={
                selectedInitialCapital
              }
              currentBalance={
                selectedCurrentBalance
              }
            />

            <EquityCurve
              stats={
                dashboardStats
              }
              title={`Equity — ${selectedDashboardCapital.name}`}
            />

            <div
              style={
                styles.grid2
              }
            >
              <StatsTable
                title="Performance par actif"
                subtitle="Résultats du capital sélectionné."
                rows={
                  selectedAssetStats
                }
                firstColumn="Actif"
              />

              <StatsTable
                title="Performance par setup"
                subtitle="Résultats du capital sélectionné."
                rows={
                  selectedSetupStats
                }
                firstColumn="Setup"
              />
            </div>

            <div
              style={
                styles.grid2
              }
            >
              <StatsTable
                title="Performance par session"
                subtitle="Résultats du capital sélectionné."
                rows={
                  selectedSessionStats
                }
                firstColumn="Session"
              />

              <StatsTable
                title="Performance par timeframe"
                subtitle="Résultats du capital sélectionné."
                rows={
                  selectedTimeframeStats
                }
                firstColumn="Timeframe"
              />
            </div>

            <div
              style={
                styles.grid2
              }
            >
              <StatsTable
                title="Performance par direction"
                subtitle="BUY vs SELL."
                rows={
                  selectedDirectionStats
                }
                firstColumn="Direction"
              />

              <StatsTable
                title="Performance par sortie"
                subtitle="TP, SL et BE."
                rows={
                  selectedExitStats
                }
                firstColumn="Sortie"
              />
            </div>
          </>
        )}

        {/* =================================================
            GLOBAL PERFORMANCE
        ================================================= */}

        <div
          style={{
            marginTop:
              "28px",
            paddingTop:
              "22px",
            borderTop:
              "1px solid #1e293b",
          }}
        >
          <PerformanceOverview
            title="Performance globale"
            stats={globalStats}
            initialCapital={
              globalInitialCapital
            }
            currentBalance={
              globalCurrentBalance
            }
            global
          />

          <EquityCurve
            stats={
              globalStats
            }
            title="Equity — Performance globale"
          />

          <div
            style={
              styles.grid2
            }
          >
            <StatsTable
              title="Global — Actifs"
              subtitle="Tous les capitaux confondus."
              rows={
                globalAssetStats
              }
              firstColumn="Actif"
            />

            <StatsTable
              title="Global — Setups"
              subtitle="Tous les capitaux confondus."
              rows={
                globalSetupStats
              }
              firstColumn="Setup"
            />
          </div>

          <div
            style={
              styles.grid2
            }
          >
            <StatsTable
              title="Global — Sessions"
              subtitle="Tous les capitaux confondus."
              rows={
                globalSessionStats
              }
              firstColumn="Session"
            />

            <StatsTable
              title="Global — Timeframes"
              subtitle="Tous les capitaux confondus."
              rows={
                globalTimeframeStats
              }
              firstColumn="Timeframe"
            />
          </div>

          <div
            style={
              styles.grid2
            }
          >
            <StatsTable
              title="Global — Direction"
              subtitle="BUY vs SELL."
              rows={
                globalDirectionStats
              }
              firstColumn="Direction"
            />

            <StatsTable
              title="Global — Sortie"
              subtitle="TP, SL et BE."
              rows={
                globalExitStats
              }
              firstColumn="Sortie"
            />
          </div>

          <RRTable
            rows={
              globalRRStats
            }
            title="Performance globale par RR"
          />
        </div>
      </>
    );
  }

  /* =====================================================
     CAPITALS PAGE
  ===================================================== */

  function CapitalsPage() {
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
            getTradeNetPnl(
              trade
            ),
          0
        );

      const risk =
        getCapitalRisk(
          capital
        );

      return (
        <div
          style={
            styles.card
          }
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: "10px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "16px",
                  fontWeight:
                    850,
                }}
              >
                {
                  capital.name
                }
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                }}
              >
                {capital.status ===
                "archived"
                  ? "Capital archivé"
                  : "Capital actif"}
                {" · "}
                {
                  capitalTrades.length
                }{" "}
                trade
                {capitalTrades.length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>

            <span
              style={{
                ...styles.badge,
                background:
                  capital.status ===
                  "archived"
                    ? "rgba(148,163,184,0.1)"
                    : "rgba(34,197,94,0.1)",
                color:
                  capital.status ===
                  "archived"
                    ? "#94a3b8"
                    : "#4ade80",
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
              display:
                "grid",
              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",
              gap: "8px",
              marginTop:
                "16px",
            }}
          >
            <MetricCard
              label="Balance"
              value={formatMoney(
                capital.currentBalance
              )}
            />

            <MetricCard
              label="Capital initial"
              value={formatMoney(
                capital.initialCapital
              )}
            />

            <MetricCard
              label="Risque / trade"
              value={formatMoney(
                risk
              )}
              secondary={formatPercent(
                getCapitalRiskPercent(
                  capital
                )
              )}
            />

            <MetricCard
              label="RR de base"
              value={`RR${capital.defaultRR}`}
              secondary="Recommandation uniquement"
            />

            <MetricCard
              label="P&L trades"
              value={formatMoney(
                pnl
              )}
              color={getResultColor(
                pnl
              )}
            />
          </div>

          <div
            style={{
              display:
                "flex",
              gap: "7px",
              flexWrap:
                "wrap",
              marginTop:
                "14px",
            }}
          >
            <button
              style={
                styles.button
              }
              onClick={() =>
                openEditCapitalModal(
                  capital
                )
              }
            >
              <Pencil size={14} />
              Modifier
            </button>

            {capital.status ===
            "archived" ? (
              <button
                style={
                  styles.button
                }
                onClick={() =>
                  restoreCapital(
                    capital.id
                  )
                }
              >
                <RotateCcw
                  size={14}
                />
                Restaurer
              </button>
            ) : (
              <button
                style={
                  styles.button
                }
                onClick={() =>
                  archiveCapital(
                    capital.id
                  )
                }
              >
                <Archive
                  size={14}
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
              <Trash2
                size={14}
              />
              Supprimer
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <PageTitle
          title="Capitaux"
          subtitle="Gestion des capitaux actifs et archivés"
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

        <div
          style={{
            ...styles.card,
            marginBottom:
              "14px",
            color:
              "#94a3b8",
            fontSize:
              "11px",
            lineHeight:
              1.7,
          }}
        >
          <strong
            style={{
              color:
                "#cbd5e1",
            }}
          >
            RR de base :
          </strong>{" "}
          il sert de recommandation
          lors de la création d'un
          trade. Chaque trade peut
          ensuite utiliser
          indépendamment RR1 à RR10.
        </div>

        <h2
          style={{
            fontSize:
              "14px",
            margin:
              "0 0 10px",
          }}
        >
          Capitaux actifs
        </h2>

        {activeCapitals.length ===
        0 ? (
          <div
            style={{
              ...styles.card,
              marginBottom:
                "20px",
              color:
                "#64748b",
              fontSize:
                "11px",
            }}
          >
            Aucun capital actif.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(290px,1fr))",
              gap: "12px",
              marginBottom:
                "24px",
            }}
          >
            {activeCapitals.map(
              (capital) => (
                <CapitalCard
                  key={
                    capital.id
                  }
                  capital={
                    capital
                  }
                />
              )
            )}
          </div>
        )}

        <h2
          style={{
            fontSize:
              "14px",
            margin:
              "0 0 10px",
          }}
        >
          Capitaux archivés
        </h2>

        {archivedCapitals.length ===
        0 ? (
          <div
            style={{
              ...styles.card,
              color:
                "#64748b",
              fontSize:
                "11px",
            }}
          >
            Aucun capital archivé.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(290px,1fr))",
              gap: "12px",
            }}
          >
            {archivedCapitals.map(
              (capital) => (
                <CapitalCard
                  key={
                    capital.id
                  }
                  capital={
                    capital
                  }
                />
              )
            )}
          </div>
        )}
      </>
    );
  }

  /* =====================================================
     JOURNAL
  ===================================================== */

  function JournalPage() {
    return (
      <>
        <PageTitle
          title="Journal des trades"
          subtitle="Historique détaillé de tous tes trades"
          action={
            <div
              style={{
                display:
                  "flex",
                gap: "8px",
                flexWrap:
                  "wrap",
              }}
            >
              <select
                style={{
                  ...styles.input,
                  width:
                    "210px",
                }}
                value={
                  tradeCapitalFilter
                }
                onChange={(
                  event
                ) =>
                  setTradeCapitalFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="all">
                  Tous les capitaux
                </option>

                {capitals.map(
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

              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                }}
                onClick={
                  openNewTradeModal
                }
                disabled={
                  activeCapitals.length ===
                  0
                }
              >
                <Plus size={15} />
                Nouveau trade
              </button>
            </div>
          }
        />

        <div
          style={
            styles.card
          }
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
                Historique
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                {visibleTrades.length}{" "}
                trade
                {visibleTrades.length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>
          </div>

          {visibleTrades.length ===
          0 ? (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "50px 20px",
                color:
                  "#64748b",
                fontSize:
                  "12px",
              }}
            >
              Aucun trade enregistré.
            </div>
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
              <table
                style={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Capital",
                      "Actif",
                      "Dir.",
                      "Entrée",
                      "SL",
                      "TP",
                      "RR",
                      "Sortie",
                      "Lot",
                      "Résultat",
                      "R",
                      "",
                    ].map(
                      (heading, index) => (
                        <th
                          key={`${heading}-${index}`}
                          style={
                            styles.th
                          }
                        >
                          {
                            heading
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {visibleTrades.map(
                    (trade) => {
                      const capital =
                        capitals.find(
                          (
                            item
                          ) =>
                            item.id ===
                            trade.capitalId
                        );

                      const pnl =
                        getTradeNetPnl(
                          trade
                        );

                      const r =
                        getTradeR(
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
                            style={{
                              ...styles.td,
                              fontWeight:
                                750,
                            }}
                          >
                            {
                              trade.asset
                            }
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                trade.direction ===
                                "BUY"
                                  ? "#60a5fa"
                                  : "#f59e0b",
                              fontWeight:
                                800,
                            }}
                          >
                            {
                              trade.direction
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.entry,
                              5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.stopLoss,
                              5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.tp,
                              5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            RR
                            {
                              trade.rr
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.exitPrice,
                              5
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatNumber(
                              trade.lot,
                              2
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                getResultColor(
                                  pnl
                                ),
                              fontWeight:
                                800,
                            }}
                          >
                            {pnl >
                            0
                              ? "+"
                              : ""}
                            {formatMoney(
                              pnl
                            )}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                getResultColor(
                                  r
                                ),
                              fontWeight:
                                800,
                            }}
                          >
                            {r >=
                            0
                              ? "+"
                              : ""}
                            {r.toFixed(
                              2
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            <button
                              style={{
                                ...styles.button,
                                ...styles.dangerButton,
                                padding:
                                  "6px",
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

  /* =====================================================
     CALENDAR
  ===================================================== */

  function CalendarPage() {
    const today =
      new Date();

    const [calendarMonth, setCalendarMonth] =
      useState(
        today.getMonth()
      );

    const [calendarYear, setCalendarYear] =
      useState(
        today.getFullYear()
      );

    const monthStats =
      useMemo(() => {
        const monthTrades =
          globalTrades.filter(
            (trade) => {
              const date =
                getTradeDate(
                  trade
                );

              return (
                date &&
                date.getFullYear() ===
                  calendarYear &&
                date.getMonth() ===
                  calendarMonth
              );
            }
          );

        const dailyMap = {};

        monthTrades.forEach(
          (trade) => {
            const date =
              getTradeDate(
                trade
              );

            if (!date) return;

            const key =
              `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(
                2,
                "0"
              )}-${String(
                date.getDate()
              ).padStart(
                2,
                "0"
              )}`;

            if (
              !dailyMap[key]
            ) {
              dailyMap[key] = {
                date: key,
                pnl: 0,
                trades: 0,
                wins: 0,
                losses: 0,
                breakevens: 0,
                r: 0,
              };
            }

            const pnl =
              getTradeNetPnl(
                trade
              );

            const r =
              getTradeR(
                trade
              );

            dailyMap[key].pnl +=
              pnl;

            dailyMap[key].r +=
              r;

            dailyMap[key].trades +=
              1;

            if (pnl > 0) {
              dailyMap[key]
                .wins += 1;
            } else if (
              pnl < 0
            ) {
              dailyMap[key]
                .losses += 1;
            } else {
              dailyMap[key]
                .breakevens += 1;
            }
          }
        );

        const values =
          Object.values(
            dailyMap
          );

        const wins =
          monthTrades.filter(
            (trade) =>
              getTradeNetPnl(
                trade
              ) > 0
          ).length;

        const losses =
          monthTrades.filter(
            (trade) =>
              getTradeNetPnl(
                trade
              ) < 0
          ).length;

        const breakevens =
          monthTrades.filter(
            (trade) =>
              getTradeNetPnl(
                trade
              ) === 0
          ).length;

        const totalPnL =
          monthTrades.reduce(
            (sum, trade) =>
              sum +
              getTradeNetPnl(
                trade
              ),
            0
          );

        const totalR =
          monthTrades.reduce(
            (sum, trade) =>
              sum +
              getTradeR(
                trade
              ),
            0
          );

        let bestDay = null;
        let worstDay = null;

        values.forEach(
          (day) => {
            if (
              !bestDay ||
              day.pnl >
                bestDay.pnl
            ) {
              bestDay = day;
            }

            if (
              !worstDay ||
              day.pnl <
                worstDay.pnl
            ) {
              worstDay = day;
            }
          }
        );

        return {
          trades:
            monthTrades,
          dailyMap,
          totalPnL,
          totalR,
          wins,
          losses,
          breakevens,
          winRate:
            monthTrades.length
              ? (wins /
                  monthTrades.length) *
                100
              : 0,
          bestDay,
          worstDay,
        };
      }, [
        globalTrades,
        calendarMonth,
        calendarYear,
      ]);

    const calendarDays =
      useMemo(() => {
        const firstDay =
          new Date(
            calendarYear,
            calendarMonth,
            1
          );

        const daysInMonth =
          new Date(
            calendarYear,
            calendarMonth + 1,
            0
          ).getDate();

        const startingDay =
          (firstDay.getDay() +
            6) %
          7;

        const cells = [];

        for (
          let i = 0;
          i < startingDay;
          i += 1
        ) {
          cells.push(null);
        }

        for (
          let day = 1;
          day <=
          daysInMonth;
          day += 1
        ) {
          const key =
            `${calendarYear}-${String(
              calendarMonth + 1
            ).padStart(
              2,
              "0"
            )}-${String(
              day
            ).padStart(
              2,
              "0"
            )}`;

          cells.push({
            day,
            key,
            stats:
              monthStats
                .dailyMap[
                key
              ] || null,
          });
        }

        return cells;
      }, [
        calendarYear,
        calendarMonth,
        monthStats.dailyMap,
      ]);

    const monthName =
      new Date(
        calendarYear,
        calendarMonth,
        1
      ).toLocaleDateString(
        "fr-FR",
        {
          month: "long",
          year: "numeric",
        }
      );

    function previousMonth() {
      if (
        calendarMonth ===
        0
      ) {
        setCalendarMonth(
          11
        );
        setCalendarYear(
          (year) =>
            year - 1
        );
      } else {
        setCalendarMonth(
          (month) =>
            month - 1
        );
      }
    }

    function nextMonth() {
      if (
        calendarMonth ===
        11
      ) {
        setCalendarMonth(
          0
        );
        setCalendarYear(
          (year) =>
            year + 1
        );
      } else {
        setCalendarMonth(
          (month) =>
            month + 1
        );
      }
    }

    function currentMonth() {
      const now =
        new Date();

      setCalendarMonth(
        now.getMonth()
      );

      setCalendarYear(
        now.getFullYear()
      );
    }

    function dayBackground(
      stats
    ) {
      if (!stats)
        return "#0f172a";

      if (stats.pnl > 0)
        return "rgba(34,197,94,0.12)";

      if (stats.pnl < 0)
        return "rgba(239,68,68,0.12)";

      return "rgba(148,163,184,0.08)";
    }

    return (
      <>
        <PageTitle
          title="Calendrier"
          subtitle="Vue quotidienne et mensuelle de la performance globale"
        />

        <div
          style={{
            ...styles.card,
            marginBottom:
              "14px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "10px",
              flexWrap:
                "wrap",
            }}
          >
            <button
              style={
                styles.button
              }
              onClick={
                previousMonth
              }
            >
              ← Mois précédent
            </button>

            <div
              style={{
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize:
                    "18px",
                  fontWeight:
                    850,
                  textTransform:
                    "capitalize",
                }}
              >
                {monthName}
              </div>

              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                  marginTop:
                    "4px",
                }}
              >
                {
                  monthStats
                    .trades
                    .length
                }{" "}
                trade
                {monthStats
                  .trades
                  .length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>

            <button
              style={
                styles.button
              }
              onClick={
                nextMonth
              }
            >
              Mois suivant →
            </button>
          </div>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              marginTop:
                "10px",
            }}
          >
            <button
              style={
                styles.button
              }
              onClick={
                currentMonth
              }
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(5,minmax(0,1fr))",
            gap: "10px",
            marginBottom:
              "14px",
          }}
        >
          <MetricCard
            label="P&L du mois"
            value={formatMoney(
              monthStats.totalPnL
            )}
            color={getResultColor(
              monthStats.totalPnL
            )}
          />

          <MetricCard
            label="Résultat R"
            value={`${monthStats.totalR >= 0 ? "+" : ""}${monthStats.totalR.toFixed(
              2
            )} R`}
            color={getResultColor(
              monthStats.totalR
            )}
          />

          <MetricCard
            label="Win Rate"
            value={`${monthStats.winRate.toFixed(
              1
            )}%`}
          />

          <MetricCard
            label="Trades"
            value={String(
              monthStats.trades
                .length
            )}
            secondary={`${monthStats.wins} W · ${monthStats.losses} L · ${monthStats.breakevens} BE`}
          />

          <MetricCard
            label="Jours tradés"
            value={String(
              Object.keys(
                monthStats.dailyMap
              ).length
            )}
          />
        </div>

        <div
          style={{
            ...styles.card,
            marginBottom:
              "14px",
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
                Performance quotidienne
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                P&L, R et nombre de trades pour chaque journée.
              </div>
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(7,minmax(0,1fr))",
              gap: "5px",
              marginBottom:
                "5px",
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
            ].map(
              (day) => (
                <div
                  key={day}
                  style={{
                    textAlign:
                      "center",
                    color:
                      "#64748b",
                    fontSize:
                      "9px",
                    fontWeight:
                      750,
                    padding:
                      "7px 2px",
                  }}
                >
                  {day}
                </div>
              )
            )}
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(7,minmax(0,1fr))",
              gap: "5px",
            }}
          >
            {calendarDays.map(
              (
                cell,
                index
              ) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={{
                        minHeight:
                          "92px",
                      }}
                    />
                  );
                }

                const stats =
                  cell.stats;

                const isToday =
                  cell.day ===
                    today.getDate() &&
                  calendarMonth ===
                    today.getMonth() &&
                  calendarYear ===
                    today.getFullYear();

                return (
                  <div
                    key={
                      cell.key
                    }
                    style={{
                      minHeight:
                        "92px",
                      padding:
                        "8px",
                      border:
                        `1px solid ${
                          isToday
                            ? "#60a5fa"
                            : stats
                            ? stats.pnl >
                              0
                              ? "rgba(34,197,94,0.3)"
                              : stats.pnl <
                                0
                              ? "rgba(239,68,68,0.3)"
                              : "#334155"
                            : "#1e293b"
                        }`,
                      borderRadius:
                        "8px",
                      background:
                        dayBackground(
                          stats
                        ),
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "10px",
                          fontWeight:
                            800,
                          color:
                            isToday
                              ? "#60a5fa"
                              : "#cbd5e1",
                        }}
                      >
                        {
                          cell.day
                        }
                      </span>

                      {stats && (
                        <span
                          style={{
                            fontSize:
                              "8px",
                            color:
                              "#64748b",
                          }}
                        >
                          {
                            stats.trades
                          }{" "}
                          T
                        </span>
                      )}
                    </div>

                    {stats ? (
                      <>
                        <div
                          style={{
                            marginTop:
                              "13px",
                            fontSize:
                              "12px",
                            fontWeight:
                              850,
                            color:
                              getResultColor(
                                stats.pnl
                              ),
                          }}
                        >
                          {stats.pnl >
                          0
                            ? "+"
                            : ""}
                          {formatMoney(
                            stats.pnl
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            fontSize:
                              "9px",
                            color:
                              "#94a3b8",
                          }}
                        >
                          {stats.r >=
                          0
                            ? "+"
                            : ""}
                          {stats.r.toFixed(
                            2
                          )}{" "}
                          R
                        </div>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            fontSize:
                              "8px",
                            color:
                              "#64748b",
                          }}
                        >
                          {stats.wins}W{" "}
                          {stats.losses}L{" "}
                          {stats.breakevens}BE
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            "22px",
                          color:
                            "#334155",
                          fontSize:
                            "8px",
                        }}
                      >
                        Aucun trade
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div
          style={{
            ...styles.grid2,
            marginBottom:
              "14px",
          }}
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={{
                color:
                  "#4ade80",
                fontSize:
                  "9px",
                fontWeight:
                  800,
                letterSpacing:
                  "0.08em",
              }}
            >
              MEILLEURE JOURNÉE
            </div>

            {monthStats.bestDay ? (
              <>
                <div
                  style={{
                    marginTop:
                      "7px",
                    fontSize:
                      "17px",
                    fontWeight:
                      850,
                  }}
                >
                  {new Date(
                    `${monthStats.bestDay.date}T12:00:00`
                  ).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "2-digit",
                      month:
                        "long",
                    }
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      "8px",
                    color:
                      "#4ade80",
                    fontSize:
                      "22px",
                    fontWeight:
                      850,
                  }}
                >
                  +
                  {formatMoney(
                    monthStats
                      .bestDay
                      .pnl
                  )}
                </div>

                <div
                  style={{
                    color:
                      "#64748b",
                    fontSize:
                      "10px",
                    marginTop:
                      "4px",
                  }}
                >
                  {
                    monthStats
                      .bestDay
                      .trades
                  }{" "}
                  trades ·{" "}
                  {monthStats.bestDay.r.toFixed(
                    2
                  )}{" "}
                  R
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop:
                    "12px",
                  color:
                    "#64748b",
                  fontSize:
                    "11px",
                }}
              >
                Aucune donnée.
              </div>
            )}
          </div>

          <div
            style={
              styles.card
            }
          >
            <div
              style={{
                color:
                  "#f87171",
                fontSize:
                  "9px",
                fontWeight:
                  800,
                letterSpacing:
                  "0.08em",
              }}
            >
              PIRE JOURNÉE
            </div>

            {monthStats.worstDay ? (
              <>
                <div
                  style={{
                    marginTop:
                      "7px",
                    fontSize:
                      "17px",
                    fontWeight:
                      850,
                  }}
                >
                  {new Date(
                    `${monthStats.worstDay.date}T12:00:00`
                  ).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "2-digit",
                      month:
                        "long",
                    }
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      "8px",
                    color:
                      "#f87171",
                    fontSize:
                      "22px",
                    fontWeight:
                      850,
                  }}
                >
                  {formatMoney(
                    monthStats
                      .worstDay
                      .pnl
                  )}
                </div>

                <div
                  style={{
                    color:
                      "#64748b",
                    fontSize:
                      "10px",
                    marginTop:
                      "4px",
                  }}
                >
                  {
                    monthStats
                      .worstDay
                      .trades
                  }{" "}
                  trades ·{" "}
                  {monthStats.worstDay.r.toFixed(
                    2
                  )}{" "}
                  R
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop:
                    "12px",
                  color:
                    "#64748b",
                  fontSize:
                    "11px",
                }}
              >
                Aucune donnée.
              </div>
            )}
          </div>
        </div>

        <div
          style={
            styles.card
          }
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
                Détail des journées
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                Toutes les journées avec au moins un trade clôturé.
              </div>
            </div>
          </div>

          {Object.values(
            monthStats.dailyMap
          ).length ===
          0 ? (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "30px",
                color:
                  "#64748b",
                fontSize:
                  "11px",
              }}
            >
              Aucun trade clôturé ce mois-ci.
            </div>
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
              <table
                style={
                  styles.table
                }
              >
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Trades",
                      "W",
                      "L",
                      "BE",
                      "P&L",
                      "R",
                    ].map(
                      (heading) => (
                        <th
                          key={
                            heading
                          }
                          style={
                            styles.th
                          }
                        >
                          {
                            heading
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {Object.values(
                    monthStats.dailyMap
                  )
                    .sort(
                      (a, b) =>
                        b.date.localeCompare(
                          a.date
                        )
                    )
                    .map(
                      (day) => (
                        <tr
                          key={
                            day.date
                          }
                        >
                          <td
                            style={
                              styles.td
                            }
                          >
                            {new Date(
                              `${day.date}T12:00:00`
                            ).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday:
                                  "short",
                                day: "2-digit",
                                month:
                                  "short",
                              }
                            )}
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
                                "#4ade80",
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
                                "#f87171",
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
                                "#94a3b8",
                            }}
                          >
                            {
                              day.breakevens
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
                            {day.pnl >
                            0
                              ? "+"
                              : ""}
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
                              fontWeight:
                                800,
                            }}
                          >
                            {day.r >=
                            0
                              ? "+"
                              : ""}
                            {day.r.toFixed(
                              2
                            )}{" "}
                            R
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  /* =====================================================
     CALCULATOR
  ===================================================== */

  function CalculatorPage() {
    const [calculatorCapitalId, setCalculatorCapitalId] =
      useState(
        activeCapitals[0]?.id ||
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
      capitals.find(
        (capital) =>
          capital.id ===
          calculatorCapitalId
      ) || null;

    const calculatorRisk =
      getCapitalRisk(
        calculatorCapital
      );

    const calculatorEntryNumber =
      Number(
        calculatorEntry
      );

    const calculatorSLNumber =
      Number(
        calculatorSL
      );

    const calculatorStopPips =
      calculateStopPips(
        calculatorAsset,
        calculatorEntryNumber,
        calculatorSLNumber
      );

    const calculatorPipValue =
      getPipValuePerLot(
        calculatorAsset,
        calculatorEntryNumber
      );

    const calculatorLot =
      calculateLot(
        calculatorRisk,
        calculatorStopPips,
        calculatorPipValue
      );

    return (
      <>
        <PageTitle
          title="Calculateur"
          subtitle="Calcul rapide du risque, lot, Stop Loss et Take Profit"
        />

        <div
          style={
            styles.grid2
          }
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "10px",
                marginBottom:
                  "18px",
              }}
            >
              <Calculator
                size={19}
                color="#60a5fa"
              />

              <h3
                style={
                  styles.sectionTitle
                }
              >
                Calculateur de position
              </h3>
            </div>

            <div
              style={{
                display:
                  "grid",
                gap: "13px",
              }}
            >
              <div>
                <label
                  style={
                    styles.label
                  }
                >
                  Capital
                </label>

                <select
                  style={
                    styles.input
                  }
                  value={
                    calculatorCapitalId
                  }
                  onChange={(
                    event
                  ) =>
                    setCalculatorCapitalId(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="">
                    Sélectionner
                  </option>

                  {capitals.map(
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
                        {capital.status ===
                        "archived"
                          ? " — Archivé"
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={
                  styles.grid2
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Actif
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      calculatorAsset
                    }
                    onChange={(
                      event
                    ) =>
                      setCalculatorAsset(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    {ASSETS.map(
                      (asset) => (
                        <option
                          key={
                            asset
                          }
                        >
                          {
                            asset
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Direction
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      calculatorDirection
                    }
                    onChange={(
                      event
                    ) =>
                      setCalculatorDirection(
                        event
                          .target
                          .value
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
                </div>
              </div>

              <div
                style={
                  styles.grid2
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Entry
                  </label>

                  <input
                    type="number"
                    step="any"
                    style={
                      styles.input
                    }
                    value={
                      calculatorEntry
                    }
                    onChange={(
                      event
                    ) =>
                      setCalculatorEntry(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="2000.00"
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Stop Loss
                  </label>

                  <input
                    type="number"
                    step="any"
                    style={
                      styles.input
                    }
                    value={
                      calculatorSL
                    }
                    onChange={(
                      event
                    ) =>
                      setCalculatorSL(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="1998.00"
                  />
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: "8px",
                }}
              >
                <MetricCard
                  label="Risque"
                  value={formatMoney(
                    calculatorRisk
                  )}
                  color="#fbbf24"
                />

                <MetricCard
                  label="SL"
                  value={`${calculatorStopPips.toFixed(
                    1
                  )} pips`}
                />

                <MetricCard
                  label="Valeur pip"
                  value={formatMoney(
                    calculatorPipValue
                  )}
                  secondary="/ pip / lot"
                />

                <MetricCard
                  label="Lot"
                  value={calculatorLot.toFixed(
                    2
                  )}
                  color="#60a5fa"
                />
              </div>
            </div>
          </div>

          <div
            style={
              styles.card
            }
          >
            <h3
              style={
                styles.sectionTitle
              }
            >
              Objectifs RR
            </h3>

            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "10px",
                marginTop:
                  "5px",
                marginBottom:
                  "13px",
              }}
            >
              Le calculateur affiche le TP correspondant à chaque RR sans modifier le capital.
            </div>

            <div
              style={
                styles.tableWrapper
              }
            >
              <table
                style={
                  styles.table
                }
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
                      Gain potentiel
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Résultat R
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {RR_OPTIONS.map(
                    (rr) => {
                      const tp =
                        calculateTP(
                          calculatorDirection,
                          calculatorEntryNumber,
                          calculatorSLNumber,
                          rr
                        );

                      const potential =
                        calculatorRisk *
                        rr;

                      return (
                        <tr
                          key={rr}
                        >
                          <td
                            style={{
                              ...styles.td,
                              fontWeight:
                                800,
                            }}
                          >
                            RR{rr}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {tp > 0
                              ? tp.toFixed(
                                  5
                                )
                              : "-"}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                "#4ade80",
                            }}
                          >
                            {calculatorRisk >
                            0
                              ? `+${formatMoney(
                                  potential
                                )}`
                              : "-"}
                          </td>

                          <td
                            style={{
                              ...styles.td,
                              color:
                                "#4ade80",
                            }}
                          >
                            +{rr.toFixed(
                              2
                            )} R
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            marginTop:
              "14px",
          }}
        >
          <h3
            style={
              styles.sectionTitle
            }
          >
            Formules utilisées
          </h3>

          <div
            style={{
              marginTop:
                "12px",
              color:
                "#94a3b8",
              fontSize:
                "11px",
              lineHeight:
                1.9,
            }}
          >
            <div>
              <strong>
                Lot
              </strong>{" "}
              = Risque / (SL pips × valeur pip)
            </div>

            <div>
              <strong>
                TP BUY
              </strong>{" "}
              = Entry + distance SL × RR
            </div>

            <div>
              <strong>
                TP SELL
              </strong>{" "}
              = Entry − distance SL × RR
            </div>

            <div>
              <strong>
                Résultat R
              </strong>{" "}
              = P&L / risque
            </div>

            <div>
              <strong>
                XAUUSD
              </strong>{" "}
              = variation du prix × 100 pips
            </div>

            <div>
              <strong>
                Forex classique
              </strong>{" "}
              = variation × 10 000
            </div>

            <div>
              <strong>
                JPY
              </strong>{" "}
              = variation × 100
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     SETTINGS
  ===================================================== */

  function SettingsPage() {
    function clearAllData() {
      if (
        !window.confirm(
          "ATTENTION : cette action supprimera tous les capitaux et tous les trades de ce navigateur. Continuer ?"
        )
      ) {
        return;
      }

      setCapitals([]);
      setTrades([]);
      setDashboardCapitalFilter("");

      showNotification(
        "Toutes les données ont été supprimées."
      );
    }

    return (
      <>
        <PageTitle
          title="Paramètres"
          subtitle="Configuration générale du journal"
        />

        <div
          style={
            styles.grid2
          }
        >
          <div
            style={
              styles.card
            }
          >
            <div
              style={{
                display:
                  "flex",
                gap: "12px",
                alignItems:
                  "center",
              }}
            >
              <Settings
                size={21}
                color="#60a5fa"
              />

              <div>
                <h3
                  style={
                    styles.sectionTitle
                  }
                >
                  Stockage
                </h3>

                <p
                  style={{
                    color:
                      "#64748b",
                    fontSize:
                      "11px",
                    lineHeight:
                      1.6,
                  }}
                >
                  Les capitaux et trades sont actuellement sauvegardés localement dans le navigateur avec localStorage.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop:
                  "15px",
                display:
                  "grid",
                gap: "8px",
              }}
            >
              <MetricCard
                label="Capitaux"
                value={String(
                  capitals.length
                )}
              />

              <MetricCard
                label="Trades"
                value={String(
                  trades.length
                )}
              />
            </div>
          </div>

          <div
            style={
              styles.card
            }
          >
            <h3
              style={
                styles.sectionTitle
              }
            >
              Zone dangereuse
            </h3>

            <p
              style={{
                color:
                  "#64748b",
                fontSize:
                  "11px",
                lineHeight:
                  1.6,
              }}
            >
              Supprimer toutes les données locales remettra le journal à zéro sur ce navigateur.
            </p>

            <button
              style={{
                ...styles.button,
                ...styles.dangerButton,
                marginTop:
                  "10px",
              }}
              onClick={
                clearAllData
              }
            >
              <Trash2 size={14} />
              Supprimer toutes les données
            </button>
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     CAPITAL MODAL
  ===================================================== */

  function CapitalModal() {
    if (
      !capitalModalOpen
    ) {
      return null;
    }

    const existingCapital =
      capitals.find(
        (item) =>
          item.id ===
          editingCapitalId
      );

    const previewCapital = {
      ...(existingCapital ||
        {}),
      initialCapital:
        Number(
          capitalForm.initialCapital
        ),
      currentBalance:
        Number(
          capitalForm.currentBalance
        ) ||
        Number(
          capitalForm.initialCapital
        ),
      riskMode:
        capitalForm.riskMode,
      riskPercent:
        Number(
          capitalForm.riskPercent
        ),
      riskAmount:
        Number(
          capitalForm.riskAmount
        ),
    };

    const previewRisk =
      getCapitalRisk(
        previewCapital
      );

    const previewPercent =
      getCapitalRiskPercent(
        previewCapital
      );

    return (
      <div
        style={{
          position:
            "fixed",
          inset: 0,
          background:
            "rgba(0,0,0,0.7)",
          zIndex: 100,
          display:
            "grid",
          placeItems:
            "center",
          padding:
            "20px",
        }}
        onMouseDown={() =>
          setCapitalModalOpen(
            false
          )
        }
      >
        <div
          style={{
            ...styles.card,
            width:
              "min(560px,100%)",
            maxHeight:
              "90vh",
            overflowY:
              "auto",
            boxShadow:
              "0 25px 80px rgba(0,0,0,0.45)",
          }}
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "20px",
                }}
              >
                {editingCapitalId
                  ? "Modifier le capital"
                  : "Nouveau capital"}
              </h2>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                Configure ton risque et ton RR de base.
              </div>
            </div>

            <button
              style={
                styles.button
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
            style={{
              display:
                "grid",
              gap: "14px",
            }}
          >
            <div>
              <label
                style={
                  styles.label
                }
              >
                Nom du capital
              </label>

              <input
                style={
                  styles.input
                }
                value={
                  capitalForm.name
                }
                onChange={(
                  event
                ) =>
                  setCapitalForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      name:
                        event
                          .target
                          .value,
                    })
                  )
                }
                placeholder="Ex : Compte principal"
              />
            </div>

            <div
              style={
                styles.grid2
              }
            >
              <div>
                <label
                  style={
                    styles.label
                  }
                >
                  Capital initial
                </label>

                <input
                  type="number"
                  step="0.01"
                  style={
                    styles.input
                  }
                  value={
                    capitalForm.initialCapital
                  }
                  onChange={(
                    event
                  ) =>
                    setCapitalForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        initialCapital:
                          event
                            .target
                            .value,
                        ...(editingCapitalId
                          ? {}
                          : {
                              currentBalance:
                                event
                                  .target
                                  .value,
                            }),
                      })
                    )
                  }
                />
              </div>

              <div>
                <label
                  style={
                    styles.label
                  }
                >
                  Balance actuelle
                </label>

                <input
                  type="number"
                  step="0.01"
                  style={
                    styles.input
                  }
                  value={
                    capitalForm.currentBalance
                  }
                  onChange={(
                    event
                  ) =>
                    setCapitalForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        currentBalance:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>
            </div>

            <div>
              <label
                style={
                  styles.label
                }
              >
                Mode de risque
              </label>

              <select
                style={
                  styles.input
                }
                value={
                  capitalForm.riskMode
                }
                onChange={(
                  event
                ) =>
                  setCapitalForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      riskMode:
                        event
                          .target
                          .value,
                    })
                  )
                }
              >
                <option value="percentage">
                  Pourcentage du solde
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
                  style={
                    styles.label
                  }
                >
                  Risque par trade (%)
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={
                    styles.input
                  }
                  value={
                    capitalForm.riskPercent
                  }
                  onChange={(
                    event
                  ) =>
                    setCapitalForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        riskPercent:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>
            ) : (
              <div>
                <label
                  style={
                    styles.label
                  }
                >
                  Risque fixe par trade ($)
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={
                    styles.input
                  }
                  value={
                    capitalForm.riskAmount
                  }
                  onChange={(
                    event
                  ) =>
                    setCapitalForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        riskAmount:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>
            )}

            <div>
              <label
                style={
                  styles.label
                }
              >
                Objectif RR de base
              </label>

              <select
                style={
                  styles.input
                }
                value={
                  capitalForm.defaultRR
                }
                onChange={(
                  event
                ) =>
                  setCapitalForm(
                    (
                      previous
                    ) => ({
                      ...previous,
                      defaultRR:
                        event
                          .target
                          .value,
                    })
                  )
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
            </div>

            <div
              style={{
                background:
                  "#0b1220",
                border:
                  "1px solid #1e293b",
                borderRadius:
                  "11px",
                padding:
                  "14px",
              }}
            >
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                  marginBottom:
                    "6px",
                }}
              >
                APERÇU DU RISQUE
              </div>

              <strong
                style={{
                  fontSize:
                    "22px",
                }}
              >
                {formatMoney(
                  previewRisk
                )}
              </strong>

              <span
                style={{
                  marginLeft:
                    "8px",
                  color:
                    "#94a3b8",
                  fontSize:
                    "11px",
                }}
              >
                (
                {previewPercent.toFixed(
                  2
                )}
                %)
              </span>

              <div
                style={{
                  marginTop:
                    "8px",
                  color:
                    "#64748b",
                  fontSize:
                    "10px",
                }}
              >
                RR de base : RR
                {
                  capitalForm.defaultRR
                }
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "8px",
              }}
            >
              <button
                style={
                  styles.button
                }
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
                <Check size={15} />
                {editingCapitalId
                  ? "Enregistrer"
                  : "Créer le capital"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     TRADE MODAL
  ===================================================== */

  function TradeModal() {
    if (!tradeModalOpen)
      return null;

    return (
      <div
        style={{
          position:
            "fixed",
          inset: 0,
          background:
            "rgba(0,0,0,0.72)",
          zIndex: 100,
          display:
            "grid",
          placeItems:
            "center",
          padding:
            "15px",
        }}
        onMouseDown={() =>
          setTradeModalOpen(
            false
          )
        }
      >
        <div
          style={{
            ...styles.card,
            width:
              "min(1050px,100%)",
            maxHeight:
              "94vh",
            overflowY:
              "auto",
          }}
          onMouseDown={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "21px",
                }}
              >
                Nouveau trade
              </h2>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                Le risque, le lot et le TP sont calculés automatiquement.
              </div>
            </div>

            <button
              style={
                styles.button
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

          <div
            style={{
              display:
                "grid",
              gap: "14px",
            }}
          >
            <div
              style={
                styles.card
              }
            >
              <h3
                style={{
                  ...styles.sectionTitle,
                  marginBottom:
                    "14px",
                }}
              >
                CONTEXTE DU TRADE
              </h3>

              <div
                style={
                  styles.grid3
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Capital
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.capitalId
                    }
                    onChange={(
                      event
                    ) => {
                      const capital =
                        capitals.find(
                          (
                            item
                          ) =>
                            item.id ===
                            event
                              .target
                              .value
                        );

                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          capitalId:
                            event
                              .target
                              .value,
                          rr:
                            String(
                              capital?.defaultRR ||
                                previous.rr
                            ),
                        })
                      );
                    }}
                  >
                    <option value="">
                      Sélectionner
                    </option>

                    {activeCapitals.map(
                      (
                        capital
                      ) => (
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
                    style={
                      styles.label
                    }
                  >
                    Actif
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.asset
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          asset:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    {ASSETS.map(
                      (asset) => (
                        <option
                          key={
                            asset
                          }
                        >
                          {
                            asset
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Date / heure
                  </label>

                  <input
                    type="datetime-local"
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.dateTime
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          dateTime:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Session
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.session
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          session:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    {SESSIONS.map(
                      (session) => (
                        <option
                          key={
                            session
                          }
                        >
                          {
                            session
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Direction
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.direction
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          direction:
                            event
                              .target
                              .value,
                        })
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
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Timeframe
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.timeframe
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          timeframe:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    {TIMEFRAMES.map(
                      (timeframe) => (
                        <option
                          key={
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
                </div>
              </div>
            </div>

            <div
              style={
                styles.card
              }
            >
              <h3
                style={{
                  ...styles.sectionTitle,
                  marginBottom:
                    "14px",
                }}
              >
                PLAN DU TRADE
              </h3>

              <div
                style={
                  styles.grid3
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Entry
                  </label>

                  <input
                    type="number"
                    step="any"
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.entry
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          entry:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Stop Loss
                  </label>

                  <input
                    type="number"
                    step="any"
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.stopLoss
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          stopLoss:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Objectif RR
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.rr
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          rr:
                            event
                              .target
                              .value,
                        })
                      )
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

                  {selectedTradeCapital && (
                    <div
                      style={{
                        marginTop:
                          "5px",
                        color:
                          "#64748b",
                        fontSize:
                          "9px",
                      }}
                    >
                      RR de base : RR
                      {
                        selectedTradeCapital.defaultRR
                      }
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: "8px",
                  marginTop:
                    "12px",
                }}
              >
                <MetricCard
                  label="Risque"
                  value={formatMoney(
                    tradeRisk
                  )}
                  secondary={formatPercent(
                    tradeRiskPercent
                  )}
                  color="#fbbf24"
                />

                <MetricCard
                  label="SL distance"
                  value={`${tradeStopPips.toFixed(
                    1
                  )} pips`}
                />

                <MetricCard
                  label="Lot automatique"
                  value={tradeLot.toFixed(
                    2
                  )}
                  color="#60a5fa"
                />

                <MetricCard
                  label="TP calculé"
                  value={
                    tradeTP
                      ? tradeTP.toFixed(
                          5
                        )
                      : "-"
                  }
                  secondary={`RR${tradeRR}`}
                  color="#22c55e"
                />
              </div>
            </div>

            <div
              style={
                styles.card
              }
            >
              <h3
                style={{
                  ...styles.sectionTitle,
                  marginBottom:
                    "14px",
                }}
              >
                RÉSULTAT
              </h3>

              <div
                style={
                  styles.grid3
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Type de sortie
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.exitType
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          exitType:
                            event
                              .target
                              .value,
                        })
                      )
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
                </div>

                {tradeForm.exitType ===
                  "BE" && (
                  <div>
                    <label
                      style={
                        styles.label
                      }
                    >
                      Prix réel de sortie BE
                    </label>

                    <input
                      type="number"
                      step="any"
                      style={
                        styles.input
                      }
                      value={
                        tradeForm.exitPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setTradeForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            exitPrice:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </div>
                )}

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Frais / commission
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.fees
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          fees:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Swap
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.swap
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          swap:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: "8px",
                  marginTop:
                    "12px",
                }}
              >
                <MetricCard
                  label="Prix de sortie"
                  value={
                    Number.isFinite(
                      tradeExitPrice
                    )
                      ? tradeExitPrice.toFixed(
                          5
                        )
                      : "-"
                  }
                />

                <MetricCard
                  label="Résultat pips"
                  value={`${tradeResultPips.toFixed(
                    1
                  )} pips`}
                  color={getResultColor(
                    tradeResultPips
                  )}
                />

                <MetricCard
                  label="Résultat"
                  value={formatMoney(
                    tradeNetResult
                  )}
                  color={getResultColor(
                    tradeNetResult
                  )}
                />

                <MetricCard
                  label="Résultat R"
                  value={`${tradeResultR >= 0 ? "+" : ""}${tradeResultR.toFixed(
                    2
                  )} R`}
                  color={getResultColor(
                    tradeResultR
                  )}
                />
              </div>
            </div>

            <div
              style={
                styles.card
              }
            >
              <h3
                style={{
                  ...styles.sectionTitle,
                  marginBottom:
                    "14px",
                }}
              >
                ANALYSE
              </h3>

              <div
                style={
                  styles.grid3
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Setup
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.setup
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          setup:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    {SETUPS.map(
                      (setup) => (
                        <option
                          key={
                            setup
                          }
                        >
                          {
                            setup
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Émotion
                  </label>

                  <input
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.emotion
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          emotion:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Plan respecté ?
                  </label>

                  <select
                    style={
                      styles.input
                    }
                    value={
                      tradeForm.planAdherence
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          planAdherence:
                            event
                              .target
                              .value,
                        })
                      )
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
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gap: "10px",
                  marginTop:
                    "12px",
                }}
              >
                {[
                  [
                    "Raison d'entrée",
                    "entryReason",
                  ],
                  [
                    "Raison de sortie",
                    "exitReason",
                  ],
                  [
                    "Erreurs / fautes",
                    "mistakes",
                  ],
                  [
                    "Notes",
                    "notes",
                  ],
                ].map(
                  ([
                    label,
                    field,
                  ]) => (
                    <div
                      key={
                        field
                      }
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        {label}
                      </label>

                      <textarea
                        style={{
                          ...styles.input,
                          minHeight:
                            field ===
                            "notes"
                              ? "75px"
                              : "60px",
                          resize:
                            "vertical",
                        }}
                        value={
                          tradeForm[
                            field
                          ]
                        }
                        onChange={(
                          event
                        ) =>
                          setTradeForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              [field]:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "8px",
              }}
            >
              <button
                style={
                  styles.button
                }
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
                <Check size={15} />
                Enregistrer le trade
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     SIDEBAR
  ===================================================== */

  function Sidebar() {
    const items = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon:
          LayoutDashboard,
      },
      {
        id: "journal",
        label:
          "Journal des trades",
        icon: BookOpen,
      },
      {
        id: "capitals",
        label: "Capitaux",
        icon:
          WalletCards,
      },
      {
        id: "calendar",
        label: "Calendrier",
        icon:
          CalendarDays,
      },
      {
        id: "calculator",
        label: "Calculateur",
        icon:
          Calculator,
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
            style={
              styles.mobileOverlay
            }
            onClick={() =>
              setSidebarOpen(
                false
              )
            }
          />
        )}

        <aside
          style={{
            ...styles.sidebar,
            ...(sidebarOpen
              ? {
                  position:
                    "fixed",
                  left: 0,
                  top: 0,
                }
              : {}),
          }}
        >
          <div
            style={
              styles.logo
            }
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
              <div>
                ARCH
              </div>

              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "9px",
                  fontWeight:
                    600,
                  letterSpacing:
                    "0.12em",
                }}
              >
                TRADING JOURNAL
              </div>
            </div>
          </div>

          <nav
            style={
              styles.nav
            }
          >
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

                    {
                      item.label
                    }
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
                "13px 10px",
              border:
                "1px solid #1e293b",
              borderRadius:
                "10px",
              color:
                "#64748b",
              fontSize:
                "10px",
              lineHeight:
                1.6,
            }}
          >
            <strong
              style={{
                color:
                  "#94a3b8",
              }}
            >
              Trading Journal
            </strong>

            <br />

            Données sauvegardées
            localement dans ton
            navigateur.
          </div>
        </aside>
      </>
    );
  }

  /* =====================================================
     TOPBAR
  ===================================================== */

  function Topbar() {
    const pageNames = {
      dashboard:
        "Dashboard",
      journal:
        "Journal des trades",
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
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap: "12px",
          }}
        >
          <button
            style={{
              ...styles.button,
              padding: "8px",
            }}
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
          >
            <ChevronDown
              size={16}
              style={{
                transform:
                  "rotate(-90deg)",
              }}
            />
          </button>

          <div>
            <div
              style={{
                fontSize:
                  "14px",
                fontWeight:
                  750,
              }}
            >
              {
                pageNames[
                  activePage
                ]
              }
            </div>

            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "10px",
                marginTop:
                  "2px",
              }}
            >
              Trading Journal
            </div>
          </div>
        </div>

        <div
          style={{
            padding:
              "7px 10px",
            background:
              "rgba(34,197,94,0.08)",
            color:
              "#4ade80",
            border:
              "1px solid rgba(34,197,94,0.15)",
            borderRadius:
              "999px",
            fontSize:
              "10px",
            fontWeight:
              700,
          }}
        >
          ● Données locales
        </div>
      </header>
    );
  }

  /* =====================================================
     MAIN RENDER
  ===================================================== */

  function renderPage() {
    switch (
      activePage
    ) {
      case "dashboard":
        return (
          <DashboardPage />
        );

      case "journal":
        return (
          <JournalPage />
        );

      case "capitals":
        return (
          <CapitalsPage />
        );

      case "calendar":
        return (
          <CalendarPage />
        );

      case "calculator":
        return (
          <CalculatorPage />
        );

      case "settings":
        return (
          <SettingsPage />
        );

      default:
        return (
          <DashboardPage />
        );
    }
  }

  return (
    <div
      style={
        styles.app
      }
    >
      <Sidebar />

      <main
        style={
          styles.main
        }
      >
        <Topbar />

        <div
          style={
            styles.content
          }
        >
          {renderPage()}
        </div>
      </main>

      {notification && (
        <div
          style={{
            position:
              "fixed",
            right: "20px",
            bottom: "20px",
            zIndex: 200,
            padding:
              "13px 16px",
            borderRadius:
              "10px",
            border:
              "1px solid #334155",
            background:
              "#0f172a",
            color:
              "#e5e7eb",
            boxShadow:
              "0 15px 50px rgba(0,0,0,0.4)",
            fontSize:
              "12px",
            fontWeight:
              650,
            maxWidth:
              "360px",
          }}
        >
          {notification.type ===
          "error"
            ? "⚠️ "
            : "✓ "}
          {
            notification.message
          }
        </div>
      )}

      <CapitalModal />

      <TradeModal />
    </div>
  );
}
