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
  if (
    asset === "XAUUSD" ||
    asset === "USDJPY"
  ) {
    return 100;
  }

  return 10000;
}

function getPipValuePerLot(asset, price) {
  const currentPrice = Number(price);

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
    risk / (pips * pipValue);

  return (
    Math.floor(rawLot * 100) / 100
  );
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

  if (
    capital.riskMode ===
    "percentage"
  ) {
    return (
      Number(capital.riskPercent) || 0
    );
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
    String(
      trade.status || "closed"
    ).toLowerCase() === "closed"
  );
}

function getTradeR(trade) {
  const resultR = Number(
    trade?.resultR
  );

  return Number.isFinite(resultR)
    ? resultR
    : 0;
}

function getTradeNetPnl(trade) {
  if (!trade) return 0;

  const storedPnl = Number(
    trade.pnl
  );

  const resultR = Number(
    trade.resultR
  );

  const riskMoney = Number(
    trade.riskMoney
  );

  const grossPnl = Number(
    trade.grossPnl
  );

  const fees =
    Number(trade.fees) || 0;

  const swap =
    Number(trade.swap) || 0;

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
    return (
      resultR * riskMoney
    );
  }

  const entry = Number(
    trade.entry
  );

  const exit = Number(
    trade.exitPrice
  );

  const lot = Number(
    trade.lot
  );

  const pipValue =
    Number(trade.pipValue) ||
    getPipValuePerLot(
      trade.asset,
      entry
    );

  if (
    Number.isFinite(entry) &&
    Number.isFinite(exit) &&
    Number.isFinite(lot) &&
    lot > 0 &&
    Number.isFinite(pipValue) &&
    pipValue > 0
  ) {
    const resultPips =
      calculateDirectionalPips(
        trade.asset,
        trade.direction,
        entry,
        exit
      );

    const calculatedGross =
      resultPips *
      lot *
      pipValue;

    return (
      calculatedGross -
      fees +
      swap
    );
  }

  if (Number.isFinite(grossPnl)) {
    return (
      grossPnl -
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

function getTradeDate(trade) {
  const timestamp =
    getTradeTimestamp(trade);

  return timestamp
    ? new Date(timestamp)
    : null;
}

function isSameDay(
  dateA,
  dateB
) {
  if (!dateA || !dateB) {
    return false;
  }

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

function isSameWeek(
  date,
  reference
) {
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

function isSameMonth(
  date,
  reference
) {
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

function isWithinPeriod(
  date,
  period
) {
  if (!date) return false;

  if (period === "all") {
    return true;
  }

  const now = new Date();

  if (period === "today") {
    return isSameDay(
      date,
      now
    );
  }

  if (period === "week") {
    return isSameWeek(
      date,
      now
    );
  }

  if (period === "month") {
    return isSameMonth(
      date,
      now
    );
  }

  return true;
}

function calculatePerformanceStats(
  list,
  initialCapital
) {
  const closedTrades = list
    .filter(isClosedTrade)
    .slice()
    .sort(
      (a, b) =>
        getTradeTimestamp(a) -
        getTradeTimestamp(b)
    );

  const now = new Date();

  const wins =
    closedTrades.filter(
      (trade) =>
        getTradeNetPnl(trade) > 0
    );

  const losses =
    closedTrades.filter(
      (trade) =>
        getTradeNetPnl(trade) < 0
    );

  const breakevens =
    closedTrades.filter(
      (trade) =>
        getTradeNetPnl(trade) === 0
    );

  const totalPnl =
    closedTrades.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(trade),
      0
    );

  const grossProfit =
    wins.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(trade),
      0
    );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(trade),
      0
    )
  );

  const tradeCount =
    closedTrades.length;

  const winRate =
    tradeCount > 0
      ? (wins.length /
          tradeCount) *
        100
      : 0;

  const lossRate =
    tradeCount > 0
      ? (losses.length /
          tradeCount) *
        100
      : 0;

  const breakevenRate =
    tradeCount > 0
      ? (breakevens.length /
          tradeCount) *
        100
      : 0;

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
      ? Infinity
      : 0;

  const avgWin =
    wins.length > 0
      ? grossProfit / wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? -grossLoss /
        losses.length
      : 0;

  const avgR =
    tradeCount > 0
      ? closedTrades.reduce(
          (sum, trade) =>
            sum +
            getTradeR(trade),
          0
        ) / tradeCount
      : 0;

  let equity =
    Number(initialCapital) || 0;

  let peak = equity;

  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurve = [
    {
      date: "Départ",
      equity,
      pnl: 0,
    },
  ];

  closedTrades.forEach(
    (trade) => {
      const pnl =
        getTradeNetPnl(trade);

      equity += pnl;

      peak = Math.max(
        peak,
        equity
      );

      const drawdown =
        peak - equity;

      const drawdownPercent =
        peak > 0
          ? (drawdown /
              peak) *
            100
          : 0;

      maxDrawdown =
        Math.max(
          maxDrawdown,
          drawdown
        );

      maxDrawdownPercent =
        Math.max(
          maxDrawdownPercent,
          drawdownPercent
        );

      equityCurve.push({
        date: formatDate(
          trade.dateTime ||
            trade.date ||
            trade.createdAt
        ),
        equity,
        pnl,
      });
    }
  );

  let bestStreak = 0;
  let worstStreak = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;

  closedTrades.forEach(
    (trade) => {
      const pnl =
        getTradeNetPnl(trade);

      if (pnl > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;

        bestStreak =
          Math.max(
            bestStreak,
            currentWinStreak
          );
      } else if (pnl < 0) {
        currentLossStreak += 1;
        currentWinStreak = 0;

        worstStreak =
          Math.max(
            worstStreak,
            currentLossStreak
          );
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    }
  );

  const pnlToday =
    closedTrades
      .filter((trade) =>
        isSameDay(
          getTradeDate(trade),
          now
        )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(trade),
        0
      );

  const pnlWeek =
    closedTrades
      .filter((trade) =>
        isSameWeek(
          getTradeDate(trade),
          now
        )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(trade),
        0
      );

  const pnlMonth =
    closedTrades
      .filter((trade) =>
        isSameMonth(
          getTradeDate(trade),
          now
        )
      )
      .reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(trade),
        0
      );

  const startCapital =
    Number(initialCapital) || 0;

  const pnlPercent =
    startCapital > 0
      ? (totalPnl /
          startCapital) *
        100
      : 0;

  return {
    trades: tradeCount,
    wins: wins.length,
    losses: losses.length,
    breakevens:
      breakevens.length,
    totalPnl,
    grossProfit,
    grossLoss,
    winRate,
    lossRate,
    breakevenRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgR,
    pnlPercent,
    maxDrawdown,
    maxDrawdownPercent,
    bestStreak,
    worstStreak,
    pnlToday,
    pnlWeek,
    pnlMonth,
    equityCurve,
  };
}

function PageTitle({
  icon: Icon,
  title,
  subtitle,
}) {
  return (
    <div className="page-title">
      <div className="page-title-icon">
        <Icon size={22} />
      </div>

      <div>
        <h1>{title}</h1>

        {subtitle && (
          <p>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "neutral",
}) {
  return (
    <div
      className={`metric-card ${tone}`}
    >
      <div className="metric-card-top">
        <span>{title}</span>

        <div className="metric-icon">
          <Icon size={18} />
        </div>
      </div>

      <strong>{value}</strong>

      {subtitle && (
        <small>{subtitle}</small>
      )}
    </div>
  );
}

function StatsTable({
  title,
  rows,
  columns,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map(
                (column) => (
                  <th
                    key={
                      column.key
                    }
                  >
                    {
                      column.label
                    }
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length
                  }
                  className="empty-cell"
                >
                  Aucune donnée
                </td>
              </tr>
            ) : (
              rows.map(
                (row, index) => (
                  <tr
                    key={
                      row.id ||
                      row.name ||
                      index
                    }
                  >
                    {columns.map(
                      (
                        column
                      ) => (
                        <td
                          key={
                            column.key
                          }
                        >
                          {column.render
                            ? column.render(
                                row
                              )
                            : row[
                                column.key
                              ]}
                        </td>
                      )
                    )}
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CapitalPage({
  capitals,
  trades,
  onNew,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}) {
  const active =
    capitals.filter(
      (capital) =>
        capital.status !==
        "archived"
    );

  const archived =
    capitals.filter(
      (capital) =>
        capital.status ===
        "archived"
    );

  function renderCapital(
    capital
  ) {
    const linkedTrades =
      trades.filter(
        (trade) =>
          trade.capitalId ===
          capital.id
      );

    const pnl =
      linkedTrades.reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(trade),
        0
      );

    return (
      <div
        className="capital-card"
        key={capital.id}
      >
        <div className="capital-card-header">
          <div>
            <h3>
              {capital.name}
            </h3>

            <span
              className={`status-badge ${
                capital.status ===
                "archived"
                  ? "archived"
                  : "active"
              }`}
            >
              {capital.status ===
              "archived"
                ? "Archivé"
                : "Actif"}
            </span>
          </div>

          <div className="card-actions">
            <button
              className="icon-button"
              onClick={() =>
                onEdit(capital)
              }
              title="Modifier"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>

        <div className="capital-main-value">
          {formatMoney(
            capital.currentBalance
          )}
        </div>

        <div className="capital-grid">
          <div>
            <span>Capital initial</span>
            <strong>
              {formatMoney(
                capital.initialCapital
              )}
            </strong>
          </div>

          <div>
            <span>Risque / trade</span>
            <strong>
              {formatMoney(
                getCapitalRisk(
                  capital
                )
              )}
            </strong>
          </div>

          <div>
            <span>Risque %</span>
            <strong>
              {formatPercent(
                getCapitalRiskPercent(
                  capital
                )
              )}
            </strong>
          </div>

          <div>
            <span>RR de base</span>
            <strong>
              RR{capital.defaultRR}
            </strong>
          </div>
        </div>

        <div className="capital-pnl">
          <span>P/L</span>

          <strong
            className={getResultClass(
              pnl
            )}
          >
            {formatMoney(pnl)}
          </strong>
        </div>

        <div className="capital-actions">
          {capital.status ===
          "archived" ? (
            <button
              className="secondary-button"
              onClick={() =>
                onRestore(
                  capital.id
                )
              }
            >
              <RotateCcw
                size={15}
              />
              Restaurer
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={() =>
                onArchive(
                  capital.id
                )
              }
            >
              <Archive
                size={15}
              />
              Archiver
            </button>
          )}

          <button
            className="danger-button"
            onClick={() =>
              onDelete(capital.id)
            }
          >
            <Trash2 size={15} />
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <PageTitle
          icon={WalletCards}
          title="Capitaux"
          subtitle="Gérez vos capitaux actifs et archivés."
        />

        <button
          className="primary-button"
          onClick={onNew}
        >
          <Plus size={18} />
          Nouveau capital
        </button>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <h2>Capitaux actifs</h2>
          <span>
            {active.length}
          </span>
        </div>

        <div className="capital-list">
          {active.length === 0 ? (
            <div className="empty-state">
              Aucun capital actif.
            </div>
          ) : (
            active.map(renderCapital)
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Capitaux archivés</h2>
          <span>
            {archived.length}
          </span>
        </div>

        <div className="capital-list">
          {archived.length ===
          0 ? (
            <div className="empty-state">
              Aucun capital archivé.
            </div>
          ) : (
            archived.map(
              renderCapital
            )
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardPage({
  capitals,
  trades,
  selectedCapitalId,
  setSelectedCapitalId,
}) {
  const [period, setPeriod] =
    useState("all");

  const selectedCapital =
    capitals.find(
      (capital) =>
        capital.id ===
        selectedCapitalId
    );

  const analyzedData = useMemo(() => {
    const allClosedTrades =
      trades.filter(
        isClosedTrade
      );

    if (
      selectedCapitalId ===
      "all"
    ) {
      const initialCapital =
        capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.initialCapital
            ) || 0),
          0
        );

      const currentBalance =
        capitals.reduce(
          (sum, capital) =>
            sum +
            (Number(
              capital.currentBalance
            ) || 0),
          0
        );

      return {
        capital: null,
        trades: allClosedTrades,
        initialCapital,
        currentBalance,
        name: "Tous les capitaux",
      };
    }

    if (!selectedCapital) {
      return {
        capital: null,
        trades: [],
        initialCapital: 0,
        currentBalance: 0,
        name: "Aucun capital",
      };
    }

    return {
      capital:
        selectedCapital,
      trades:
        allClosedTrades.filter(
          (trade) =>
            trade.capitalId ===
            selectedCapital.id
        ),
      initialCapital:
        Number(
          selectedCapital.initialCapital
        ) || 0,
      currentBalance:
        Number(
          selectedCapital.currentBalance
        ) || 0,
      name:
        selectedCapital.name,
    };
  }, [
    capitals,
    trades,
    selectedCapitalId,
  ]);

  const periodTrades = useMemo(
    () =>
      analyzedData.trades.filter(
        (trade) =>
          isWithinPeriod(
            getTradeDate(trade),
            period
          )
      ),
    [analyzedData.trades, period]
  );

  const stats = useMemo(
    () =>
      calculatePerformanceStats(
        periodTrades,
        analyzedData.initialCapital
      ),
    [
      periodTrades,
      analyzedData.initialCapital,
    ]
  );

  const lifetimeStats = useMemo(
    () =>
      calculatePerformanceStats(
        analyzedData.trades,
        analyzedData.initialCapital
      ),
    [
      analyzedData.trades,
      analyzedData.initialCapital,
    ]
  );

  const groupedStats = useMemo(() => {
    const makeGroup = (
      field
    ) => {
      const map = new Map();

      periodTrades.forEach(
        (trade) => {
          const key =
            trade[field] ||
            "Non renseigné";

          if (!map.has(key)) {
            map.set(key, []);
          }

          map.get(key).push(
            trade
          );
        }
      );

      return Array.from(
        map.entries()
      ).map(
        ([name, group]) => {
          const groupStats =
            calculatePerformanceStats(
              group,
              0
            );

          return {
            id: name,
            name,
            trades:
              groupStats.trades,
            wins:
              groupStats.wins,
            losses:
              groupStats.losses,
            breakevens:
              groupStats.breakevens,
            pnl:
              groupStats.totalPnl,
            winRate:
              groupStats.winRate,
            avgR:
              groupStats.avgR,
          };
        }
      );
    };

    return {
      asset: makeGroup(
        "asset"
      ),
      setup: makeGroup(
        "setup"
      ),
      session: makeGroup(
        "session"
      ),
      timeframe: makeGroup(
        "timeframe"
      ),
      direction: makeGroup(
        "direction"
      ),
      exitType: makeGroup(
        "exitType"
      ),
    };
  }, [periodTrades]);

  const rrStats = useMemo(() => {
    return RR_OPTIONS.map(
      (rr) => {
        const group =
          periodTrades.filter(
            (trade) =>
              Number(
                trade.rr
              ) === rr
          );

        const groupStats =
          calculatePerformanceStats(
            group,
            0
          );

        return {
          id: rr,
          name: `RR${rr}`,
          trades:
            groupStats.trades,
          wins:
            groupStats.wins,
          losses:
            groupStats.losses,
          breakevens:
            groupStats.breakevens,
          pnl:
            groupStats.totalPnl,
          winRate:
            groupStats.winRate,
          avgR:
            groupStats.avgR,
        };
      }
    );
  }, [periodTrades]);

  const recentTrades = useMemo(
    () =>
      periodTrades
        .slice()
        .sort(
          (a, b) =>
            getTradeTimestamp(b) -
            getTradeTimestamp(a)
        )
        .slice(0, 8),
    [periodTrades]
  );

  const capitalInitialTotal =
    capitals.reduce(
      (sum, capital) =>
        sum +
        (Number(
          capital.initialCapital
        ) || 0),
      0
    );

  const capitalBalanceTotal =
    capitals.reduce(
      (sum, capital) =>
        sum +
        (Number(
          capital.currentBalance
        ) || 0),
      0
    );

  const globalStats = useMemo(
    () =>
      calculatePerformanceStats(
        trades,
        capitalInitialTotal
      ),
    [trades, capitalInitialTotal]
  );

  const periodLabel =
    period === "today"
      ? "Aujourd'hui"
      : period === "week"
      ? "Cette semaine"
      : period === "month"
      ? "Ce mois"
      : "Toute la période";

  const selectedRisk =
    selectedCapital
      ? getCapitalRisk(
          selectedCapital
        )
      : capitals.reduce(
          (sum, capital) =>
            sum +
            getCapitalRisk(
              capital
            ),
          0
        );

  const selectedRiskPercent =
    selectedCapital
      ? getCapitalRiskPercent(
          selectedCapital
        )
      : capitalBalanceTotal > 0
      ? (selectedRisk /
          capitalBalanceTotal) *
        100
      : 0;

  return (
    <div className="page">
      <div className="page-header-row">
        <PageTitle
          icon={LayoutDashboard}
          title="Dashboard"
          subtitle="Vue complète de vos performances de trading."
        />

        <div className="dashboard-filter">
          <label>
            Capital analysé
          </label>

          <div className="select-wrapper">
            <select
              value={
                selectedCapitalId
              }
              onChange={(event) =>
                setSelectedCapitalId(
                  event.target.value
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
                    {capital.name}
                    {capital.status ===
                    "archived"
                      ? " — Archivé"
                      : ""}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={16}
            />
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="select-wrapper">
          <select
            value={period}
            onChange={(event) =>
              setPeriod(
                event.target.value
              )
            }
          >
            <option value="all">
              Toute la période
            </option>

            <option value="today">
              Aujourd'hui
            </option>

            <option value="week">
              Cette semaine
            </option>

            <option value="month">
              Ce mois
            </option>
          </select>

          <ChevronDown
            size={16}
          />
        </div>
      </div>

      <div className="analysis-banner">
        <div>
          <span>
            Capital analysé
          </span>

          <strong>
            {analyzedData.name}
          </strong>
        </div>

        <div>
          <span>
            Période
          </span>

          <strong>
            {periodLabel}
          </strong>
        </div>

        <div>
          <span>
            Trades pris en compte
          </span>

          <strong>
            {stats.trades}
          </strong>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Balance actuelle"
          value={formatMoney(
            analyzedData.currentBalance
          )}
          subtitle={
            analyzedData.name
          }
          icon={
            CircleDollarSign
          }
        />

        <MetricCard
          title="P/L"
          value={formatMoney(
            stats.totalPnl
          )}
          subtitle={`${formatPercent(
            stats.pnlPercent
          )} depuis le capital initial`}
          icon={BarChart3}
          tone={getResultClass(
            stats.totalPnl
          )}
        />

        <MetricCard
          title="Win rate"
          value={formatPercent(
            stats.winRate
          )}
          subtitle={`${stats.wins} gains / ${stats.losses} pertes`}
          icon={Check}
        />

        <MetricCard
          title="Profit Factor"
          value={
            stats.profitFactor ===
            Infinity
              ? "∞"
              : formatNumber(
                  stats.profitFactor,
                  2
                )
          }
          subtitle={`Gain brut ${formatMoney(
            stats.grossProfit
          )}`}
          icon={BarChart3}
        />

        <MetricCard
          title="R moyen"
          value={`${formatNumber(
            stats.avgR,
            2
          )}R`}
          subtitle={`${stats.trades} trades`}
          icon={Calculator}
        />

        <MetricCard
          title="Drawdown max."
          value={formatMoney(
            stats.maxDrawdown
          )}
          subtitle={formatPercent(
            stats.maxDrawdownPercent
          )}
          icon={BarChart3}
          tone="negative"
        />

        <MetricCard
          title="Meilleure série"
          value={
            `${stats.bestStreak} trade${
              stats.bestStreak > 1
                ? "s"
                : ""
            }`
          }
          subtitle="Gains consécutifs"
          icon={Check}
        />

        <MetricCard
          title="Pire série"
          value={
            `${stats.worstStreak} trade${
              stats.worstStreak > 1
                ? "s"
                : ""
            }`
          }
          subtitle="Pertes consécutives"
          icon={BarChart3}
          tone="negative"
        />
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="P/L aujourd'hui"
          value={formatMoney(
            lifetimeStats.pnlToday
          )}
          icon={CalendarDays}
          tone={getResultClass(
            lifetimeStats.pnlToday
          )}
        />

        <MetricCard
          title="P/L semaine"
          value={formatMoney(
            lifetimeStats.pnlWeek
          )}
          icon={CalendarDays}
          tone={getResultClass(
            lifetimeStats.pnlWeek
          )}
        />

        <MetricCard
          title="P/L mois"
          value={formatMoney(
            lifetimeStats.pnlMonth
          )}
          icon={CalendarDays}
          tone={getResultClass(
            lifetimeStats.pnlMonth
          )}
        />

        <MetricCard
          title="Risque / trade"
          value={formatMoney(
            selectedRisk
          )}
          subtitle={`≈ ${formatPercent(
            selectedRiskPercent
          )} du capital`}
          icon={CircleDollarSign}
        />

        <MetricCard
          title="Gain moyen"
          value={formatMoney(
            stats.avgWin
          )}
          subtitle={`${stats.wins} trades gagnants`}
          icon={Check}
          tone="positive"
        />

        <MetricCard
          title="Perte moyenne"
          value={formatMoney(
            stats.avgLoss
          )}
          subtitle={`${stats.losses} trades perdants`}
          icon={BarChart3}
          tone="negative"
        />

        <MetricCard
          title="Break-even"
          value={formatPercent(
            stats.breakevenRate
          )}
          subtitle={`${stats.breakevens} trade${
            stats.breakevens > 1
              ? "s"
              : ""
          }`}
          icon={CircleDollarSign}
        />

        <MetricCard
          title="Trades"
          value={stats.trades}
          subtitle={`${stats.wins} W · ${stats.losses} L · ${stats.breakevens} BE`}
          icon={BookOpen}
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Courbe d'équité
            </h2>

            <p>
              Évolution du capital
              selon les trades
              clôturés.
            </p>
          </div>
        </div>

        <div className="chart-container">
          {stats.equityCurve
            .length > 1 ? (
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <AreaChart
                data={
                  stats.equityCurve
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#243044"
                />

                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                />

                <YAxis
                  stroke="#94a3b8"
                />

                <Tooltip
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
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              Pas encore assez de
              données pour afficher
              la courbe.
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Derniers trades
            </h2>

            <p>
              Les derniers trades de
              la période sélectionnée.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Actif</th>
                <th>Direction</th>
                <th>Setup</th>
                <th>Session</th>
                <th>RR</th>
                <th>Sortie</th>
                <th>P/L</th>
                <th>R</th>
              </tr>
            </thead>

            <tbody>
              {recentTrades.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="empty-cell"
                  >
                    Aucun trade sur
                    cette période.
                  </td>
                </tr>
              ) : (
                recentTrades.map(
                  (trade) => {
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
                        <td>
                          {formatDate(
                            trade.dateTime
                          )}
                        </td>

                        <td>
                          {
                            trade.asset
                          }
                        </td>

                        <td>
                          {
                            trade.direction
                          }
                        </td>

                        <td>
                          {
                            trade.setup ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            trade.session ||
                            "-"
                          }
                        </td>

                        <td>
                          RR
                          {
                            trade.rr
                          }
                        </td>

                        <td>
                          {
                            trade.exitType ||
                            "-"
                          }
                        </td>

                        <td
                          className={getResultClass(
                            pnl
                          )}
                        >
                          {formatMoney(
                            pnl
                          )}
                        </td>

                        <td
                          className={getResultClass(
                            getTradeR(
                              trade
                            )
                          )}
                        >
                          {formatNumber(
                            getTradeR(
                              trade
                            ),
                            2
                          )}
                          R
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-column">
        <StatsTable
          title="Par actif"
          rows={
            groupedStats.asset
          }
          columns={[
            {
              key: "name",
              label: "Actif",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "wins",
              label: "W",
            },
            {
              key: "losses",
              label: "L",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
            {
              key: "winRate",
              label: "Win %",
              render: (row) =>
                formatPercent(
                  row.winRate
                ),
            },
          ]}
        />

        <StatsTable
          title="Par setup"
          rows={
            groupedStats.setup
          }
          columns={[
            {
              key: "name",
              label: "Setup",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "wins",
              label: "W",
            },
            {
              key: "losses",
              label: "L",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
            {
              key: "avgR",
              label: "R moyen",
              render: (row) =>
                `${formatNumber(
                  row.avgR,
                  2
                )}R`,
            },
          ]}
        />
      </div>

      <div className="two-column">
        <StatsTable
          title="Par session"
          rows={
            groupedStats.session
          }
          columns={[
            {
              key: "name",
              label: "Session",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
            {
              key: "winRate",
              label: "Win %",
              render: (row) =>
                formatPercent(
                  row.winRate
                ),
            },
          ]}
        />

        <StatsTable
          title="Par timeframe"
          rows={
            groupedStats.timeframe
          }
          columns={[
            {
              key: "name",
              label: "TF",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
            {
              key: "avgR",
              label: "R moyen",
              render: (row) =>
                `${formatNumber(
                  row.avgR,
                  2
                )}R`,
            },
          ]}
        />
      </div>

      <div className="two-column">
        <StatsTable
          title="Par direction"
          rows={
            groupedStats.direction
          }
          columns={[
            {
              key: "name",
              label: "Direction",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "wins",
              label: "W",
            },
            {
              key: "losses",
              label: "L",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
          ]}
        />

        <StatsTable
          title="Par sortie"
          rows={
            groupedStats.exitType
          }
          columns={[
            {
              key: "name",
              label: "Sortie",
            },
            {
              key: "trades",
              label: "Trades",
            },
            {
              key: "pnl",
              label: "P/L",
              render: (row) => (
                <span
                  className={getResultClass(
                    row.pnl
                  )}
                >
                  {formatMoney(
                    row.pnl
                  )}
                </span>
              ),
            },
            {
              key: "avgR",
              label: "R moyen",
              render: (row) =>
                `${formatNumber(
                  row.avgR,
                  2
                )}R`,
            },
          ]}
        />
      </div>

      <StatsTable
        title="Analyse par RR"
        rows={rrStats}
        columns={[
          {
            key: "name",
            label: "RR",
          },
          {
            key: "trades",
            label: "Trades",
          },
          {
            key: "wins",
            label: "W",
          },
          {
            key: "losses",
            label: "L",
          },
          {
            key: "breakevens",
            label: "BE",
          },
          {
            key: "winRate",
            label: "Win %",
            render: (row) =>
              formatPercent(
                row.winRate
              ),
          },
          {
            key: "pnl",
            label: "P/L",
            render: (row) => (
              <span
                className={getResultClass(
                  row.pnl
                )}
              >
                {formatMoney(
                  row.pnl
                )}
              </span>
            ),
          },
          {
            key: "avgR",
            label: "R moyen",
            render: (row) =>
              `${formatNumber(
                row.avgR,
                2
              )}R`,
          },
        ]}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Performance globale
            </h2>

            <p>
              Cette section prend
              toujours en compte tous
              les capitaux, actifs et
              archivés.
            </p>
          </div>
        </div>

        <div className="global-grid">
          <div>
            <span>
              Capital initial total
            </span>

            <strong>
              {formatMoney(
                capitalInitialTotal
              )}
            </strong>
          </div>

          <div>
            <span>
              Balance totale
            </span>

            <strong>
              {formatMoney(
                capitalBalanceTotal
              )}
            </strong>
          </div>

          <div>
            <span>
              P/L total
            </span>

            <strong
              className={getResultClass(
                globalStats.totalPnl
              )}
            >
              {formatMoney(
                globalStats.totalPnl
              )}
            </strong>
          </div>

          <div>
            <span>
              Rendement total
            </span>

            <strong
              className={getResultClass(
                globalStats.pnlPercent
              )}
            >
              {formatPercent(
                globalStats.pnlPercent
              )}
            </strong>
          </div>

          <div>
            <span>
              Trades clôturés
            </span>

            <strong>
              {globalStats.trades}
            </strong>
          </div>

          <div>
            <span>
              Win rate global
            </span>

            <strong>
              {formatPercent(
                globalStats.winRate
              )}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function JournalPage({
  trades,
  capitals,
  filter,
  setFilter,
  onNew,
  onDelete,
}) {
  const filteredTrades =
    trades
      .filter(isClosedTrade)
      .filter((trade) => {
        if (filter === "all") {
          return true;
        }

        return (
          trade.capitalId ===
          filter
        );
      })
      .slice()
      .sort(
        (a, b) =>
          getTradeTimestamp(b) -
          getTradeTimestamp(a)
      );

  const capitalName = (
    id
  ) =>
    capitals.find(
      (capital) =>
        capital.id === id
    )?.name || "Inconnu";

  return (
    <div className="page">
      <div className="page-header-row">
        <PageTitle
          icon={BookOpen}
          title="Journal"
          subtitle="Historique complet de vos trades."
        />

        <button
          className="primary-button"
          onClick={onNew}
        >
          <Plus size={18} />
          Nouveau trade
        </button>
      </div>

      <div className="toolbar">
        <div className="select-wrapper">
          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
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
                  {capital.name}
                </option>
              )
            )}
          </select>

          <ChevronDown
            size={16}
          />
        </div>
      </div>

      <section className="panel">
        <div className="table-wrapper">
          <table>
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
                <th>P/L</th>
                <th>R</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredTrades.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="12"
                    className="empty-cell"
                  >
                    Aucun trade.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(
                  (trade) => {
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
                        <td>
                          {formatDate(
                            trade.dateTime
                          )}
                        </td>

                        <td>
                          {
                            capitalName(
                              trade.capitalId
                            )
                          }
                        </td>

                        <td>
                          {trade.asset}
                        </td>

                        <td>
                          {trade.direction}
                        </td>

                        <td>
                          {trade.entry}
                        </td>

                        <td>
                          {
                            trade.stopLoss
                          }
                        </td>

                        <td>
                          {trade.tp}
                        </td>

                        <td>
                          RR
                          {trade.rr}
                        </td>

                        <td>
                          {trade.exitPrice}
                        </td>

                        <td
                          className={getResultClass(
                            pnl
                          )}
                        >
                          {formatMoney(
                            pnl
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            getTradeR(
                              trade
                            ),
                            2
                          )}
                          R
                        </td>

                        <td>
                          <button
                            className="icon-button danger"
                            onClick={() =>
                              onDelete(
                                trade.id
                              )
                            }
                            title="Supprimer"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CalendarPage({
  trades,
}) {
  const [currentDate, setCurrentDate] =
    useState(
      new Date()
    );

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  const monthName =
    currentDate.toLocaleDateString(
      "fr-FR",
      {
        month: "long",
        year: "numeric",
      }
    );

  const monthTrades =
    useMemo(
      () =>
        trades.filter(
          (trade) => {
            const date =
              getTradeDate(
                trade
              );

            return (
              isClosedTrade(
                trade
              ) &&
              date &&
              date.getFullYear() ===
                year &&
              date.getMonth() ===
                month
            );
          }
        ),
      [
        trades,
        year,
        month,
      ]
    );

  const dailyStats =
    useMemo(() => {
      const map = new Map();

      monthTrades.forEach(
        (trade) => {
          const date =
            getTradeDate(
              trade
            );

          if (!date) return;

          const key =
            date
              .toISOString()
              .slice(0, 10);

          if (!map.has(key)) {
            map.set(key, {
              date,
              pnl: 0,
              trades: 0,
              wins: 0,
              losses: 0,
              breakevens: 0,
              r: 0,
            });
          }

          const item =
            map.get(key);

          const pnl =
            getTradeNetPnl(
              trade
            );

          item.pnl += pnl;
          item.trades += 1;
          item.r += getTradeR(
            trade
          );

          if (pnl > 0) {
            item.wins += 1;
          } else if (
            pnl < 0
          ) {
            item.losses += 1;
          } else {
            item.breakevens += 1;
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.date - b.date
      );
    }, [
      monthTrades,
    ]);

  const monthPnl =
    monthTrades.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(trade),
      0
    );

  const monthR =
    monthTrades.reduce(
      (sum, trade) =>
        sum +
        getTradeR(trade),
      0
    );

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const mondayOffset =
    firstDay === 0
      ? 6
      : firstDay - 1;

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const cells = [];

  for (
    let index = 0;
    index < mondayOffset;
    index += 1
  ) {
    cells.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    cells.push(day);
  }

  while (
    cells.length % 7 !==
    0
  ) {
    cells.push(null);
  }

  function getDayStats(day) {
    if (!day) return null;

    return dailyStats.find(
      (item) =>
        item.date.getDate() ===
        day
    );
  }

  return (
    <div className="page">
      <PageTitle
        icon={CalendarDays}
        title="Calendrier"
        subtitle="Visualisez votre performance jour par jour."
      />

      <div className="calendar-toolbar">
        <button
          className="secondary-button"
          onClick={() =>
            setCurrentDate(
              new Date(
                year,
                month - 1,
                1
              )
            )
          }
        >
          ←
        </button>

        <h2>
          {monthName}
        </h2>

        <button
          className="secondary-button"
          onClick={() =>
            setCurrentDate(
              new Date(
                year,
                month + 1,
                1
              )
            )
          }
        >
          →
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="P/L du mois"
          value={formatMoney(
            monthPnl
          )}
          icon={BarChart3}
          tone={getResultClass(
            monthPnl
          )}
        />

        <MetricCard
          title="Trades"
          value={
            monthTrades.length
          }
          icon={BookOpen}
        />

        <MetricCard
          title="R total"
          value={`${formatNumber(
            monthR,
            2
          )}R`}
          icon={Calculator}
        />

        <MetricCard
          title="Jours actifs"
          value={
            dailyStats.length
          }
          icon={CalendarDays}
        />
      </div>

      <section className="panel">
        <div className="calendar-grid">
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
              className="calendar-weekday"
              key={day}
            >
              {day}
            </div>
          ))}

          {cells.map(
            (day, index) => {
              const stats =
                getDayStats(
                  day
                );

              return (
                <div
                  className={`calendar-day ${
                    day
                      ? ""
                      : "empty"
                  }`}
                  key={
                    `${day}-${index}`
                  }
                >
                  {day && (
                    <>
                      <strong>
                        {day}
                      </strong>

                      {stats && (
                        <div>
                          <span
                            className={getResultClass(
                              stats.pnl
                            )}
                          >
                            {formatMoney(
                              stats.pnl
                            )}
                          </span>

                          <small>
                            {
                              stats.trades
                            }{" "}
                            trade
                            {stats.trades >
                            1
                              ? "s"
                              : ""}
                          </small>

                          <small>
                            {formatNumber(
                              stats.r,
                              2
                            )}
                            R
                          </small>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>

      <StatsTable
        title="Détail des journées"
        rows={dailyStats}
        columns={[
          {
            key: "date",
            label: "Date",
            render: (row) =>
              row.date.toLocaleDateString(
                "fr-FR"
              ),
          },
          {
            key: "trades",
            label: "Trades",
          },
          {
            key: "wins",
            label: "W",
          },
          {
            key: "losses",
            label: "L",
          },
          {
            key: "breakevens",
            label: "BE",
          },
          {
            key: "pnl",
            label: "P/L",
            render: (row) => (
              <span
                className={getResultClass(
                  row.pnl
                )}
              >
                {formatMoney(
                  row.pnl
                )}
              </span>
            ),
          },
          {
            key: "r",
            label: "R",
            render: (row) =>
              `${formatNumber(
                row.r,
                2
              )}R`,
          },
        ]}
      />
    </div>
  );
}

function CalculatorPage({
  capitals,
}) {
  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status !==
        "archived"
    );

  const [
    capitalId,
    setCapitalId,
  ] = useState(
    activeCapitals[0]?.id ||
      ""
  );

  const [asset, setAsset] =
    useState("XAUUSD");

  const [
    direction,
    setDirection,
  ] = useState("BUY");

  const [entry, setEntry] =
    useState("");

  const [stopLoss, setStopLoss] =
    useState("");

  const [rr, setRR] =
    useState(2);

  const capital =
    activeCapitals.find(
      (item) =>
        item.id === capitalId
    );

  const riskMoney =
    getCapitalRisk(
      capital
    );

  const stopPips =
    calculateStopPips(
      asset,
      entry,
      stopLoss
    );

  const pipValue =
    getPipValuePerLot(
      asset,
      entry
    );

  const lot =
    calculateLot(
      riskMoney,
      stopPips,
      pipValue
    );

  const tp =
    calculateTP(
      direction,
      entry,
      stopLoss,
      rr
    );

  return (
    <div className="page">
      <PageTitle
        icon={Calculator}
        title="Calculateur"
        subtitle="Calculez le risque, le lot et les objectifs sans créer de trade."
      />

      <div className="calculator-layout">
        <section className="panel">
          <div className="form-grid">
            <div className="field">
              <label>
                Capital
              </label>

              <select
                value={capitalId}
                onChange={(event) =>
                  setCapitalId(
                    event.target
                      .value
                  )
                }
              >
                {activeCapitals.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {item.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="field">
              <label>
                Actif
              </label>

              <select
                value={asset}
                onChange={(event) =>
                  setAsset(
                    event.target
                      .value
                  )
                }
              >
                {ASSETS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="field">
              <label>
                Direction
              </label>

              <select
                value={
                  direction
                }
                onChange={(event) =>
                  setDirection(
                    event.target
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

            <div className="field">
              <label>
                Entrée
              </label>

              <input
                type="number"
                value={entry}
                onChange={(event) =>
                  setEntry(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                Stop Loss
              </label>

              <input
                type="number"
                value={stopLoss}
                onChange={(event) =>
                  setStopLoss(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                RR
              </label>

              <select
                value={rr}
                onChange={(event) =>
                  setRR(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                {RR_OPTIONS.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      RR{value}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="panel calculator-result">
          <h2>Résultat</h2>

          <div className="calculator-result-grid">
            <div>
              <span>
                Risque
              </span>

              <strong>
                {formatMoney(
                  riskMoney
                )}
              </strong>
            </div>

            <div>
              <span>
                Stop
              </span>

              <strong>
                {formatNumber(
                  stopPips,
                  1
                )}{" "}
                pips
              </strong>
            </div>

            <div>
              <span>
                Valeur pip / lot
              </span>

              <strong>
                $
                {formatNumber(
                  pipValue,
                  4
                )}
              </strong>
            </div>

            <div>
              <span>
                Lot
              </span>

              <strong>
                {formatNumber(
                  lot,
                  2
                )}
              </strong>
            </div>

            <div>
              <span>
                Take Profit
              </span>

              <strong>
                {tp
                  ? formatNumber(
                      tp,
                      asset ===
                        "USDJPY"
                        ? 3
                        : 2
                    )
                  : "-"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <StatsTable
        title="Objectifs RR"
        rows={RR_OPTIONS.map(
          (value) => ({
            id: value,
            rr: value,
            tp: calculateTP(
              direction,
              entry,
              stopLoss,
              value
            ),
          })
        )}
        columns={[
          {
            key: "rr",
            label: "RR",
            render: (row) =>
              `RR${row.rr}`,
          },
          {
            key: "tp",
            label: "Take Profit",
            render: (row) =>
              row.tp
                ? formatNumber(
                    row.tp,
                    asset ===
                      "USDJPY"
                      ? 3
                      : 2
                  )
                : "-",
          },
        ]}
      />
    </div>
  );
}

function SettingsPage({
  capitals,
  trades,
}) {
  return (
    <div className="page">
      <PageTitle
        icon={Settings}
        title="Paramètres"
        subtitle="Informations générales sur votre journal."
      />

      <section className="panel">
        <h2>
          Données locales
        </h2>

        <div className="settings-info">
          <div>
            <span>
              Capitaux
            </span>

            <strong>
              {capitals.length}
            </strong>
          </div>

          <div>
            <span>
              Trades
            </span>

            <strong>
              {trades.length}
            </strong>
          </div>

          <div>
            <span>
              Trades clôturés
            </span>

            <strong>
              {
                trades.filter(
                  isClosedTrade
                ).length
              }
            </strong>
          </div>
        </div>

        <p className="settings-note">
          Les données du journal sont
          actuellement sauvegardées
          dans le stockage local du
          navigateur.
        </p>
      </section>
    </div>
  );
}

function CapitalModal({
  open,
  editingCapitalId,
  form,
  setForm,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>
            {editingCapitalId
              ? "Modifier le capital"
              : "Nouveau capital"}
          </h2>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label>
              Nom du capital
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target
                    .value,
                })
              }
              placeholder="Capital Test"
            />
          </div>

          <div className="field">
            <label>
              Capital initial
            </label>

            <input
              type="number"
              value={
                form.initialCapital
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  initialCapital:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Balance actuelle
            </label>

            <input
              type="number"
              value={
                form.currentBalance
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  currentBalance:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Mode de risque
            </label>

            <select
              value={
                form.riskMode
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  riskMode:
                    event.target
                      .value,
                })
              }
            >
              <option value="percentage">
                Pourcentage
              </option>

              <option value="fixed">
                Montant fixe
              </option>
            </select>
          </div>

          {form.riskMode ===
          "percentage" ? (
            <div className="field">
              <label>
                Risque %
              </label>

              <input
                type="number"
                step="0.01"
                value={
                  form.riskPercent
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    riskPercent:
                      event.target
                        .value,
                  })
                }
              />
            </div>
          ) : (
            <div className="field">
              <label>
                Risque fixe
              </label>

              <input
                type="number"
                step="0.01"
                value={
                  form.riskAmount
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    riskAmount:
                      event.target
                        .value,
                  })
                }
              />
            </div>
          )}

          <div className="field">
            <label>
              RR de base
            </label>

            <select
              value={
                form.defaultRR
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  defaultRR:
                    event.target
                      .value,
                })
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
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
          >
            Annuler
          </button>

          <button
            className="primary-button"
            onClick={onSave}
          >
            <Check size={17} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeModal({
  open,
  form,
  setForm,
  capitals,
  onClose,
  onSave,
}) {
  if (!open) return null;

  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status !==
        "archived"
    );

  const capital =
    activeCapitals.find(
      (item) =>
        item.id ===
        form.capitalId
    );

  const riskMoney =
    getCapitalRisk(capital);

  const entry =
    Number(form.entry);

  const stopLoss =
    Number(form.stopLoss);

  const stopPips =
    calculateStopPips(
      form.asset,
      entry,
      stopLoss
    );

  const pipValue =
    getPipValuePerLot(
      form.asset,
      entry
    );

  const lot =
    calculateLot(
      riskMoney,
      stopPips,
      pipValue
    );

  const tp =
    calculateTP(
      form.direction,
      entry,
      stopLoss,
      form.rr
    );

  let automaticExit =
    tp;

  if (
    form.exitType ===
    "SL"
  ) {
    automaticExit =
      stopLoss;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal large">
        <div className="modal-header">
          <h2>
            Nouveau trade
          </h2>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>
              Capital
            </label>

            <select
              value={
                form.capitalId
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  capitalId:
                    event.target
                      .value,
                })
              }
            >
              {activeCapitals.map(
                (capitalItem) => (
                  <option
                    key={
                      capitalItem.id
                    }
                    value={
                      capitalItem.id
                    }
                  >
                    {
                      capitalItem.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label>
              Actif
            </label>

            <select
              value={form.asset}
              onChange={(event) =>
                setForm({
                  ...form,
                  asset:
                    event.target
                      .value,
                })
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
          </div>

          <div className="field">
            <label>
              Date / heure
            </label>

            <input
              type="datetime-local"
              value={
                form.dateTime
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  dateTime:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Session
            </label>

            <select
              value={
                form.session
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  session:
                    event.target
                      .value,
                })
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
          </div>

          <div className="field">
            <label>
              Direction
            </label>

            <select
              value={
                form.direction
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  direction:
                    event.target
                      .value,
                })
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

          <div className="field">
            <label>
              Timeframe
            </label>

            <select
              value={
                form.timeframe
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  timeframe:
                    event.target
                      .value,
                })
              }
            >
              {TIMEFRAMES.map(
                (tf) => (
                  <option
                    key={tf}
                    value={tf}
                  >
                    {tf}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label>
              Entrée
            </label>

            <input
              type="number"
              step="any"
              value={form.entry}
              onChange={(event) =>
                setForm({
                  ...form,
                  entry:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Stop Loss
            </label>

            <input
              type="number"
              step="any"
              value={
                form.stopLoss
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  stopLoss:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              RR
            </label>

            <select
              value={form.rr}
              onChange={(event) =>
                setForm({
                  ...form,
                  rr: event.target
                    .value,
                })
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

          <div className="field">
            <label>
              Type de sortie
            </label>

            <select
              value={
                form.exitType
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  exitType:
                    event.target
                      .value,
                  exitPrice: "",
                })
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

          <div className="field">
            <label>
              Prix de sortie
            </label>

            {form.exitType ===
            "BE" ? (
              <input
                type="number"
                step="any"
                value={
                  form.exitPrice
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    exitPrice:
                      event.target
                        .value,
                  })
                }
                placeholder="Prix réel de sortie"
              />
            ) : (
              <input
                value={
                  automaticExit
                    ? formatNumber(
                        automaticExit,
                        form.asset ===
                          "USDJPY"
                          ? 3
                          : 2
                      )
                    : ""
                }
                readOnly
              />
            )}
          </div>

          <div className="field">
            <label>
              Setup
            </label>

            <select
              value={
                form.setup
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  setup:
                    event.target
                      .value,
                })
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
          </div>

          <div className="field">
            <label>
              Frais
            </label>

            <input
              type="number"
              step="0.01"
              value={form.fees}
              onChange={(event) =>
                setForm({
                  ...form,
                  fees:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field">
            <label>
              Swap
            </label>

            <input
              type="number"
              step="0.01"
              value={form.swap}
              onChange={(event) =>
                setForm({
                  ...form,
                  swap:
                    event.target
                      .value,
                })
              }
            />
          </div>
        </div>

        <div className="trade-preview">
          <div>
            <span>
              Risque
            </span>

            <strong>
              {formatMoney(
                riskMoney
              )}
            </strong>
          </div>

          <div>
            <span>
              Stop
            </span>

            <strong>
              {formatNumber(
                stopPips,
                1
              )}{" "}
              pips
            </strong>
          </div>

          <div>
            <span>
              Valeur pip
            </span>

            <strong>
              $
              {formatNumber(
                pipValue,
                4
              )}
            </strong>
          </div>

          <div>
            <span>
              Lot
            </span>

            <strong>
              {formatNumber(
                lot,
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              TP calculé
            </span>

            <strong>
              {tp
                ? formatNumber(
                    tp,
                    form.asset ===
                      "USDJPY"
                      ? 3
                      : 2
                  )
                : "-"}
            </strong>
          </div>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label>
              Raison d'entrée
            </label>

            <textarea
              value={
                form.entryReason
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  entryReason:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field full">
            <label>
              Raison de sortie
            </label>

            <textarea
              value={
                form.exitReason
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  exitReason:
                    event.target
                      .value,
                })
              }
            />
          </div>

          <div className="field full">
            <label>
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm({
                  ...form,
                  notes:
                    event.target
                      .value,
                })
              }
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
          >
            Annuler
          </button>

          <button
            className="primary-button"
            onClick={onSave}
          >
            <Check size={17} />
            Enregistrer le trade
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  activePage,
  navigate,
  open,
}) {
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
    <aside
      className={`sidebar ${
        open ? "open" : ""
      }`}
    >
      <div className="brand">
        <div className="brand-mark">
          A
        </div>

        <div>
          <strong>
            ARCH
          </strong>

          <span>
            Trading Journal
          </span>
        </div>
      </div>

      <nav>
        {items.map(
          ({
            id,
            label,
            icon: Icon,
          }) => (
            <button
              key={id}
              className={
                activePage === id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                navigate(id)
              }
            >
              <Icon size={19} />
              <span>
                {label}
              </span>
            </button>
          )
        )}
      </nav>
    </aside>
  );
}

function Topbar({
  onMenu,
  title,
}) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        onClick={onMenu}
      >
        <ChevronDown
          size={20}
        />
      </button>

      <div>
        <span>
          Trading Journal
        </span>

        <strong>
          {title}
        </strong>
      </div>
    </header>
  );
}

export default function App() {
  const [
    activePage,
    setActivePage,
  ] = useState(
    "dashboard"
  );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

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

  const [
    dashboardCapitalFilter,
    setDashboardCapitalFilter,
  ] = useState("all");

  const [
    capitalModalOpen,
    setCapitalModalOpen,
  ] = useState(false);

  const [
    editingCapitalId,
    setEditingCapitalId,
  ] = useState(null);

  const [
    capitalForm,
    setCapitalForm,
  ] = useState({
    name: "",
    initialCapital: "",
    currentBalance: "",
    riskMode: "percentage",
    riskPercent: "1",
    riskAmount: "",
    defaultRR: "2",
  });

  const [
    tradeModalOpen,
    setTradeModalOpen,
  ] = useState(false);

  const [
    tradeForm,
    setTradeForm,
  ] = useState({
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

  const [
    tradeCapitalFilter,
    setTradeCapitalFilter,
  ] = useState("all");

  const [
    notification,
    setNotification,
  ] = useState(null);

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
    if (!notification) {
      return;
    }

    const timer =
      setTimeout(() => {
        setNotification(null);
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (
      dashboardCapitalFilter ===
      "all"
    ) {
      return;
    }

    if (!capitals.length) {
      setDashboardCapitalFilter(
        "all"
      );
      return;
    }

    const exists =
      capitals.some(
        (capital) =>
          capital.id ===
          dashboardCapitalFilter
      );

    if (!exists) {
      setDashboardCapitalFilter(
        "all"
      );
    }
  }, [
    capitals,
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
      name: capital.name || "",
      initialCapital:
        capital.initialCapital ??
        "",
      currentBalance:
        capital.currentBalance ??
        "",
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
        "Veuillez donner un nom au capital.",
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
      capitalForm.riskMode ===
      "percentage"
    ) {
      if (
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
    } else {
      if (
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
    }

    if (editingCapitalId) {
      setCapitals(
        (current) =>
          current.map(
            (capital) =>
              capital.id ===
              editingCapitalId
                ? {
                    ...capital,
                    name,
                    initialCapital:
                      initial,
                    currentBalance:
                      Number(
                        capitalForm.currentBalance
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
                    defaultRR:
                      Number(
                        capitalForm.defaultRR
                      ) || 2,
                  }
                : capital
          )
      );

      showNotification(
        "Capital modifié."
      );
    } else {
      const capital = {
        id: createId(
          "capital"
        ),
        name,
        initialCapital:
          initial,
        currentBalance:
          Number(
            capitalForm.currentBalance
          ) || initial,
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
        status: "active",
        createdAt:
          new Date().toISOString(),
      };

      setCapitals(
        (current) => [
          ...current,
          capital,
        ]
      );

      if (
        dashboardCapitalFilter ===
        "all"
      ) {
        setDashboardCapitalFilter(
          capital.id
        );
      }

      showNotification(
        "Capital créé."
      );
    }

    setCapitalModalOpen(false);
  }

  function archiveCapital(id) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id === id
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

  function restoreCapital(id) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id === id
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

  function deleteCapital(id) {
    const linkedTrades =
      trades.some(
        (trade) =>
          trade.capitalId === id
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
            capital.id !== id
        )
    );

    if (
      dashboardCapitalFilter ===
      id
    ) {
      setDashboardCapitalFilter(
        "all"
      );
    }

    showNotification(
      "Capital supprimé."
    );
  }

  function openNewTradeModal() {
    const activeCapitals =
      capitals.filter(
        (capital) =>
          capital.status !==
          "archived"
      );

    if (
      activeCapitals.length ===
      0
    ) {
      showNotification(
        "Créez d'abord un capital actif.",
        "error"
      );
      return;
    }

    const capital =
      activeCapitals[0];

    const now =
      new Date();

    const localDate =
      new Date(
        now.getTime() -
          now.getTimezoneOffset() *
            60000
      )
        .toISOString()
        .slice(0, 16);

    setTradeForm({
      capitalId:
        capital.id,
      asset: "XAUUSD",
      dateTime:
        localDate,
      session: "New York",
      direction: "BUY",
      timeframe: "M15",
      entry: "",
      stopLoss: "",
      rr: String(
        capital.defaultRR ||
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

    setTradeModalOpen(
      true
    );
  }

  function saveTrade() {
    const capital =
      capitals.find(
        (item) =>
          item.id ===
          tradeForm.capitalId
      );

    if (!capital) {
      showNotification(
        "Capital invalide.",
        "error"
      );
      return;
    }

    const entry =
      Number(
        tradeForm.entry
      );

    const stopLoss =
      Number(
        tradeForm.stopLoss
      );

    if (
      !Number.isFinite(
        entry
      ) ||
      !Number.isFinite(
        stopLoss
      ) ||
      entry <= 0 ||
      stopLoss <= 0
    ) {
      showNotification(
        "Veuillez renseigner une entrée et un Stop Loss valides.",
        "error"
      );
      return;
    }

    const stopPips =
      calculateStopPips(
        tradeForm.asset,
        entry,
        stopLoss
      );

    if (stopPips <= 0) {
      showNotification(
        "Le Stop Loss doit être différent du prix d'entrée.",
        "error"
      );
      return;
    }

    const riskMoney =
      getCapitalRisk(
        capital
      );

    const riskPercent =
      getCapitalRiskPercent(
        capital
      );

    const pipValue =
      getPipValuePerLot(
        tradeForm.asset,
        entry
      );

    const lot =
      calculateLot(
        riskMoney,
        stopPips,
        pipValue
      );

    if (lot <= 0) {
      showNotification(
        "Le lot calculé est invalide. Vérifiez le risque et le Stop Loss.",
        "error"
      );
      return;
    }

    const tp =
      calculateTP(
        tradeForm.direction,
        entry,
        stopLoss,
        tradeForm.rr
      );

    let exitPrice = 0;

    if (
      tradeForm.exitType ===
      "TP"
    ) {
      exitPrice = tp;
    } else if (
      tradeForm.exitType ===
      "SL"
    ) {
      exitPrice = stopLoss;
    } else {
      exitPrice =
        Number(
          tradeForm.exitPrice
        );

      if (
        !Number.isFinite(
          exitPrice
        ) ||
        exitPrice <= 0
      ) {
        showNotification(
          "Pour une sortie BE, indiquez le prix réel de sortie.",
          "error"
        );
        return;
      }
    }

    const resultPips =
      calculateDirectionalPips(
        tradeForm.asset,
        tradeForm.direction,
        entry,
        exitPrice
      );

    const grossPnl =
      resultPips *
      lot *
      pipValue;

    const fees =
      Number(
        tradeForm.fees
      ) || 0;

    const swap =
      Number(
        tradeForm.swap
      ) || 0;

    const netPnl =
      grossPnl -
      fees +
      swap;

    const resultR =
      riskMoney > 0
        ? netPnl /
          riskMoney
        : 0;

    const trade = {
      id: createId(
        "trade"
      ),
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
      entry,
      stopLoss,
      rr:
        Number(
          tradeForm.rr
        ),
      tp,
      stopPips,
      pipValue,
      lot,
      riskMoney,
      riskPercent,
      exitType:
        tradeForm.exitType,
      exitPrice,
      grossPnl,
      fees,
      swap,
      pnl: netPnl,
      resultPips,
      resultR,
      result:
        netPnl > 0
          ? "Win"
          : netPnl < 0
          ? "Loss"
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
      capitalRiskSnapshot:
        riskMoney,
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
                    (Number(
                      item.currentBalance
                    ) || 0) +
                    netPnl,
                }
              : item
        )
    );

    setTradeModalOpen(
      false
    );

    showNotification(
      `Trade enregistré : ${formatMoney(
        netPnl
      )}`
    );
  }

  function deleteTrade(id) {
    const trade =
      trades.find(
        (item) =>
          item.id === id
      );

    if (!trade) {
      return;
    }

    if (
      !window.confirm(
        "Supprimer ce trade ? Le P/L sera retiré du capital concerné."
      )
    ) {
      return;
    }

    const pnl =
      getTradeNetPnl(
        trade
      );

    setTrades(
      (current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
    );

    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            trade.capitalId
              ? {
                  ...capital,
                  currentBalance:
                    (Number(
                      capital.currentBalance
                    ) || 0) -
                    pnl,
                }
              : capital
        )
    );

    showNotification(
      "Trade supprimé."
    );
  }

  const pageTitles = {
    dashboard: "Dashboard",
    journal: "Journal",
    capitals: "Capitaux",
    calendar: "Calendrier",
    calculator: "Calculateur",
    settings: "Paramètres",
  };

  function renderPage() {
    switch (
      activePage
    ) {
      case "dashboard":
        return (
          <DashboardPage
            capitals={capitals}
            trades={trades}
            selectedCapitalId={
              dashboardCapitalFilter
            }
            setSelectedCapitalId={
              setDashboardCapitalFilter
            }
          />
        );

      case "journal":
        return (
          <JournalPage
            trades={trades}
            capitals={capitals}
            filter={
              tradeCapitalFilter
            }
            setFilter={
              setTradeCapitalFilter
            }
            onNew={
              openNewTradeModal
            }
            onDelete={
              deleteTrade
            }
          />
        );

      case "capitals":
        return (
          <CapitalPage
            capitals={capitals}
            trades={trades}
            onNew={
              openNewCapitalModal
            }
            onEdit={
              openEditCapitalModal
            }
            onArchive={
              archiveCapital
            }
            onRestore={
              restoreCapital
            }
            onDelete={
              deleteCapital
            }
          />
        );

      case "calendar":
        return (
          <CalendarPage
            trades={trades}
          />
        );

      case "calculator":
        return (
          <CalculatorPage
            capitals={capitals}
          />
        );

      case "settings":
        return (
          <SettingsPage
            capitals={capitals}
            trades={trades}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div className="app">
      <Sidebar
        activePage={
          activePage
        }
        navigate={navigate}
        open={sidebarOpen}
      />

      <div className="main-shell">
        <Topbar
          title={
            pageTitles[
              activePage
            ]
          }
          onMenu={() =>
            setSidebarOpen(
              (value) =>
                !value
            )
          }
        />

        <main>
          {renderPage()}
        </main>
      </div>

      {notification && (
        <div
          className={`notification ${notification.type}`}
        >
          <Check size={17} />

          <span>
            {
              notification.message
            }
          </span>
        </div>
      )}

      <CapitalModal
        open={
          capitalModalOpen
        }
        editingCapitalId={
          editingCapitalId
        }
        form={capitalForm}
        setForm={
          setCapitalForm
        }
        onClose={() =>
          setCapitalModalOpen(
            false
          )
        }
        onSave={saveCapital}
      />

      <TradeModal
        open={tradeModalOpen}
        form={tradeForm}
        setForm={setTradeForm}
        capitals={capitals}
        onClose={() =>
          setTradeModalOpen(
            false
          )
        }
        onSave={saveTrade}
      />
    </div>
  );
}
