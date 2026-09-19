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

/*
  Valeur d'un pip pour 1 lot,
  compte en USD.

  XAUUSD:
  1 pip = 0.01 USD de variation
  100 oz × 0.01 = 1 USD/pip.

  Forex:
  EURUSD / GBPUSD / AUDUSD / NZDUSD
      = 10 USD/pip/lot

  USDJPY
      = 1000 / prix USDJPY

  USDCAD
      = 10 / prix USDCAD

  USDCHF
      = 10 / prix USDCHF
*/

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

  return difference * getPipMultiplier(asset);
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

function getTradeNetPnl(trade) {
  return Number(trade?.pnl) || 0;
}

function getTradeR(trade) {
  return Number(trade?.resultR) || 0;
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

  const start = getStartOfWeek(
    reference
  );

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

  const [dashboardCapitalFilter, setDashboardCapitalFilter] =
    useState("all");

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
    if (!notification) return;

    const timer =
      setTimeout(() => {
        setNotification(null);
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notification]);

  /* =====================================================
     HELPERS UI
  ===================================================== */

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

  /* =====================================================
     CAPITALS
  ===================================================== */

  const activeCapitals = useMemo(
    () =>
      capitals.filter(
        (capital) =>
          capital.status !== "archived"
      ),
    [capitals]
  );

  const archivedCapitals = useMemo(
    () =>
      capitals.filter(
        (capital) =>
          capital.status === "archived"
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
        capital.riskAmount ??
        "",
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

    const riskPercent =
      Number(
        capitalForm.riskPercent
      ) || 0;

    const riskAmount =
      Number(
        capitalForm.riskAmount
      ) || 0;

    if (
      capitalForm.riskMode ===
        "percentage" &&
      (riskPercent <= 0 ||
        riskPercent > 100)
    ) {
      showNotification(
        "Le risque en pourcentage doit être compris entre 0 et 100.",
        "error"
      );
      return;
    }

    if (
      capitalForm.riskMode ===
        "fixed" &&
      riskAmount <= 0
    ) {
      showNotification(
        "Le risque fixe doit être supérieur à 0.",
        "error"
      );
      return;
    }

    if (editingCapitalId) {
      setCapitals((previous) =>
        previous.map((capital) => {
          if (
            capital.id !==
            editingCapitalId
          ) {
            return capital;
          }

          const currentBalance =
            capitalForm.currentBalance ===
              "" ||
            capitalForm.currentBalance ===
              null
              ? capital.currentBalance
              : Number(
                  capitalForm.currentBalance
                );

          return {
            ...capital,
            name,
            initialCapital:
              initial,
            currentBalance:
              Number.isFinite(
                currentBalance
              )
                ? currentBalance
                : initial,
            riskMode:
              capitalForm.riskMode,
            riskPercent,
            riskAmount,
            defaultRR:
              Number(
                capitalForm.defaultRR
              ) || 2,
            updatedAt:
              new Date().toISOString(),
          };
        })
      );

      showNotification(
        "Capital modifié."
      );
    } else {
      const newCapital = {
        id: createId("capital"),
        name,
        initialCapital:
          initial,
        currentBalance:
          initial,
        riskMode:
          capitalForm.riskMode,
        riskPercent,
        riskAmount,
        defaultRR:
          Number(
            capitalForm.defaultRR
          ) || 2,
        status: "active",
        createdAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString(),
      };

      setCapitals((previous) => [
        ...previous,
        newCapital,
      ]);

      if (!tradeForm.capitalId) {
        setTradeForm((previous) => ({
          ...previous,
          capitalId:
            newCapital.id,
        }));
      }

      showNotification(
        "Capital créé."
      );
    }

    setCapitalModalOpen(false);
    setEditingCapitalId(null);
  }

  function archiveCapital(id) {
    setCapitals((previous) =>
      previous.map((capital) =>
        capital.id === id
          ? {
              ...capital,
              status: "archived",
              updatedAt:
                new Date().toISOString(),
            }
          : capital
      )
    );

    showNotification(
      "Capital archivé."
    );
  }

  function restoreCapital(id) {
    setCapitals((previous) =>
      previous.map((capital) =>
        capital.id === id
          ? {
              ...capital,
              status: "active",
              updatedAt:
                new Date().toISOString(),
            }
          : capital
      )
    );

    showNotification(
      "Capital restauré."
    );
  }

  function deleteCapital(id) {
    const linkedTrades =
      trades.filter(
        (trade) =>
          trade.capitalId === id
      );

    if (linkedTrades.length > 0) {
      showNotification(
        "Impossible de supprimer ce capital : des trades y sont liés.",
        "error"
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Supprimer définitivement ce capital ?"
      );

    if (!confirmed) return;

    setCapitals((previous) =>
      previous.filter(
        (capital) =>
          capital.id !== id
      )
    );

    showNotification(
      "Capital supprimé."
    );
  }

  /* =====================================================
     TRADE FORM
  ===================================================== */

  function openNewTradeModal() {
    const defaultCapital =
      activeCapitals[0];

    setTradeForm({
      capitalId:
        defaultCapital?.id || "",
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
    Number(tradeForm.entry);

  const tradeSL =
    Number(tradeForm.stopLoss);

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

  const tradeExitPrice =
    tradeForm.exitType === "TP"
      ? tradeTP
      : tradeForm.exitType === "SL"
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
    Number(tradeForm.fees) || 0;

  const tradeSwap =
    Number(tradeForm.swap) || 0;

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
    if (!tradeForm.capitalId) {
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
        "Le prix d'entrée est invalide.",
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
      tradeForm.direction ===
        "BUY" &&
      tradeSL >= tradeEntry
    ) {
      showNotification(
        "Pour un BUY, le SL doit être sous l'entrée.",
        "error"
      );
      return;
    }

    if (
      tradeForm.direction ===
        "SELL" &&
      tradeSL <= tradeEntry
    ) {
      showNotification(
        "Pour un SELL, le SL doit être au-dessus de l'entrée.",
        "error"
      );
      return;
    }

    if (
      !tradeStopPips ||
      !tradeLot
    ) {
      showNotification(
        "Impossible de calculer le lot. Vérifie l'entrée, le SL et le capital.",
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
        "Pour une sortie BE, indique le prix de sortie réel.",
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

    const now =
      new Date().toISOString();

    const newTrade = {
      id: createId("trade"),
      capitalId:
        tradeForm.capitalId,

      asset:
        tradeForm.asset,

      dateTime:
        tradeForm.dateTime ||
        now,

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
        tradeForm.exitType,

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
        now,

      capitalRiskSnapshot: {
        riskMode:
          capital.riskMode,

        riskPercent:
          capital.riskPercent,

        riskAmount:
          capital.riskAmount,

        defaultRR:
          capital.defaultRR,
      },
    };

    setTrades((previous) => [
      ...previous,
      newTrade,
    ]);

    setCapitals((previous) =>
      previous.map((item) =>
        item.id ===
        capital.id
          ? {
              ...item,
              currentBalance:
                Number(
                  item.currentBalance
                ) +
                tradeNetResult,
              updatedAt:
                now,
            }
          : item
      )
    );

    setTradeModalOpen(false);

    showNotification(
      "Trade enregistré."
    );
  }

  function deleteTrade(tradeId) {
    const trade =
      trades.find(
        (item) =>
          item.id === tradeId
      );

    if (!trade) return;

    const confirmed =
      window.confirm(
        "Supprimer ce trade ? Le résultat sera retiré du capital."
      );

    if (!confirmed) return;

    setTrades((previous) =>
      previous.filter(
        (item) =>
          item.id !== tradeId
      )
    );

    if (
      isClosedTrade(trade)
    ) {
      setCapitals((previous) =>
        previous.map(
          (capital) =>
            capital.id ===
            trade.capitalId
              ? {
                  ...capital,
                  currentBalance:
                    Number(
                      capital.currentBalance
                    ) -
                    getTradeNetPnl(
                      trade
                    ),
                  updatedAt:
                    new Date().toISOString(),
                }
              : capital
        )
      );
    }

    showNotification(
      "Trade supprimé."
    );
  }

  /* =====================================================
     DASHBOARD FILTER
  ===================================================== */

  const dashboardTrades =
    useMemo(() => {
      const closedTrades =
        trades.filter(
          isClosedTrade
        );

      if (
        dashboardCapitalFilter ===
        "all"
      ) {
        return closedTrades;
      }

      return closedTrades.filter(
        (trade) =>
          trade.capitalId ===
          dashboardCapitalFilter
      );
    }, [
      trades,
      dashboardCapitalFilter,
    ]);

  const dashboardInitialCapital =
    useMemo(() => {
      if (
        dashboardCapitalFilter ===
        "all"
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

      const capital =
        capitals.find(
          (item) =>
            item.id ===
            dashboardCapitalFilter
        );

      return (
        Number(
          capital?.initialCapital
        ) || 0
      );
    }, [
      capitals,
      dashboardCapitalFilter,
    ]);

  const dashboardCurrentBalance =
    useMemo(() => {
      if (
        dashboardCapitalFilter ===
        "all"
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

      const capital =
        capitals.find(
          (item) =>
            item.id ===
            dashboardCapitalFilter
        );

      return (
        Number(
          capital?.currentBalance
        ) || 0
      );
    }, [
      capitals,
      dashboardCapitalFilter,
    ]);

  const dashboardStats =
    useMemo(() => {
      const list =
        [...dashboardTrades].sort(
          (a, b) =>
            getTradeTimestamp(a) -
            getTradeTimestamp(b)
        );

      const wins =
        list.filter(
          (trade) =>
            getTradeNetPnl(trade) >
            0
        );

      const losses =
        list.filter(
          (trade) =>
            getTradeNetPnl(trade) <
            0
        );

      const breakEven =
        list.filter(
          (trade) =>
            getTradeNetPnl(trade) ===
            0
        );

      const grossProfit =
        wins.reduce(
          (sum, trade) =>
            sum +
            getTradeNetPnl(
              trade
            ),
          0
        );

      const grossLoss =
        losses.reduce(
          (sum, trade) =>
            sum +
            getTradeNetPnl(
              trade
            ),
          0
        );

      const totalPnl =
        list.reduce(
          (sum, trade) =>
            sum +
            getTradeNetPnl(
              trade
            ),
          0
        );

      const winRate =
        list.length > 0
          ? (wins.length /
              list.length) *
            100
          : 0;

      const profitFactor =
        grossLoss < 0
          ? grossProfit /
            Math.abs(
              grossLoss
            )
          : grossProfit > 0
            ? Infinity
            : 0;

      const avgWin =
        wins.length > 0
          ? grossProfit /
            wins.length
          : 0;

      const avgLoss =
        losses.length > 0
          ? grossLoss /
            losses.length
          : 0;

      const avgR =
        list.length > 0
          ? list.reduce(
              (sum, trade) =>
                sum +
                getTradeR(
                  trade
                ),
              0
            ) / list.length
          : 0;

      let equity =
        dashboardInitialCapital;

      let peak = equity;
      let maxDrawdownMoney = 0;
      let maxDrawdownPercent = 0;

      const equityCurve =
        [];

      if (list.length > 0) {
        equityCurve.push({
          index: 0,
          label: "Départ",
          equity,
          pnl: 0,
        });
      }

      list.forEach(
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
            maxDrawdownMoney
          ) {
            maxDrawdownMoney =
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
              new Date(
                getTradeTimestamp(
                  trade
                )
              ).toLocaleDateString(
                "fr-FR",
                {
                  day: "2-digit",
                  month: "2-digit",
                }
              ),
            equity,
            pnl: getTradeNetPnl(
              trade
            ),
          });
        }
      );

      let currentWinStreak = 0;
      let currentLossStreak = 0;
      let bestWinStreak = 0;
      let worstLossStreak = 0;

      list.forEach(
        (trade) => {
          const pnl =
            getTradeNetPnl(
              trade
            );

          if (pnl > 0) {
            currentWinStreak++;
            currentLossStreak = 0;

            bestWinStreak =
              Math.max(
                bestWinStreak,
                currentWinStreak
              );
          } else if (pnl < 0) {
            currentLossStreak++;
            currentWinStreak = 0;

            worstLossStreak =
              Math.max(
                worstLossStreak,
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

      const pnlDay =
        list
          .filter((trade) =>
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
        list
          .filter((trade) =>
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
        list
          .filter((trade) =>
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
        dashboardInitialCapital >
        0
          ? (totalPnl /
              dashboardInitialCapital) *
            100
          : 0;

      return {
        trades: list.length,
        wins: wins.length,
        losses: losses.length,
        breakEven:
          breakEven.length,
        totalPnl,
        pnlPercent,
        pnlDay,
        pnlWeek,
        pnlMonth,
        winRate,
        profitFactor,
        avgWin,
        avgLoss,
        avgR,
        grossProfit,
        grossLoss,
        maxDrawdownMoney,
        maxDrawdownPercent,
        bestWinStreak,
        worstLossStreak,
        equityCurve,
      };
    }, [
      dashboardTrades,
      dashboardInitialCapital,
    ]);

  /* =====================================================
     STATISTICS GROUPÉES
  ===================================================== */

  function buildGroupedStats(
    list,
    field,
    labelFallback = "Non défini"
  ) {
    const map = {};

    list.forEach((trade) => {
      const rawValue =
        trade?.[field];

      const key =
        rawValue === undefined ||
        rawValue === null ||
        String(rawValue).trim() ===
          ""
          ? labelFallback
          : String(rawValue);

      if (!map[key]) {
        map[key] = {
          label: key,
          trades: 0,
          wins: 0,
          losses: 0,
          be: 0,
          pnl: 0,
          avgR: 0,
        };
      }

      map[key].trades++;

      const pnl =
        getTradeNetPnl(
          trade
        );

      if (pnl > 0) {
        map[key].wins++;
      } else if (pnl < 0) {
        map[key].losses++;
      } else {
        map[key].be++;
      }

      map[key].pnl += pnl;

      map[key].avgR +=
        getTradeR(
          trade
        );
    });

    return Object.values(
      map
    )
      .map((item) => ({
        ...item,
        winRate:
          item.trades > 0
            ? (item.wins /
                item.trades) *
              100
            : 0,
        avgR:
          item.trades > 0
            ? item.avgR /
              item.trades
            : 0,
      }))
      .sort(
        (a, b) =>
          b.pnl - a.pnl
      );
  }

  const assetStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "asset"
        ),
      [dashboardTrades]
    );

  const setupStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "setup"
        ),
      [dashboardTrades]
    );

  const sessionStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "session"
        ),
      [dashboardTrades]
    );

  const timeframeStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "timeframe"
        ),
      [dashboardTrades]
    );

  const directionStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "direction"
        ),
      [dashboardTrades]
    );

  const exitStats =
    useMemo(
      () =>
        buildGroupedStats(
          dashboardTrades,
          "exitType"
        ),
      [dashboardTrades]
    );

  const rrStats =
    useMemo(() => {
      return RR_OPTIONS.map(
        (rr) => {
          const list =
            dashboardTrades.filter(
              (trade) =>
                Number(
                  trade.rr
                ) === rr
            );

          const pnl =
            list.reduce(
              (sum, trade) =>
                sum +
                getTradeNetPnl(
                  trade
                ),
              0
            );

          const wins =
            list.filter(
              (trade) =>
                getTradeNetPnl(
                  trade
                ) > 0
            ).length;

          return {
            label: `RR${rr}`,
            trades:
              list.length,
            wins,
            losses:
              list.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) < 0
              ).length,
            be:
              list.filter(
                (trade) =>
                  getTradeNetPnl(
                    trade
                  ) === 0
              ).length,
            pnl,
            winRate:
              list.length > 0
                ? (wins /
                    list.length) *
                  100
                : 0,
            avgR:
              list.length > 0
                ? list.reduce(
                    (sum, trade) =>
                      sum +
                      getTradeR(
                        trade
                      ),
                    0
                  ) /
                  list.length
                : 0,
          };
        }
      );
    }, [dashboardTrades]);

  /* =====================================================
     JOURNAL FILTER
  ===================================================== */

  const visibleTrades =
    useMemo(() => {
      const list =
        [...trades].sort(
          (a, b) =>
            getTradeTimestamp(b) -
            getTradeTimestamp(a)
        );

      if (
        tradeCapitalFilter ===
        "all"
      ) {
        return list;
      }

      return list.filter(
        (trade) =>
          trade.capitalId ===
          tradeCapitalFilter
      );
    }, [
      trades,
      tradeCapitalFilter,
    ]);

  /* =====================================================
     STYLES
  ===================================================== */

  const styles = {
    app: {
      minHeight: "100vh",
      background:
        "#0b1120",
      color: "#e5e7eb",
      display: "flex",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },

    sidebar: {
      width: "250px",
      minWidth: "250px",
      background:
        "#0f172a",
      borderRight:
        "1px solid #1e293b",
      padding: "22px 14px",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      boxSizing: "border-box",
      zIndex: 50,
    },

    mobileOverlay: {
      position: "fixed",
      inset: 0,
      background:
        "rgba(0,0,0,0.55)",
      zIndex: 40,
    },

    main: {
      flex: 1,
      minWidth: 0,
    },

    topbar: {
      minHeight: "74px",
      borderBottom:
        "1px solid #1e293b",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding:
        "14px 26px",
      background:
        "#0b1120",
      position: "sticky",
      top: 0,
      zIndex: 20,
    },

    content: {
      padding: "26px",
      maxWidth: "1700px",
      margin: "0 auto",
    },

    logo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontWeight: 800,
      fontSize: "20px",
      marginBottom: "28px",
    },

    logoIcon: {
      width: "38px",
      height: "38px",
      borderRadius: "11px",
      background:
        "linear-gradient(135deg,#2563eb,#7c3aed)",
      display: "grid",
      placeItems: "center",
    },

    nav: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },

    navButton: {
      border: "none",
      background:
        "transparent",
      color: "#94a3b8",
      padding:
        "11px 12px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      gap: "11px",
      cursor: "pointer",
      fontSize: "14px",
      textAlign: "left",
      width: "100%",
    },

    navButtonActive: {
      background:
        "rgba(37,99,235,0.16)",
      color: "#60a5fa",
    },

    card: {
      background:
        "#111827",
      border:
        "1px solid #1f2937",
      borderRadius: "16px",
      padding: "20px",
      boxSizing: "border-box",
    },

    grid4: {
      display: "grid",
      gridTemplateColumns:
        "repeat(4,minmax(0,1fr))",
      gap: "14px",
    },

    grid3: {
      display: "grid",
      gridTemplateColumns:
        "repeat(3,minmax(0,1fr))",
      gap: "14px",
    },

    grid2: {
      display: "grid",
      gridTemplateColumns:
        "repeat(2,minmax(0,1fr))",
      gap: "14px",
    },

    metricCard: {
      background:
        "#111827",
      border:
        "1px solid #1f2937",
      borderRadius: "15px",
      padding: "17px",
      minWidth: 0,
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: "12px",
      marginBottom: "9px",
    },

    metricValue: {
      fontSize: "23px",
      fontWeight: 800,
      letterSpacing:
        "-0.03em",
    },

    sectionTitle: {
      fontSize: "17px",
      fontWeight: 750,
      margin: 0,
    },

    sectionSubtitle: {
      color: "#64748b",
      fontSize: "12px",
      marginTop: "5px",
    },

    sectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "15px",
      marginBottom: "18px",
      flexWrap: "wrap",
    },

    button: {
      border: "1px solid #334155",
      background:
        "#172033",
      color: "#e5e7eb",
      borderRadius: "9px",
      padding:
        "9px 13px",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "7px",
      fontWeight: 650,
      fontSize: "13px",
    },

    primaryButton: {
      border:
        "1px solid #2563eb",
      background:
        "#2563eb",
      color: "#fff",
    },

    dangerButton: {
      border:
        "1px solid #7f1d1d",
      background:
        "rgba(127,29,29,0.2)",
      color: "#fca5a5",
    },

    input: {
      width: "100%",
      boxSizing: "border-box",
      background:
        "#0b1220",
      border:
        "1px solid #334155",
      color: "#e5e7eb",
      borderRadius: "9px",
      padding:
        "10px 11px",
      outline: "none",
      fontSize: "13px",
    },

    label: {
      display: "block",
      color: "#cbd5e1",
      fontSize: "12px",
      fontWeight: 650,
      marginBottom: "7px",
    },

    tableWrapper: {
      overflowX: "auto",
      border:
        "1px solid #1f2937",
      borderRadius: "12px",
    },

    table: {
      width: "100%",
      borderCollapse:
        "collapse",
      minWidth: "780px",
    },

    th: {
      background:
        "#0b1220",
      color: "#64748b",
      textAlign: "left",
      fontSize: "11px",
      textTransform:
        "uppercase",
      letterSpacing:
        "0.04em",
      padding: "11px",
      borderBottom:
        "1px solid #1f2937",
      whiteSpace:
        "nowrap",
    },

    td: {
      padding: "11px",
      borderBottom:
        "1px solid #1f2937",
      fontSize: "12px",
      whiteSpace:
        "nowrap",
    },

    badge: {
      display:
        "inline-flex",
      alignItems:
        "center",
      padding:
        "4px 8px",
      borderRadius:
        "999px",
      fontSize: "11px",
      fontWeight: 700,
    },
  };

  /* =====================================================
     COMPONENTS
  ===================================================== */

  function PageTitle({
    title,
    subtitle,
    action,
  }) {
    return (
      <div
        style={{
          ...styles.sectionHeader,
          marginBottom:
            "24px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize:
                "27px",
              fontWeight: 850,
              letterSpacing:
                "-0.04em",
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              {subtitle}
            </p>
          )}
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
                "7px",
              color:
                "#64748b",
              fontSize:
                "11px",
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
    firstColumn,
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
              padding:
                "25px 10px",
              textAlign:
                "center",
              color:
                "#64748b",
              fontSize:
                "13px",
            }}
          >
            Aucun trade pour cette
            sélection.
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
                            700,
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
                        {formatPercent(
                          row.winRate,
                          1
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
                        {row.avgR.toFixed(
                          2
                        )}
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color:
                            getResultColor(
                              row.pnl
                            ),
                          fontWeight:
                            750,
                        }}
                      >
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
     DASHBOARD PAGE
  ===================================================== */

  function DashboardPage() {
    const balanceChange =
      dashboardCurrentBalance -
      dashboardInitialCapital;

    return (
      <>
        <PageTitle
          title="Dashboard"
          subtitle="Vue globale de tes performances de trading"
          action={
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
                width:
                  "230px",
              }}
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
                    {capital.name}
                    {capital.status ===
                    "archived"
                      ? " — Archivé"
                      : ""}
                  </option>
                )
              )}
            </select>
          }
        />

        <div
          style={{
            ...styles.grid4,
            marginBottom:
              "14px",
          }}
        >
          <MetricCard
            label="Balance actuelle"
            value={formatMoney(
              dashboardCurrentBalance
            )}
            secondary={`${formatMoney(
              balanceChange
            )} depuis le capital initial`}
            color={getResultColor(
              balanceChange
            )}
          />

          <MetricCard
            label="P&L total"
            value={formatMoney(
              dashboardStats.totalPnl
            )}
            secondary={formatPercent(
              dashboardStats.pnlPercent
            )}
            color={getResultColor(
              dashboardStats.totalPnl
            )}
          />

          <MetricCard
            label="Win Rate"
            value={formatPercent(
              dashboardStats.winRate,
              1
            )}
            secondary={`${dashboardStats.wins} W · ${dashboardStats.losses} L · ${dashboardStats.breakEven} BE`}
            color="#60a5fa"
          />

          <MetricCard
            label="Profit Factor"
            value={
              dashboardStats.profitFactor ===
              Infinity
                ? "∞"
                : dashboardStats.profitFactor.toFixed(
                    2
                  )
            }
            secondary={`Gain brut ${formatMoney(
              dashboardStats.grossProfit
            )}`}
            color="#a78bfa"
          />
        </div>

        <div
          style={{
            ...styles.grid4,
            marginBottom:
              "14px",
          }}
        >
          <MetricCard
            label="P&L aujourd'hui"
            value={formatMoney(
              dashboardStats.pnlDay
            )}
            color={getResultColor(
              dashboardStats.pnlDay
            )}
          />

          <MetricCard
            label="P&L cette semaine"
            value={formatMoney(
              dashboardStats.pnlWeek
            )}
            color={getResultColor(
              dashboardStats.pnlWeek
            )}
          />

          <MetricCard
            label="P&L ce mois"
            value={formatMoney(
              dashboardStats.pnlMonth
            )}
            color={getResultColor(
              dashboardStats.pnlMonth
            )}
          />

          <MetricCard
            label="Trades"
            value={
              dashboardStats.trades
            }
            secondary={`Avg R : ${dashboardStats.avgR.toFixed(
              2
            )}`}
            color="#f8fafc"
          />
        </div>

        <div
          style={{
            ...styles.grid4,
            marginBottom:
              "14px",
          }}
        >
          <MetricCard
            label="Gain moyen"
            value={formatMoney(
              dashboardStats.avgWin
            )}
            secondary={`${dashboardStats.wins} trades gagnants`}
            color="#22c55e"
          />

          <MetricCard
            label="Perte moyenne"
            value={formatMoney(
              dashboardStats.avgLoss
            )}
            secondary={`${dashboardStats.losses} trades perdants`}
            color="#ef4444"
          />

          <MetricCard
            label="Max Drawdown"
            value={formatMoney(
              dashboardStats.maxDrawdownMoney
            )}
            secondary={formatPercent(
              dashboardStats.maxDrawdownPercent,
              2
            )}
            color="#f97316"
          />

          <MetricCard
            label="Séries"
            value={`${dashboardStats.bestWinStreak} / ${dashboardStats.worstLossStreak}`}
            secondary="Meilleure série W / pire série L"
            color="#fbbf24"
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
                Equity Curve
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                Évolution du capital selon les
                trades clôturés
              </div>
            </div>

            <div
              style={{
                fontSize:
                  "13px",
                color:
                  "#94a3b8",
              }}
            >
              Départ :{" "}
              <strong
                style={{
                  color:
                    "#e5e7eb",
                }}
              >
                {formatMoney(
                  dashboardInitialCapital
                )}
              </strong>
            </div>
          </div>

          {dashboardStats.equityCurve
            .length <= 1 ? (
            <div
              style={{
                height:
                  "330px",
                display:
                  "grid",
                placeItems:
                  "center",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Enregistre des trades clôturés
              pour construire l'Equity Curve.
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height:
                  "330px",
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={
                    dashboardStats.equityCurve
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="equityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#3b82f6"
                        stopOpacity={
                          0.38
                        }
                      />
                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                        stopOpacity={
                          0.02
                        }
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#1f2937"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    stroke="#64748b"
                    tick={{
                      fontSize: 10,
                    }}
                    tickFormatter={(
                      value
                    ) =>
                      `$${Math.round(
                        value
                      )}`
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0f172a",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "9px",
                      color:
                        "#e5e7eb",
                    }}
                    formatter={(
                      value,
                      name
                    ) => {
                      if (
                        name ===
                        "equity"
                      ) {
                        return [
                          formatMoney(
                            value
                          ),
                          "Equity",
                        ];
                      }

                      return [
                        formatMoney(
                          value
                        ),
                        "P&L",
                      ];
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#3b82f6"
                    strokeWidth={
                      2.5
                    }
                    fill="url(#equityGradient)"
                    isAnimationActive={
                      false
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          style={{
            ...styles.grid2,
            marginBottom:
              "14px",
          }}
        >
          <StatsTable
            title="Performance par actif"
            subtitle="Résultats par instrument"
            rows={
              assetStats
            }
            firstColumn="Actif"
          />

          <StatsTable
            title="Performance par setup"
            subtitle="Résultats par stratégie"
            rows={
              setupStats
            }
            firstColumn="Setup"
          />
        </div>

        <div
          style={{
            ...styles.grid2,
            marginBottom:
              "14px",
          }}
        >
          <StatsTable
            title="Performance par session"
            subtitle="Comparaison des sessions de marché"
            rows={
              sessionStats
            }
            firstColumn="Session"
          />

          <StatsTable
            title="Performance par timeframe"
            subtitle="Résultats selon l'unité de temps"
            rows={
              timeframeStats
            }
            firstColumn="Timeframe"
          />
        </div>

        <div
          style={{
            ...styles.grid2,
            marginBottom:
              "14px",
          }}
        >
          <StatsTable
            title="BUY vs SELL"
            subtitle="Performance selon la direction"
            rows={
              directionStats
            }
            firstColumn="Direction"
          />

          <StatsTable
            title="TP / SL / BE"
            subtitle="Répartition des sorties"
            rows={
              exitStats
            }
            firstColumn="Sortie"
          />
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
                Performance par objectif RR
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                RR réellement sélectionné sur
                chaque trade
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
                    "Wins",
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
                {rrStats.map(
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
                          color:
                            "#60a5fa",
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
                            "#22c55e",
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
                            "#ef4444",
                        }}
                      >
                        {
                          row.losses
                        }
                      </td>

                      <td
                        style={
                          styles.td
                        }
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
                        {formatPercent(
                          row.winRate,
                          1
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
                        {row.avgR.toFixed(
                          2
                        )}
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          color:
                            getResultColor(
                              row.pnl
                            ),
                          fontWeight:
                            750,
                        }}
                      >
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
      </>
    );
  }

  /* =====================================================
     CAPITAL PAGE
  ===================================================== */

  function CapitalsPage() {
    function CapitalCard({
      capital,
    }) {
      const riskMoney =
        getCapitalRisk(
          capital
        );

      const riskPercent =
        getCapitalRiskPercent(
          capital
        );

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

      return (
        <div
          style={{
            ...styles.card,
            position:
              "relative",
          }}
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
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "8px",
                  marginBottom:
                    "5px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize:
                      "17px",
                  }}
                >
                  {
                    capital.name
                  }
                </h3>

                <span
                  style={{
                    ...styles.badge,
                    background:
                      capital.status ===
                      "archived"
                        ? "rgba(100,116,139,0.15)"
                        : "rgba(34,197,94,0.12)",
                    color:
                      capital.status ===
                      "archived"
                        ? "#94a3b8"
                        : "#4ade80",
                  }}
                >
                  {capital.status ===
                  "archived"
                    ? "Archivé"
                    : "Actif"}
                </span>
              </div>

              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "11px",
                }}
              >
                {capitalTrades.length} trade
                {capitalTrades.length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: "5px",
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
                title="Modifier"
              >
                <Pencil
                  size={
                    14
                  }
                />
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
                  title="Restaurer"
                >
                  <RotateCcw
                    size={
                      14
                    }
                  />
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
                  title="Archiver"
                >
                  <Archive
                    size={
                      14
                    }
                  />
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
                title="Supprimer"
              >
                <Trash2
                  size={
                    14
                  }
                />
              </button>
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",
              gap: "10px",
              marginTop:
                "18px",
            }}
          >
            <MetricCard
              label="Balance"
              value={formatMoney(
                capital.currentBalance
              )}
              color={getResultColor(
                pnl
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
                riskMoney
              )}
              secondary={`${riskPercent.toFixed(
                2
              )}%`}
              color="#fbbf24"
            />

            <MetricCard
              label="RR de base"
              value={`RR${capital.defaultRR}`}
              secondary="Objectif recommandé"
              color="#60a5fa"
            />
          </div>

          <div
            style={{
              marginTop:
                "14px",
              padding:
                "10px 12px",
              background:
                "#0b1220",
              borderRadius:
                "9px",
              color:
                "#64748b",
              fontSize:
                "11px",
            }}
          >
            Le RR de base sert de
            recommandation. Chaque trade peut
            sélectionner indépendamment RR1 à
            RR10.
          </div>
        </div>
      );
    }

    return (
      <>
        <PageTitle
          title="Capitaux"
          subtitle="Gère tes comptes de trading actifs et archivés"
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
              <Plus
                size={
                  16
                }
              />
              Nouveau capital
            </button>
          }
        />

        {capitals.length ===
        0 ? (
          <div
            style={{
              ...styles.card,
              textAlign:
                "center",
              padding:
                "60px 20px",
            }}
          >
            <WalletCards
              size={
                42
              }
              color="#64748b"
            />

            <h3>
              Aucun capital
            </h3>

            <p
              style={{
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Crée ton premier capital pour
              commencer à enregistrer tes trades.
            </p>

            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={
                openNewCapitalModal
              }
            >
              <Plus
                size={
                  16
                }
              />
              Créer un capital
            </button>
          </div>
        ) : (
          <>
            <h2
              style={{
                fontSize:
                  "14px",
                margin:
                  "0 0 12px",
                color:
                  "#94a3b8",
              }}
            >
              Capitaux actifs
            </h2>

            <div
              style={{
                ...styles.grid2,
                marginBottom:
                  "28px",
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

              {activeCapitals.length ===
                0 && (
                <div
                  style={{
                    ...styles.card,
                    color:
                      "#64748b",
                    fontSize:
                      "13px",
                  }}
                >
                  Aucun capital actif.
                </div>
              )}
            </div>

            {archivedCapitals.length >
              0 && (
              <>
                <h2
                  style={{
                    fontSize:
                      "14px",
                    margin:
                      "0 0 12px",
                    color:
                      "#94a3b8",
                  }}
                >
                  Capitaux archivés
                </h2>

                <div
                  style={
                    styles.grid2
                  }
                >
                  {archivedCapitals.map(
                    (
                      capital
                    ) => (
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
              </>
            )}
          </>
        )}
      </>
    );
  }

  /* =====================================================
     JOURNAL PAGE
  ===================================================== */

  function JournalPage() {
    return (
      <>
        <PageTitle
          title="Journal des trades"
          subtitle="Historique détaillé de toutes tes opérations"
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
                style={{
                  ...styles.input,
                  width:
                    "210px",
                }}
              >
                <option value="all">
                  Tous les capitaux
                </option>

                {capitals.map(
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

              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                }}
                onClick={
                  openNewTradeModal
                }
              >
                <Plus
                  size={
                    16
                  }
                />
                Nouveau trade
              </button>
            </div>
          }
        />

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
                Historique
              </h3>

              <div
                style={
                  styles.sectionSubtitle
                }
              >
                {visibleTrades.length} trade
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
                  "55px 15px",
                color:
                  "#64748b",
                fontSize:
                  "13px",
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
                      (
                        heading,
                        index
                      ) => (
                        <th
                          key={
                            index
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
                  {visibleTrades.map(
                    (
                      trade
                    ) => {
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
                            {
                              capital?.name ||
                              "-"
                            }
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
                                  ? "#22c55e"
                                  : "#f97316",
                              fontWeight:
                                750,
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
                            style={{
                              ...styles.td,
                              color:
                                "#60a5fa",
                              fontWeight:
                                750,
                            }}
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
                            {Number(
                              trade.lot
                            ).toFixed(
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
                            {formatMoney(
                              pnl
                            )}
                            <div
                              style={{
                                fontSize:
                                  "10px",
                                color:
                                  "#64748b",
                                marginTop:
                                  "2px",
                              }}
                            >
                              {
                                trade.result
                              }
                            </div>
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
                            }}
                          >
                            {getTradeR(
                              trade
                            ).toFixed(
                              2
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
                                ...styles.dangerButton,
                                padding:
                                  "6px 8px",
                              }}
                              onClick={() =>
                                deleteTrade(
                                  trade.id
                                )
                              }
                              title="Supprimer"
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
     CALENDAR / CALCULATOR PLACEHOLDERS
  ===================================================== */

  function CalendarPage() {
    return (
      <>
        <PageTitle
          title="Calendrier"
          subtitle="Vue calendrier des performances"
        />

        <div
          style={{
            ...styles.card,
            textAlign:
              "center",
            padding:
              "80px 20px",
          }}
        >
          <CalendarDays
            size={
              45
            }
            color="#60a5fa"
          />

          <h3>
            Module calendrier
          </h3>

          <p
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
            }}
          >
            Ce module sera connecté aux statistiques
            quotidiennes et mensuelles.
          </p>
        </div>
      </>
    );
  }

  function CalculatorPage() {
    const risk =
      getCapitalRisk(
        activeCapitals[0]
      );

    return (
      <>
        <PageTitle
          title="Calculateur"
          subtitle="Calcul rapide du risque, lot, SL et TP"
        />

        <div
          style={{
            ...styles.grid2,
          }}
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
                size={
                  19
                }
                color="#60a5fa"
              />

              <h3
                style={
                  styles.sectionTitle
                }
              >
                Calculateur rapide
              </h3>
            </div>

            <div
              style={{
                color:
                  "#94a3b8",
                fontSize:
                  "13px",
                lineHeight:
                  1.7,
              }}
            >
              <p>
                Risque actuel du premier capital
                actif :
              </p>

              <strong
                style={{
                  fontSize:
                    "25px",
                  color:
                    "#f8fafc",
                }}
              >
                {formatMoney(
                  risk
                )}
              </strong>

              <p>
                Le calculateur complet pourra
                reprendre exactement les mêmes
                formules que le Journal.
              </p>
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
              Formules utilisées
            </h3>

            <div
              style={{
                marginTop:
                  "15px",
                color:
                  "#94a3b8",
                fontSize:
                  "12px",
                lineHeight:
                  1.8,
              }}
            >
              <div>
                Lot = Risque / (SL pips ×
                valeur pip)
              </div>

              <div>
                TP BUY = Entry + distance SL × RR
              </div>

              <div>
                TP SELL = Entry − distance SL × RR
              </div>

              <div>
                Résultat R = P&L / risque
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     SETTINGS PLACEHOLDER
  ===================================================== */

  function SettingsPage() {
    return (
      <>
        <PageTitle
          title="Paramètres"
          subtitle="Configuration générale du journal"
        />

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
              size={
                21
              }
              color="#60a5fa"
            />

            <div>
              <h3
                style={
                  styles.sectionTitle
                }
              >
                Paramètres
              </h3>

              <p
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "12px",
                }}
              >
                Les paramètres avancés seront ajoutés
                progressivement.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* =====================================================
     CAPITAL MODAL
  ===================================================== */

  function CapitalModal() {
    if (!capitalModalOpen) {
      return null;
    }

    const previewCapital =
      editingCapitalId
        ? {
            ...capitals.find(
              (item) =>
                item.id ===
                editingCapitalId
            ),
            currentBalance:
              capitalForm.currentBalance ||
              capitalForm.initialCapital,
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
          }
        : {
            initialCapital:
              Number(
                capitalForm.initialCapital
              ),
            currentBalance:
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
          onMouseDown={(event) =>
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
                Configure ton risque et ton RR de
                base.
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
              <X
                size={
                  16
                }
              />
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
                        event.target
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
                    "11px",
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
                    "12px",
                }}
              >
                ({previewPercent.toFixed(
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
                    "11px",
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
                marginTop:
                  "5px",
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
                <Check
                  size={
                    15
                  }
                />
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
    if (!tradeModalOpen) {
      return null;
    }

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
            boxShadow:
              "0 30px 100px rgba(0,0,0,0.55)",
          }}
          onMouseDown={(event) =>
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
                Le risque, le lot et le TP sont calculés
                automatiquement.
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
              <X
                size={
                  16
                }
              />
            </button>
          </div>

          <div
            style={{
              display:
                "grid",
              gap: "18px",
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
                            capital?.defaultRR ||
                            previous.rr,
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
                      (
                        asset
                      ) => (
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
                      (
                        session
                      ) => (
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
                      (
                        timeframe
                      ) => (
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
                    placeholder="1998.00"
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
                      (
                        rr
                      ) => (
                        <option
                          key={
                            rr
                          }
                          value={
                            rr
                          }
                        >
                          RR
                          {rr}
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
                          "10px",
                      }}
                    >
                      RR de base du capital : RR
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
                  gap: "10px",
                  marginTop:
                    "14px",
                }}
              >
                <MetricCard
                  label="Risque"
                  value={formatMoney(
                    tradeRisk
                  )}
                  secondary={formatPercent(
                    tradeRiskPercent,
                    2
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
                    Number.isFinite(
                      tradeTP
                    )
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
                      Prix de sortie BE
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
                      placeholder="Prix réel"
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
                    placeholder="0"
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
                    placeholder="0"
                  />
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: "10px",
                  marginTop:
                    "14px",
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
                  value={`${tradeResultR.toFixed(
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
                      (
                        setup
                      ) => (
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
                    placeholder="Calme, FOMO, peur..."
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
                  gap: "12px",
                  marginTop:
                    "13px",
                }}
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Raison d'entrée
                  </label>

                  <textarea
                    style={{
                      ...styles.input,
                      minHeight:
                        "65px",
                      resize:
                        "vertical",
                    }}
                    value={
                      tradeForm.entryReason
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          entryReason:
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
                    Raison de sortie
                  </label>

                  <textarea
                    style={{
                      ...styles.input,
                      minHeight:
                        "65px",
                      resize:
                        "vertical",
                    }}
                    value={
                      tradeForm.exitReason
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          exitReason:
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
                    Erreurs / fautes
                  </label>

                  <textarea
                    style={{
                      ...styles.input,
                      minHeight:
                        "65px",
                      resize:
                        "vertical",
                    }}
                    value={
                      tradeForm.mistakes
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          mistakes:
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
                    Notes
                  </label>

                  <textarea
                    style={{
                      ...styles.input,
                      minHeight:
                        "80px",
                      resize:
                        "vertical",
                    }}
                    value={
                      tradeForm.notes
                    }
                    onChange={(
                      event
                    ) =>
                      setTradeForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          notes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>
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
                <Check
                  size={
                    15
                  }
                />
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
        icon: LayoutDashboard,
      },
      {
        id: "journal",
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
                size={
                  21
                }
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
                      size={
                        17
                      }
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
            localement dans ton navigateur.
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
              padding:
                "8px",
            }}
            onClick={() =>
              setSidebarOpen(
                true
              )
            }
          >
            <ChevronDown
              size={
                16
              }
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
            display:
              "flex",
            alignItems:
              "center",
            gap: "8px",
          }}
        >
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
        </div>
      </header>
    );
  }

  /* =====================================================
     MAIN RENDER
  ===================================================== */

  function renderPage() {
    switch (activePage) {
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
