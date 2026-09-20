import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Archive,
  BarChart3,
  BookOpen,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  LayoutDashboard,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
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

const CAPITALS_STORAGE_KEY =
  "trading-journal-capitals";

const TRADES_STORAGE_KEY =
  "trading-journal-trades";

const BACKUP_VERSION = 1;

const RESULT_EPSILON = 0.000001;

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

const EXIT_TYPES = [
  "TP",
  "SL",
  "BE",
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

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function getDateTimeInputValue(value) {
  if (!value) {
    const now = new Date();

    return new Date(
      now.getTime() -
        now.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
}

function getPeriodBounds(
  periodFilter,
  dateFrom,
  dateTo
) {
  const now = new Date();

  if (periodFilter === "all") {
    return {
      start: null,
      end: null,
    };
  }

  if (periodFilter === "today") {
    const start = new Date(now);

    start.setHours(
      0,
      0,
      0,
      0
    );

    const end = new Date(start);

    end.setDate(
      end.getDate() + 1
    );

    return {
      start,
      end,
    };
  }

  if (periodFilter === "last7") {
    const start = new Date(now);

    start.setHours(
      0,
      0,
      0,
      0
    );

    start.setDate(
      start.getDate() - 6
    );

    const end = new Date(now);

    end.setHours(
      0,
      0,
      0,
      0
    );

    end.setDate(
      end.getDate() + 1
    );

    return {
      start,
      end,
    };
  }

  if (periodFilter === "last30") {
    const start = new Date(now);

    start.setHours(
      0,
      0,
      0,
      0
    );

    start.setDate(
      start.getDate() - 29
    );

    const end = new Date(now);

    end.setHours(
      0,
      0,
      0,
      0
    );

    end.setDate(
      end.getDate() + 1
    );

    return {
      start,
      end,
    };
  }

  if (periodFilter === "month") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    return {
      start,
      end,
    };
  }

  if (periodFilter === "custom") {
    let start = null;
    let end = null;

    if (dateFrom) {
      start = new Date(
        `${dateFrom}T00:00:00`
      );
    }

    if (dateTo) {
      end = new Date(
        `${dateTo}T00:00:00`
      );

      if (!Number.isNaN(end.getTime())) {
        end.setDate(
          end.getDate() + 1
        );
      }
    }

    return {
      start:
        start &&
        !Number.isNaN(
          start.getTime()
        )
          ? start
          : null,
      end:
        end &&
        !Number.isNaN(
          end.getTime()
        )
          ? end
          : null,
    };
  }

  return {
    start: null,
    end: null,
  };
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

function getPipValuePerLot(
  asset,
  price
) {
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

  if (
    asset === "USDCAD" ||
    asset === "USDCHF"
  ) {
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
      ? Number(exit) -
        Number(entry)
      : Number(entry) -
        Number(exit);

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
    Math.floor(
      rawLot * 100
    ) / 100
  );
}

function getCapitalRisk(
  capital
) {
  if (!capital) {
    return 0;
  }

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
  if (!capital) {
    return 0;
  }

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

function isBreakEvenPnl(value) {
  const pnl = Number(value);

  return (
    Number.isFinite(pnl) &&
    Math.abs(pnl) <=
      RESULT_EPSILON
  );
}

function getTradeExitType(
  trade
) {
  const exitType = String(
    trade?.exitType || ""
  ).toUpperCase();

  if (
    EXIT_TYPES.includes(
      exitType
    )
  ) {
    return exitType;
  }

  return "BE";
}

function getTradeNetPnl(
  trade
) {
  if (!trade) {
    return 0;
  }

  const storedPnl =
    Number(trade.pnl);

  const resultR =
    Number(trade.resultR);

  const riskMoney =
    Number(trade.riskMoney);

  const grossPnl =
    Number(trade.grossPnl);

  const fees =
    Number(trade.fees) || 0;

  const swap =
    Number(trade.swap) || 0;

  if (
    Number.isFinite(
      storedPnl
    ) &&
    !isBreakEvenPnl(
      storedPnl
    )
  ) {
    return storedPnl;
  }

  if (
    Number.isFinite(
      resultR
    ) &&
    Number.isFinite(
      riskMoney
    ) &&
    !isBreakEvenPnl(
      resultR
    ) &&
    riskMoney > 0
  ) {
    return (
      resultR *
      riskMoney
    );
  }

  const entry =
    Number(trade.entry);

  const exit =
    Number(
      trade.exitPrice
    );

  const lot =
    Number(trade.lot);

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
    Number.isFinite(
      pipValue
    ) &&
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

    const calculatedPnl =
      calculatedGross -
      fees +
      swap;

    return isBreakEvenPnl(
      calculatedPnl
    )
      ? 0
      : calculatedPnl;
  }

  if (
    Number.isFinite(
      grossPnl
    )
  ) {
    const calculatedPnl =
      grossPnl -
      fees +
      swap;

    return isBreakEvenPnl(
      calculatedPnl
    )
      ? 0
      : calculatedPnl;
  }

  if (
    Number.isFinite(
      storedPnl
    )
  ) {
    return isBreakEvenPnl(
      storedPnl
    )
      ? 0
      : storedPnl;
  }

  return 0;
}

function getTradeR(trade) {
  const resultR =
    Number(trade?.resultR);

  return Number.isFinite(
    resultR
  )
    ? resultR
    : 0;
}

function getTradeOutcome(
  trade
) {
  const pnl =
    getTradeNetPnl(
      trade
    );

  if (
    pnl >
    RESULT_EPSILON
  ) {
    return "Win";
  }

  if (
    pnl <
    -RESULT_EPSILON
  ) {
    return "Loss";
  }

  return "BE";
}

function getTradeResultLabel(
  trade
) {
  const outcome =
    getTradeOutcome(
      trade
    );

  if (
    outcome === "Win"
  ) {
    return "Gain";
  }

  if (
    outcome === "Loss"
  ) {
    return "Perte";
  }

  return "BE";
}

function isWinningTrade(
  trade
) {
  return (
    getTradeOutcome(
      trade
    ) === "Win"
  );
}

function isLosingTrade(
  trade
) {
  return (
    getTradeOutcome(
      trade
    ) === "Loss"
  );
}

function isBreakEvenTrade(
  trade
) {
  return (
    getTradeOutcome(
      trade
    ) === "BE"
  );
}

function isBreakEvenExit(
  trade
) {
  return (
    getTradeExitType(
      trade
    ) === "BE"
  );
}

function isClosedTrade(
  trade
) {
  return (
    trade &&
    String(
      trade.status ||
        "closed"
    ).toLowerCase() ===
      "closed"
  );
}

function getTradeDate(
  trade
) {
  const timestamp =
    getTradeTimestamp(
      trade
    );

  return timestamp
    ? new Date(timestamp)
    : null;
}

function isSameDay(
  dateA,
  dateB
) {
  if (
    !dateA ||
    !dateB
  ) {
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

function getStartOfWeek(
  date
) {
  const result =
    new Date(date);

  const day =
    result.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      diff
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

function isWithinPeriod(
  date,
  period
) {
  if (!date) {
    return false;
  }

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

function getResultClass(
  value
) {
  if (
    isBreakEvenPnl(
      value
    )
  ) {
    return "neutral";
  }

  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function getOutcomeClass(
  outcome
) {
  if (
    outcome === "Win"
  ) {
    return "positive";
  }

  if (
    outcome === "Loss"
  ) {
    return "negative";
  }

  return "neutral";
}

function getExitClass(
  exitType
) {
  if (
    exitType === "TP"
  ) {
    return "positive";
  }

  if (
    exitType === "SL"
  ) {
    return "negative";
  }

  return "neutral";
}

function calculatePerformanceStats(
  list,
  initialCapital
) {
  const closedTrades =
    list
      .filter(
        isClosedTrade
      )
      .slice()
      .sort(
        (a, b) =>
          getTradeTimestamp(
            a
          ) -
          getTradeTimestamp(
            b
          )
      );

  const wins =
    closedTrades.filter(
      isWinningTrade
    );

  const losses =
    closedTrades.filter(
      isLosingTrade
    );

  const breakevens =
    closedTrades.filter(
      isBreakEvenTrade
    );

  const totalPnl =
    closedTrades.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(
          trade
        ),
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
    Math.abs(
      losses.reduce(
        (sum, trade) =>
          sum +
          getTradeNetPnl(
            trade
          ),
        0
      )
    );

  const trades =
    closedTrades.length;

  const winRate =
    trades > 0
      ? (wins.length /
          trades) *
        100
      : 0;

  const lossRate =
    trades > 0
      ? (losses.length /
          trades) *
        100
      : 0;

  const breakevenRate =
    trades > 0
      ? (breakevens.length /
          trades) *
        100
      : 0;

  const profitFactor =
    grossLoss > 0
      ? grossProfit /
        grossLoss
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
      ? -grossLoss /
        losses.length
      : 0;

  const avgR =
    trades > 0
      ? closedTrades.reduce(
          (sum, trade) =>
            sum +
            getTradeR(
              trade
            ),
          0
        ) / trades
      : 0;

  let equity =
    Number(
      initialCapital
    ) || 0;

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
        getTradeNetPnl(
          trade
        );

      equity += pnl;

      peak = Math.max(
        peak,
        equity
      );

      const drawdown =
        peak - equity;

      const drawdownPercent =
        peak > 0
          ? (drawdown / peak) *
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
      if (
        isWinningTrade(
          trade
        )
      ) {
        currentWinStreak += 1;
        currentLossStreak = 0;

        bestStreak =
          Math.max(
            bestStreak,
            currentWinStreak
          );
      } else if (
        isLosingTrade(
          trade
        )
      ) {
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

  const now = new Date();

  const pnlToday =
    closedTrades
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
    closedTrades
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
    closedTrades
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

  const startCapital =
    Number(
      initialCapital
    ) || 0;

  const pnlPercent =
    startCapital > 0
      ? (totalPnl /
          startCapital) *
        100
      : 0;

  return {
    trades,
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
            {rows.length ===
            0 ? (
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
                (
                  row,
                  index
                ) => (
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

  const analyzedData =
    useMemo(() => {
      const allClosedTrades =
        trades.filter(
          isClosedTrade
        );

      if (
        selectedCapitalId ===
        "all"
      ) {
        const activeCapital =
          capitals.filter(
            (capital) =>
              capital.status !==
              "archived"
          );

        const initialCapital =
          activeCapital.reduce(
            (sum, capital) =>
              sum +
              (Number(
                capital.initialCapital
              ) || 0),
            0
          );

        const currentBalance =
          activeCapital.reduce(
            (sum, capital) =>
              sum +
              (Number(
                capital.currentBalance
              ) || 0),
            0
          );

        return {
          capital: null,
          trades:
            allClosedTrades,
          initialCapital,
          currentBalance,
          name:
            "Tous les capitaux actifs",
        };
      }

      if (!selectedCapital) {
        return {
          capital: null,
          trades: [],
          initialCapital: 0,
          currentBalance: 0,
          name:
            "Aucun capital",
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

  const periodTrades =
    useMemo(
      () =>
        analyzedData.trades.filter(
          (trade) =>
            isWithinPeriod(
              getTradeDate(
                trade
              ),
              period
            )
        ),
      [
        analyzedData.trades,
        period,
      ]
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

  const lifetimeStats =
    useMemo(
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

  const groupedStats =
    useMemo(() => {
      const makeGroup =
        (field) => {
          const map = new Map();

          periodTrades.forEach(
            (trade) => {
              const key =
                trade[field] ||
                "Non renseigné";

              if (
                !map.has(key)
              ) {
                map.set(
                  key,
                  []
                );
              }

              map.get(
                key
              ).push(trade);
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
        asset:
          makeGroup(
            "asset"
          ),
        setup:
          makeGroup(
            "setup"
          ),
        session:
          makeGroup(
            "session"
          ),
        timeframe:
          makeGroup(
            "timeframe"
          ),
        direction:
          makeGroup(
            "direction"
          ),
        exitType:
          makeGroup(
            "exitType"
          ),
      };
    }, [periodTrades]);

  const rrStats =
    useMemo(() => {
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

          const beExits =
            group.filter(
              isBreakEvenExit
            ).length;

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
              beExits,
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

  const recentTrades =
    useMemo(
      () =>
        periodTrades
          .slice()
          .sort(
            (a, b) =>
              getTradeTimestamp(
                b
              ) -
              getTradeTimestamp(
                a
              )
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
    capitals
      .filter(
        (capital) =>
          capital.status !==
          "archived"
      )
      .reduce(
        (sum, capital) =>
          sum +
          (Number(
            capital.currentBalance
          ) || 0),
        0
      );

  const globalStats =
    useMemo(
      () =>
        calculatePerformanceStats(
          trades,
          capitalInitialTotal
        ),
      [
        trades,
        capitalInitialTotal,
      ]
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
      : capitals
          .filter(
            (capital) =>
              capital.status !==
              "archived"
          )
          .reduce(
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
      : capitalBalanceTotal >
        0
      ? (selectedRisk /
          capitalBalanceTotal) *
        100
      : 0;

  return (
    <div className="page">
      <div className="page-header-row">
        <PageTitle
          icon={
            LayoutDashboard
          }
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
            {
              analyzedData.name
            }
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
          value={`${stats.bestStreak} trade${
            stats.bestStreak >
            1
              ? "s"
              : ""
          }`}
          subtitle="Gains consécutifs"
          icon={Check}
        />

        <MetricCard
          title="Pire série"
          value={`${stats.worstStreak} trade${
            stats.worstStreak >
            1
              ? "s"
              : ""
          }`}
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
          icon={
            CircleDollarSign
          }
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
            stats.breakevens >
            1
              ? "s"
              : ""
          }`}
          icon={
            CircleDollarSign
          }
        />

        <MetricCard
          title="Sorties BE"
          value={
            periodTrades.filter(
              isBreakEvenExit
            ).length
          }
          subtitle="Type de fermeture BE"
          icon={
            RotateCcw
          }
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
                <th>Résultat</th>
                <th>P/L</th>
                <th>R</th>
              </tr>
            </thead>

            <tbody>
              {recentTrades.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="10"
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

                    const outcome =
                      getTradeOutcome(
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

                        <td
                          className={getExitClass(
                            getTradeExitType(
                              trade
                            )
                          )}
                        >
                          {
                            getTradeExitType(
                              trade
                            )
                          }
                        </td>

                        <td
                          className={getOutcomeClass(
                            outcome
                          )}
                        >
                          {
                            getTradeResultLabel(
                              trade
                            )
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) =>
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) =>
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) =>
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) =>
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) => (
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
              render: (
                row
              ) =>
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
            render: (
              row
            ) =>
              formatPercent(
                row.winRate
              ),
          },
          {
            key: "pnl",
            label: "P/L",
            render: (
              row
            ) => (
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
            render: (
              row
            ) =>
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
              Balance totale active
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
              {
                globalStats.trades
              }
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
  onView,
  onEdit,
  onDelete,
}) {
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    periodFilter,
    setPeriodFilter,
  ] = useState("all");

  const [
    dateFrom,
    setDateFrom,
  ] = useState("");

  const [
    dateTo,
    setDateTo,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    assetFilter,
    setAssetFilter,
  ] = useState("all");

  const [
    directionFilter,
    setDirectionFilter,
  ] = useState("all");

  const [
    resultFilter,
    setResultFilter,
  ] = useState("all");

  const [
    exitTypeFilter,
    setExitTypeFilter,
  ] = useState("all");

  const [
    sessionFilter,
    setSessionFilter,
  ] = useState("all");

  const [
    setupFilter,
    setSetupFilter,
  ] = useState("all");

  const [
    timeframeFilter,
    setTimeframeFilter,
  ] = useState("all");

  const capitalName = (
    id
  ) =>
    capitals.find(
      (capital) =>
        capital.id === id
    )?.name ||
    "Inconnu";

  const filteredTrades =
    useMemo(() => {
      const bounds =
        getPeriodBounds(
          periodFilter,
          dateFrom,
          dateTo
        );

      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      const result =
        trades
          .filter(
            isClosedTrade
          )
          .filter((trade) => {
            if (
              filter !==
                "all" &&
              trade.capitalId !==
                filter
            ) {
              return false;
            }

            if (
              assetFilter !==
                "all" &&
              trade.asset !==
                assetFilter
            ) {
              return false;
            }

            if (
              directionFilter !==
                "all" &&
              trade.direction !==
                directionFilter
            ) {
              return false;
            }

            const outcome =
              getTradeOutcome(
                trade
              );

            if (
              resultFilter !==
                "all" &&
              outcome !==
                resultFilter
            ) {
              return false;
            }

            if (
              exitTypeFilter !==
                "all" &&
              getTradeExitType(
                trade
              ) !==
                exitTypeFilter
            ) {
              return false;
            }

            if (
              sessionFilter !==
                "all" &&
              trade.session !==
                sessionFilter
            ) {
              return false;
            }

            if (
              setupFilter !==
                "all" &&
              trade.setup !==
                setupFilter
            ) {
              return false;
            }

            if (
              timeframeFilter !==
                "all" &&
              trade.timeframe !==
                timeframeFilter
            ) {
              return false;
            }

            const date =
              getTradeDate(
                trade
              );

            if (
              bounds.start &&
              (!date ||
                date <
                  bounds.start)
            ) {
              return false;
            }

            if (
              bounds.end &&
              (!date ||
                date >=
                  bounds.end)
            ) {
              return false;
            }

            if (
              normalizedSearch
            ) {
              const capital =
                capitalName(
                  trade.capitalId
                );

              const searchable =
                [
                  trade.asset,
                  trade.direction,
                  trade.setup,
                  trade.session,
                  trade.timeframe,
                  trade.exitType,
                  getTradeResultLabel(
                    trade
                  ),
                  trade.emotion,
                  trade.planAdherence,
                  trade.mistakes,
                  trade.entryReason,
                  trade.exitReason,
                  trade.notes,
                  capital,
                  trade.rr,
                  trade.entry,
                  trade.exitPrice,
                  trade.pnl,
                  trade.resultR,
                ]
                  .filter(
                    (
                      item
                    ) =>
                      item !==
                        null &&
                      item !==
                        undefined
                  )
                  .join(" ")
                  .toLowerCase();

              if (
                !searchable.includes(
                  normalizedSearch
                )
              ) {
                return false;
              }
            }

            return true;
          });

      result.sort(
        (a, b) => {
          const pnlA =
            getTradeNetPnl(
              a
            );
          const pnlB =
            getTradeNetPnl(
              b
            );

          const rA =
            getTradeR(a);
          const rB =
            getTradeR(b);

          const rrA =
            Number(a.rr) ||
            0;

          const rrB =
            Number(b.rr) ||
            0;

          if (
            sortBy ===
            "oldest"
          ) {
            return (
              getTradeTimestamp(
                a
              ) -
              getTradeTimestamp(
                b
              )
            );
          }

          if (
            sortBy ===
            "pnlDesc"
          ) {
            return (
              pnlB - pnlA
            );
          }

          if (
            sortBy ===
            "pnlAsc"
          ) {
            return (
              pnlA - pnlB
            );
          }

          if (
            sortBy ===
            "rDesc"
          ) {
            return (
              rB - rA
            );
          }

          if (
            sortBy ===
            "rAsc"
          ) {
            return (
              rA - rB
            );
          }

          if (
            sortBy ===
            "rrDesc"
          ) {
            return (
              rrB - rrA
            );
          }

          if (
            sortBy ===
            "rrAsc"
          ) {
            return (
              rrA - rrB
            );
          }

          return (
            getTradeTimestamp(
              b
            ) -
            getTradeTimestamp(
              a
            )
          );
        }
      );

      return result;
    }, [
      trades,
      capitals,
      filter,
      searchTerm,
      periodFilter,
      dateFrom,
      dateTo,
      sortBy,
      assetFilter,
      directionFilter,
      resultFilter,
      exitTypeFilter,
      sessionFilter,
      setupFilter,
      timeframeFilter,
    ]);

  function resetFilters() {
    setFilter("all");
    setSearchTerm("");
    setPeriodFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setAssetFilter("all");
    setDirectionFilter(
      "all"
    );
    setResultFilter("all");
    setExitTypeFilter(
      "all"
    );
    setSessionFilter("all");
    setSetupFilter("all");
    setTimeframeFilter(
      "all"
    );
  }

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

      <section className="panel">
        <div className="form-grid">
          <div className="field full">
            <label>
              Recherche
            </label>

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Actif, setup, session, note, entrée, P/L..."
            />
          </div>

          <div className="field">
            <label>
              Capital
            </label>

            <select
              value={filter}
              onChange={(
                event
              ) =>
                setFilter(
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
          </div>

          <div className="field">
            <label>
              Période
            </label>

            <select
              value={
                periodFilter
              }
              onChange={(
                event
              ) =>
                setPeriodFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Toute la période
              </option>

              <option value="today">
                Aujourd'hui
              </option>

              <option value="last7">
                7 derniers jours
              </option>

              <option value="last30">
                30 derniers jours
              </option>

              <option value="month">
                Mois courant
              </option>

              <option value="custom">
                Personnalisée
              </option>
            </select>
          </div>

          {periodFilter ===
            "custom" && (
            <>
              <div className="field">
                <label>
                  Date de début
                </label>

                <input
                  type="date"
                  value={
                    dateFrom
                  }
                  onChange={(
                    event
                  ) =>
                    setDateFrom(
                      event.target
                        .value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>
                  Date de fin
                </label>

                <input
                  type="date"
                  value={
                    dateTo
                  }
                  onChange={(
                    event
                  ) =>
                    setDateTo(
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </>
          )}

          <div className="field">
            <label>
              Actif
            </label>

            <select
              value={
                assetFilter
              }
              onChange={(
                event
              ) =>
                setAssetFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Tous
              </option>

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
              Direction
            </label>

            <select
              value={
                directionFilter
              }
              onChange={(
                event
              ) =>
                setDirectionFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Toutes
              </option>

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
              Résultat financier
            </label>

            <select
              value={
                resultFilter
              }
              onChange={(
                event
              ) =>
                setResultFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Tous
              </option>

              <option value="Win">
                Gains
              </option>

              <option value="Loss">
                Pertes
              </option>

              <option value="BE">
                BE financier
              </option>
            </select>
          </div>

          <div className="field">
            <label>
              Type de fermeture
            </label>

            <select
              value={
                exitTypeFilter
              }
              onChange={(
                event
              ) =>
                setExitTypeFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Tous
              </option>

              {EXIT_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label>
              Session
            </label>

            <select
              value={
                sessionFilter
              }
              onChange={(
                event
              ) =>
                setSessionFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Toutes
              </option>

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
              Setup
            </label>

            <select
              value={
                setupFilter
              }
              onChange={(
                event
              ) =>
                setSetupFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Tous
              </option>

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
              Timeframe
            </label>

            <select
              value={
                timeframeFilter
              }
              onChange={(
                event
              ) =>
                setTimeframeFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="all">
                Tous
              </option>

              {TIMEFRAMES.map(
                (timeframe) => (
                  <option
                    key={timeframe}
                    value={
                      timeframe
                    }
                  >
                    {timeframe}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label>
              Trier par
            </label>

            <select
              value={sortBy}
              onChange={(
                event
              ) =>
                setSortBy(
                  event.target
                    .value
                )
              }
            >
              <option value="newest">
                Plus récent
              </option>

              <option value="oldest">
                Plus ancien
              </option>

              <option value="pnlDesc">
                P/L décroissant
              </option>

              <option value="pnlAsc">
                P/L croissant
              </option>

              <option value="rDesc">
                R décroissant
              </option>

              <option value="rAsc">
                R croissant
              </option>

              <option value="rrDesc">
                RR décroissant
              </option>

              <option value="rrAsc">
                RR croissant
              </option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <span>
            {filteredTrades.length} trade
            {filteredTrades.length >
            1
              ? "s"
              : ""}{" "}
            trouvé
            {filteredTrades.length >
            1
              ? "s"
              : ""}
          </span>

          <button
            className="secondary-button"
            onClick={
              resetFilters
            }
          >
            Réinitialiser
          </button>
        </div>
      </section>

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
                <th>Résultat</th>
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
                    colSpan="13"
                    className="empty-cell"
                  >
                    Aucun trade ne
                    correspond aux
                    filtres.
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
                            trade.entry
                          }
                        </td>

                        <td>
                          {
                            trade.stopLoss
                          }
                        </td>

                        <td>
                          {
                            trade.tp
                          }
                        </td>

                        <td>
                          RR
                          {
                            trade.rr
                          }
                        </td>

                        <td
                          className={getExitClass(
                            getTradeExitType(
                              trade
                            )
                          )}
                        >
                          {
                            getTradeExitType(
                              trade
                            )
                          }
                        </td>

                        <td
                          className={getOutcomeClass(
                            getTradeOutcome(
                              trade
                            )
                          )}
                        >
                          {
                            getTradeResultLabel(
                              trade
                            )
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

                        <td>
                          <div className="card-actions">
                            <button
                              className="icon-button"
                              onClick={() =>
                                onView(
                                  trade
                                )
                              }
                              title="Voir"
                            >
                              <Eye
                                size={15}
                              />
                            </button>

                            <button
                              className="icon-button"
                              onClick={() =>
                                onEdit(
                                  trade
                                )
                              }
                              title="Modifier"
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

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
                          </div>
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

function TradeDetailModal({
  open,
  trade,
  capital,
  onClose,
  onEdit,
}) {
  if (
    !open ||
    !trade
  ) {
    return null;
  }

  const pnl =
    getTradeNetPnl(
      trade
    );

  const exitType =
    getTradeExitType(
      trade
    );

  const outcome =
    getTradeOutcome(
      trade
    );

  const pipValue =
    Number(
      trade.pipValue
    ) ||
    getPipValuePerLot(
      trade.asset,
      trade.entry
    );

  const priceDecimals =
    trade.asset ===
    "USDJPY"
      ? 3
      : 2;

  return (
    <div className="modal-backdrop">
      <div className="modal large">
        <div className="modal-header">
          <div>
            <h2>
              Détail du trade
            </h2>

            <p>
              {formatDate(
                trade.dateTime
              )}
            </p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="analysis-banner">
          <div>
            <span>Actif</span>

            <strong>
              {trade.asset}
            </strong>
          </div>

          <div>
            <span>
              Direction
            </span>

            <strong>
              {trade.direction}
            </strong>
          </div>

          <div>
            <span>
              Fermeture
            </span>

            <strong
              className={getExitClass(
                exitType
              )}
            >
              {exitType}
            </strong>
          </div>

          <div>
            <span>
              Résultat
            </span>

            <strong
              className={getOutcomeClass(
                outcome
              )}
            >
              {getTradeResultLabel(
                trade
              )}
            </strong>
          </div>
        </div>

        <div className="trade-preview">
          <div>
            <span>
              P/L net
            </span>

            <strong
              className={getResultClass(
                pnl
              )}
            >
              {formatMoney(
                pnl
              )}
            </strong>
          </div>

          <div>
            <span>
              R réalisé
            </span>

            <strong
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
            </strong>
          </div>

          <div>
            <span>
              Risque
            </span>

            <strong>
              {formatMoney(
                trade.riskMoney
              )}
            </strong>
          </div>

          <div>
            <span>
              Risque %
            </span>

            <strong>
              {formatPercent(
                trade.riskPercent
              )}
            </strong>
          </div>

          <div>
            <span>
              Lot
            </span>

            <strong>
              {formatNumber(
                trade.lot,
                2
              )}
            </strong>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>
              Capital
            </label>

            <input
              value={
                capital?.name ||
                "Inconnu"
              }
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Session
            </label>

            <input
              value={
                trade.session ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Timeframe
            </label>

            <input
              value={
                trade.timeframe ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Setup
            </label>

            <input
              value={
                trade.setup ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Entrée
            </label>

            <input
              value={formatNumber(
                trade.entry,
                priceDecimals
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Stop Loss
            </label>

            <input
              value={formatNumber(
                trade.stopLoss,
                priceDecimals
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Take Profit
            </label>

            <input
              value={formatNumber(
                trade.tp,
                priceDecimals
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Sortie réelle
            </label>

            <input
              value={formatNumber(
                trade.exitPrice,
                priceDecimals
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              RR planifié
            </label>

            <input
              value={`RR${trade.rr}`}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Stop
            </label>

            <input
              value={`${formatNumber(
                trade.stopPips,
                1
              )} pips`}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Valeur pip
            </label>

            <input
              value={`$${formatNumber(
                pipValue,
                4
              )}`}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Pips réalisés
            </label>

            <input
              value={formatNumber(
                trade.resultPips,
                1
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Gain brut
            </label>

            <input
              value={formatMoney(
                trade.grossPnl
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Frais
            </label>

            <input
              value={formatMoney(
                trade.fees
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Swap
            </label>

            <input
              value={formatMoney(
                trade.swap
              )}
              readOnly
            />
          </div>

          <div className="field">
            <label>
              Plan respecté
            </label>

            <input
              value={
                trade.planAdherence ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="field full">
            <label>
              Émotion
            </label>

            <input
              value={
                trade.emotion ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="field full">
            <label>
              Erreurs
            </label>

            <textarea
              value={
                trade.mistakes ||
                ""
              }
              readOnly
            />
          </div>

          <div className="field full">
            <label>
              Raison d'entrée
            </label>

            <textarea
              value={
                trade.entryReason ||
                ""
              }
              readOnly
            />
          </div>

          <div className="field full">
            <label>
              Raison de sortie
            </label>

            <textarea
              value={
                trade.exitReason ||
                ""
              }
              readOnly
            />
          </div>

          <div className="field full">
            <label>
              Notes
            </label>

            <textarea
              value={
                trade.notes ||
                ""
              }
              readOnly
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
          >
            Fermer
          </button>

          <button
            className="primary-button"
            onClick={() =>
              onEdit(trade)
            }
          >
            <Pencil size={17} />
            Modifier le trade
          </button>
        </div>
      </div>
    </div>
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
          getTradeNetPnl(
            trade
          ),
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
                onEdit(
                  capital
                )
              }
              title="Modifier"
            >
              <Pencil
                size={16}
              />
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
                getCapitalRisk(
                  capital
                )
              )}
            </strong>
          </div>

          <div>
            <span>
              Risque %
            </span>

            <strong>
              {formatPercent(
                getCapitalRiskPercent(
                  capital
                )
              )}
            </strong>
          </div>

          <div>
            <span>
              RR de base
            </span>

            <strong>
              RR
              {
                capital.defaultRR
              }
            </strong>
          </div>
        </div>

        <div className="capital-pnl">
          <span>
            P/L
          </span>

          <strong
            className={getResultClass(
              pnl
            )}
          >
            {formatMoney(
              pnl
            )}
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
              onDelete(
                capital.id
              )
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
          <h2>
            Capitaux actifs
          </h2>

          <span>
            {active.length}
          </span>
        </div>

        <div className="capital-list">
          {active.length ===
          0 ? (
            <div className="empty-state">
              Aucun capital actif.
            </div>
          ) : (
            active.map(
              renderCapital
            )
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>
            Capitaux archivés
          </h2>

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

function CalendarPage({
  trades,
}) {
  const [
    currentDate,
    setCurrentDate,
  ] = useState(
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

          if (!date) {
            return;
          }

          const key =
            `${date.getFullYear()}-${String(
              date.getMonth() +
                1
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
            !map.has(key)
          ) {
            map.set(key, {
              date,
              pnl: 0,
              trades: 0,
              wins: 0,
              losses: 0,
              breakevens: 0,
              beExits: 0,
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

          item.r +=
            getTradeR(
              trade
            );

          if (pnl > 0) {
            item.wins += 1;
          } else if (
            pnl < 0
          ) {
            item.losses += 1;
          } else {
            item.breakevens +=
              1;
          }

          if (
            isBreakEvenExit(
              trade
            )
          ) {
            item.beExits += 1;
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.date - b.date
      );
    }, [monthTrades]);

  const monthPnl =
    monthTrades.reduce(
      (sum, trade) =>
        sum +
        getTradeNetPnl(
          trade
        ),
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
    day <=
    daysInMonth;
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

  function getDayStats(
    day
  ) {
    if (!day) {
      return null;
    }

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
          ].map(
            (day) => (
              <div
                className="calendar-weekday"
                key={day}
              >
                {day}
              </div>
            )
          )}

          {cells.map(
            (
              day,
              index
            ) => {
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
                  key={`${day}-${index}`}
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

                          <small>
                            {
                              stats.beExits
                            }{" "}
                            sortie BE
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
            render: (
              row
            ) =>
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
            label: "BE financier",
          },
          {
            key: "beExits",
            label: "Sorties BE",
          },
          {
            key: "pnl",
            label: "P/L",
            render: (
              row
            ) => (
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
            render: (
              row
            ) =>
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
  ] = useState("");

  const [
    asset,
    setAsset,
  ] = useState(
    "XAUUSD"
  );

  const [
    direction,
    setDirection,
  ] = useState(
    "BUY"
  );

  const [
    entry,
    setEntry,
  ] = useState("");

  const [
    stopLoss,
    setStopLoss,
  ] = useState("");

  const [
    rr,
    setRr,
  ] = useState("2");

  useEffect(() => {
    if (
      !capitalId &&
      activeCapitals.length
    ) {
      setCapitalId(
        activeCapitals[0].id
      );
      setRr(
        String(
          activeCapitals[0]
            .defaultRR || 2
        )
      );
    }
  }, [
    capitalId,
    activeCapitals,
  ]);

  const capital =
    activeCapitals.find(
      (item) =>
        item.id ===
        capitalId
    );

  const riskMoney =
    getCapitalRisk(
      capital
    );

  const riskPercent =
    getCapitalRiskPercent(
      capital
    );

  const entryNumber =
    Number(entry);

  const stopNumber =
    Number(stopLoss);

  const stopPips =
    calculateStopPips(
      asset,
      entryNumber,
      stopNumber
    );

  const pipValue =
    getPipValuePerLot(
      asset,
      entryNumber
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
      entryNumber,
      stopNumber,
      rr
    );

  const priceDecimals =
    asset === "USDJPY"
      ? 3
      : 2;

  return (
    <div className="page">
      <PageTitle
        icon={Calculator}
        title="Calculateur"
        subtitle="Calculez risque, lot et objectifs RR."
      />

      {activeCapitals.length ===
      0 ? (
        <div className="empty-state">
          Créez d'abord un capital
          actif.
        </div>
      ) : (
        <>
          <section className="panel">
            <div className="form-grid">
              <div className="field">
                <label>
                  Capital
                </label>

                <select
                  value={
                    capitalId
                  }
                  onChange={(event) => {
                    const value =
                      event.target
                        .value;

                    setCapitalId(
                      value
                    );

                    const next =
                      activeCapitals.find(
                        (item) =>
                          item.id ===
                          value
                      );

                    if (next) {
                      setRr(
                        String(
                          next.defaultRR ||
                            2
                        )
                      );
                    }
                  }}
                >
                  {activeCapitals.map(
                    (
                      capitalItem
                    ) => (
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
                        key={
                          item
                        }
                        value={
                          item
                        }
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
                  step="0.001"
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
                  step="0.001"
                  value={
                    stopLoss
                  }
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
                    setRr(
                      event.target
                        .value
                    )
                  }
                >
                  {RR_OPTIONS.map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        RR
                        {value}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

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
                Risque %
              </span>

              <strong>
                {formatPercent(
                  riskPercent
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
                TP
              </span>

              <strong>
                {tp
                  ? formatNumber(
                      tp,
                      priceDecimals
                    )
                  : "-"}
              </strong>
            </div>
          </div>

          <StatsTable
            title="Objectifs RR"
            rows={RR_OPTIONS.map(
              (value) => ({
                id: value,
                rr: value,
                tp: calculateTP(
                  direction,
                  entryNumber,
                  stopNumber,
                  value
                ),
              })
            )}
            columns={[
              {
                key: "rr",
                label: "RR",
                render: (
                  row
                ) =>
                  `RR${row.rr}`,
              },
              {
                key: "tp",
                label:
                  "Take Profit",
                render: (
                  row
                ) =>
                  row.tp
                    ? formatNumber(
                        row.tp,
                        priceDecimals
                      )
                    : "-",
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

function SettingsPage({
  capitals,
  trades,
  onExport,
  fileInputRef,
  onImportFile,
}) {
  const closedTrades =
    trades.filter(
      isClosedTrade
    );

  return (
    <div className="page">
      <PageTitle
        icon={Settings}
        title="Paramètres"
        subtitle="Gérez les données locales de votre journal."
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
              {closedTrades.length}
            </strong>
          </div>
        </div>

        <p className="settings-note">
          Les données sont
          actuellement stockées
          localement dans le
          navigateur. Utilisez une
          sauvegarde JSON pour
          conserver ou transférer
          votre journal.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Sauvegarde des données
            </h2>

            <p>
              Exportez tous vos
              capitaux et trades dans
              un fichier JSON.
            </p>
          </div>
        </div>

        <div className="capital-actions">
          <button
            className="primary-button"
            onClick={onExport}
          >
            <Download
              size={17}
            />
            Exporter mes données
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <Upload
              size={17}
            />
            Importer une sauvegarde
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={
            onImportFile
          }
          style={{
            display: "none",
          }}
        />

        <p className="settings-note">
          L'import remplacera les
          données actuellement
          présentes dans ce
          navigateur après
          confirmation.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Format de sauvegarde
            </h2>

            <p>
              Version actuelle :{" "}
              {BACKUP_VERSION}
            </p>
          </div>
        </div>

        <div className="settings-info">
          <div>
            <span>
              Capitaux exportés
            </span>

            <strong>
              {capitals.length}
            </strong>
          </div>

          <div>
            <span>
              Trades exportés
            </span>

            <strong>
              {trades.length}
            </strong>
          </div>
        </div>
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
  if (!open) {
    return null;
  }

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
              step="0.01"
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
              step="0.01"
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
              Type de risque
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
                Risque par trade
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
                Montant à risquer
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
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    RR
                    {value}
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
  editingTradeId,
  form,
  setForm,
  capitals,
  onClose,
  onSave,
}) {
  if (!open) {
    return null;
  }

  const isEditing =
    Boolean(
      editingTradeId
    );

  const activeCapitals =
    capitals.filter(
      (capital) =>
        capital.status !==
        "archived"
    );

  const availableCapitals =
    isEditing
      ? capitals
      : activeCapitals;

  const capital =
    availableCapitals.find(
      (item) =>
        item.id ===
        form.capitalId
    );

  const riskMoney =
    Number(
      form.riskMoneyOverride
    ) > 0
      ? Number(
          form.riskMoneyOverride
        )
      : getCapitalRisk(
          capital
        );

  const riskPercent =
    capital
      ? getCapitalRiskPercent(
          capital
        )
      : 0;

  const entry =
    Number(form.entry);

  const stopLoss =
    Number(
      form.stopLoss
    );

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

  const priceDecimals =
    form.asset ===
    "USDJPY"
      ? 3
      : 2;

  let automaticExit = tp;

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
            {isEditing
              ? "Modifier le trade"
              : "Nouveau trade"}
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
                  riskMoneyOverride:
                    "",
                })
              }
            >
              {availableCapitals.map(
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
                    {capitalItem.status ===
                    "archived"
                      ? " — Archivé"
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="field">
            <label>
              Date et heure
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
              Actif
            </label>

            <select
              value={
                form.asset
              }
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
                (timeframe) => (
                  <option
                    key={
                      timeframe
                    }
                    value={
                      timeframe
                    }
                  >
                    {timeframe}
                  </option>
                )
              )}
            </select>
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
              Entrée
            </label>

            <input
              type="number"
              step="0.001"
              value={
                form.entry
              }
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
              step="0.001"
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
              value={
                form.rr
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  rr:
                    event.target
                      .value,
                })
              }
            >
              {RR_OPTIONS.map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    RR
                    {value}
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
                  exitPrice:
                    event.target
                      .value ===
                    "BE"
                      ? form.exitPrice
                      : "",
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

          {form.exitType ===
          "BE" ? (
            <div className="field">
              <label>
                Prix réel de sortie BE
              </label>

              <input
                type="number"
                step="0.001"
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
              />
            </div>
          ) : (
            <div className="field">
              <label>
                Sortie automatique
              </label>

              <input
                value={
                  automaticExit
                    ? formatNumber(
                        automaticExit,
                        priceDecimals
                      )
                    : "-"
                }
                readOnly
              />
            </div>
          )}

          <div className="field">
            <label>
              Émotion
            </label>

            <input
              value={
                form.emotion
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  emotion:
                    event.target
                      .value,
                })
              }
              placeholder="Calme, FOMO..."
            />
          </div>

          <div className="field">
            <label>
              Plan respecté
            </label>

            <select
              value={
                form.planAdherence
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  planAdherence:
                    event.target
                      .value,
                })
              }
            >
              <option value="Oui">
                Oui
              </option>

              <option value="Non">
                Non
              </option>

              <option value="Partiellement">
                Partiellement
              </option>
            </select>
          </div>

          <div className="field full">
            <label>
              Erreurs / erreurs de discipline
            </label>

            <textarea
              value={
                form.mistakes
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  mistakes:
                    event.target
                      .value,
                })
              }
            />
          </div>

          {isEditing && (
            <div className="field">
              <label>
                Risque historique du trade
              </label>

              <input
                type="number"
                step="0.01"
                value={
                  form.riskMoneyOverride
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    riskMoneyOverride:
                      event.target
                        .value,
                  })
                }
                placeholder={`${formatMoney(
                  riskMoney
                )}`}
              />
            </div>
          )}
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
              Risque %
            </span>

            <strong>
              {formatPercent(
                riskPercent
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
                    priceDecimals
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
              value={
                form.notes
              }
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
            {isEditing
              ? "Enregistrer les modifications"
              : "Enregistrer le trade"}
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
        open
          ? "open"
          : ""
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
                activePage ===
                id
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
  ] = useState(
    false
  );

  const [
    capitals,
    setCapitals,
  ] = useState(() => {
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

  const [
    trades,
    setTrades,
  ] = useState(() => {
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
  ] = useState(
    "all"
  );

  const [
    capitalModalOpen,
    setCapitalModalOpen,
  ] = useState(
    false
  );

  const [
    editingCapitalId,
    setEditingCapitalId,
  ] = useState(
    null
  );

  const [
    capitalForm,
    setCapitalForm,
  ] = useState({
    name: "",
    initialCapital: "",
    currentBalance: "",
    riskMode:
      "percentage",
    riskPercent: "1",
    riskAmount: "",
    defaultRR: "2",
  });

  const [
    tradeModalOpen,
    setTradeModalOpen,
  ] = useState(
    false
  );

  const [
    editingTradeId,
    setEditingTradeId,
  ] = useState(
    null
  );

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
    riskMoneyOverride: "",
  });

  const [
    tradeCapitalFilter,
    setTradeCapitalFilter,
  ] = useState(
    "all"
  );

  const [
    selectedTrade,
    setSelectedTrade,
  ] = useState(
    null
  );

  const [
    tradeDetailOpen,
    setTradeDetailOpen,
  ] = useState(
    false
  );

  const [
    notification,
    setNotification,
  ] = useState(
    null
  );

  const fileInputRef =
    useRef(null);

  useEffect(() => {
    localStorage.setItem(
      CAPITALS_STORAGE_KEY,
      JSON.stringify(
        capitals
      )
    );
  }, [capitals]);

  useEffect(() => {
    localStorage.setItem(
      TRADES_STORAGE_KEY,
      JSON.stringify(
        trades
      )
    );
  }, [trades]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer =
      setTimeout(() => {
        setNotification(
          null
        );
      }, 3500);

    return () =>
      clearTimeout(
        timer
      );
  }, [notification]);

  useEffect(() => {
    if (
      dashboardCapitalFilter ===
      "all"
    ) {
      return;
    }

    if (
      !capitals.length
    ) {
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

  function navigate(
    page
  ) {
    setActivePage(
      page
    );

    setSidebarOpen(
      false
    );
  }

  function openNewCapitalModal() {
    setEditingCapitalId(
      null
    );

    setCapitalForm({
      name: "",
      initialCapital: "",
      currentBalance: "",
      riskMode:
        "percentage",
      riskPercent: "1",
      riskAmount: "",
      defaultRR: "2",
    });

    setCapitalModalOpen(
      true
    );
  }

  function openEditCapitalModal(
    capital
  ) {
    setEditingCapitalId(
      capital.id
    );

    setCapitalForm({
      name:
        capital.name ||
        "",
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

    setCapitalModalOpen(
      true
    );
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

    if (
      editingCapitalId
    ) {
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
                      ) ||
                      0,
                    riskAmount:
                      Number(
                        capitalForm.riskAmount
                      ) ||
                      0,
                    defaultRR:
                      Number(
                        capitalForm.defaultRR
                      ) ||
                      2,
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
          ) ||
          initial,
        riskMode:
          capitalForm.riskMode,
        riskPercent:
          Number(
            capitalForm.riskPercent
          ) ||
          0,
        riskAmount:
          Number(
            capitalForm.riskAmount
          ) ||
          0,
        defaultRR:
          Number(
            capitalForm.defaultRR
          ) ||
          2,
        status:
          "active",
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

    setCapitalModalOpen(
      false
    );
  }

  function archiveCapital(
    id
  ) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            id
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
    id
  ) {
    setCapitals(
      (current) =>
        current.map(
          (capital) =>
            capital.id ===
            id
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
    id
  ) {
    const linkedTrades =
      trades.some(
        (trade) =>
          trade.capitalId ===
          id
      );

    if (
      linkedTrades
    ) {
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

    setEditingTradeId(
      null
    );

    setTradeForm({
      capitalId:
        capital.id,
      asset: "XAUUSD",
      dateTime:
        getDateTimeInputValue(),
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
      planAdherence:
        "Oui",
      mistakes: "",
      entryReason: "",
      exitReason: "",
      notes: "",
      riskMoneyOverride:
        "",
    });

    setTradeModalOpen(
      true
    );
  }

  function openEditTradeModal(
    trade
  ) {
    setEditingTradeId(
      trade.id
    );

    setTradeForm({
      capitalId:
        trade.capitalId ||
        "",
      asset:
        trade.asset ||
        "XAUUSD",
      dateTime:
        getDateTimeInputValue(
          trade.dateTime
        ),
      session:
        trade.session ||
        "New York",
      direction:
        trade.direction ||
        "BUY",
      timeframe:
        trade.timeframe ||
        "M15",
      entry:
        trade.entry ??
        "",
      stopLoss:
        trade.stopLoss ??
        "",
      rr:
        trade.rr ??
        "2",
      exitType:
        getTradeExitType(
          trade
        ),
      exitPrice:
        trade.exitType ===
        "BE"
          ? trade.exitPrice ??
            ""
          : "",
      fees:
        trade.fees ??
        "",
      swap:
        trade.swap ??
        "",
      setup:
        trade.setup ||
        "ZS OA",
      emotion:
        trade.emotion ||
        "",
      planAdherence:
        trade.planAdherence ||
        "Oui",
      mistakes:
        trade.mistakes ||
        "",
      entryReason:
        trade.entryReason ||
        "",
      exitReason:
        trade.exitReason ||
        "",
      notes:
        trade.notes ||
        "",
      riskMoneyOverride:
        trade.riskMoney ??
        "",
    });

    setTradeDetailOpen(
      false
    );

    setSelectedTrade(
      null
    );

    setTradeModalOpen(
      true
    );
  }

  function openTradeDetail(
    trade
  ) {
    setSelectedTrade(
      trade
    );

    setTradeDetailOpen(
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

    if (
      stopPips <= 0
    ) {
      showNotification(
        "Le Stop Loss doit être différent du prix d'entrée.",
        "error"
      );
      return;
    }

    const defaultRisk =
      getCapitalRisk(
        capital
      );

    const riskMoney =
      Number(
        tradeForm.riskMoneyOverride
      ) > 0
        ? Number(
            tradeForm.riskMoneyOverride
          )
        : defaultRisk;

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

    if (
      lot <= 0
    ) {
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

    const newTrade = {
      id:
        editingTradeId ||
        createId("trade"),

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

      rr: Number(
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
        getTradeOutcome({
          pnl: netPnl,
          resultR,
          riskMoney,
        }),

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
        editingTradeId
          ? trades.find(
              (trade) =>
                trade.id ===
                editingTradeId
            )?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),

      capitalRiskSnapshot:
        riskMoney,
    };

    if (
      editingTradeId
    ) {
      const oldTrade =
        trades.find(
          (trade) =>
            trade.id ===
            editingTradeId
        );

      if (!oldTrade) {
        showNotification(
          "Trade à modifier introuvable.",
          "error"
        );
        return;
      }

      const oldPnl =
        getTradeNetPnl(
          oldTrade
        );

      if (
        oldTrade.capitalId ===
        newTrade.capitalId
      ) {
        setCapitals(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                newTrade.capitalId
                  ? {
                      ...item,
                      currentBalance:
                        (Number(
                          item.currentBalance
                        ) || 0) -
                        oldPnl +
                        netPnl,
                    }
                  : item
            )
        );
      } else {
        setCapitals(
          (current) =>
            current.map(
              (item) => {
                if (
                  item.id ===
                  oldTrade.capitalId
                ) {
                  return {
                    ...item,
                    currentBalance:
                      (Number(
                        item.currentBalance
                      ) || 0) -
                      oldPnl,
                  };
                }

                if (
                  item.id ===
                  newTrade.capitalId
                ) {
                  return {
                    ...item,
                    currentBalance:
                      (Number(
                        item.currentBalance
                      ) || 0) +
                      netPnl,
                  };
                }

                return item;
              }
            )
        );
      }

      setTrades(
        (current) =>
          current.map(
            (trade) =>
              trade.id ===
              editingTradeId
                ? newTrade
                : trade
          )
      );

      setTradeModalOpen(
        false
      );

      setEditingTradeId(
        null
      );

      showNotification(
        `Trade modifié : ${formatMoney(
          netPnl
        )}`
      );

      return;
    }

    setTrades(
      (current) => [
        ...current,
        newTrade,
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

  function deleteTrade(
    id
  ) {
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

    if (
      selectedTrade?.id ===
      id
    ) {
      setSelectedTrade(
        null
      );

      setTradeDetailOpen(
        false
      );
    }

    showNotification(
      "Trade supprimé."
    );
  }

  function exportData() {
    const backup = {
      app:
        "ARCH Trading Journal",
      version:
        BACKUP_VERSION,
      exportedAt:
        new Date().toISOString(),
      capitals,
      trades,
    };

    const json =
      JSON.stringify(
        backup,
        null,
        2
      );

    const blob =
      new Blob(
        [json],
        {
          type:
            "application/json",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    const date =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    anchor.href =
      url;

    anchor.download = `ARCH-trading-journal-${date}.json`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    document.body.removeChild(
      anchor
    );

    URL.revokeObjectURL(
      url
    );

    showNotification(
      "Sauvegarde exportée avec succès."
    );
  }

  function normalizeImportedData(
    data
  ) {
    if (
      !data ||
      typeof data !==
        "object"
    ) {
      throw new Error(
        "Format invalide."
      );
    }

    if (
      !Array.isArray(
        data.capitals
      ) ||
      !Array.isArray(
        data.trades
      )
    ) {
      throw new Error(
        "Le fichier doit contenir les tableaux capitals et trades."
      );
    }

    const capitalsClean =
      data.capitals
        .filter(
          (capital) =>
            capital &&
            typeof capital ===
              "object"
        )
        .map(
          (capital) => ({
            id:
              String(
                capital.id ||
                  createId(
                    "capital"
                  )
              ),

            name:
              String(
                capital.name ||
                  "Capital"
              ),

            initialCapital:
              Number(
                capital.initialCapital
              ) || 0,

            currentBalance:
              Number(
                capital.currentBalance
              ) ||
              Number(
                capital.initialCapital
              ) ||
              0,

            riskMode:
              capital.riskMode ===
              "fixed"
                ? "fixed"
                : "percentage",

            riskPercent:
              Number(
                capital.riskPercent
              ) || 0,

            riskAmount:
              Number(
                capital.riskAmount
              ) || 0,

            defaultRR:
              Number(
                capital.defaultRR
              ) ||
              2,

            status:
              capital.status ===
              "archived"
                ? "archived"
                : "active",

            createdAt:
              capital.createdAt ||
              new Date().toISOString(),
          })
        );

    const capitalIds =
      new Set(
        capitalsClean.map(
          (capital) =>
            capital.id
        )
      );

    const tradesClean =
      data.trades
        .filter(
          (trade) =>
            trade &&
            typeof trade ===
              "object"
        )
        .map(
          (trade) => ({
            ...trade,

            id:
              String(
                trade.id ||
                  createId(
                    "trade"
                  )
              ),

            capitalId:
              capitalIds.has(
                String(
                  trade.capitalId
                )
              )
                ? String(
                    trade.capitalId
                  )
                : capitalsClean[0]
                    ?.id ||
                  "",

            asset:
              ASSETS.includes(
                trade.asset
              )
                ? trade.asset
                : "XAUUSD",

            direction:
              trade.direction ===
              "SELL"
                ? "SELL"
                : "BUY",

            exitType:
              EXIT_TYPES.includes(
                String(
                  trade.exitType ||
                    "BE"
                ).toUpperCase()
              )
                ? String(
                    trade.exitType ||
                      "BE"
                  ).toUpperCase()
                : "BE",

            status:
              "closed",

            pnl:
              Number(
                trade.pnl
              ) || 0,

            resultR:
              Number(
                trade.resultR
              ) || 0,

            riskMoney:
              Number(
                trade.riskMoney
              ) || 0,

            lot:
              Number(
                trade.lot
              ) || 0,

            rr:
              Number(
                trade.rr
              ) || 2,
          })
        );

    return {
      capitals:
        capitalsClean,
      trades:
        tradesClean,
    };
  }

  function handleImportFile(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const parsed =
          JSON.parse(
            String(
              reader.result ||
                ""
            )
          );

        const normalized =
          normalizeImportedData(
            parsed
          );

        if (
          !window.confirm(
            `Importer cette sauvegarde ?\n\nCapitaux : ${normalized.capitals.length}\nTrades : ${normalized.trades.length}\n\nLes données actuelles seront remplacées.`
          )
        ) {
          return;
        }

        setCapitals(
          normalized.capitals
        );

        setTrades(
          normalized.trades
        );

        setDashboardCapitalFilter(
          "all"
        );

        setTradeCapitalFilter(
          "all"
        );

        setSelectedTrade(
          null
        );

        setTradeDetailOpen(
          false
        );

        showNotification(
          "Sauvegarde importée avec succès."
        );
      } catch (error) {
        showNotification(
          error?.message ||
            "Impossible d'importer cette sauvegarde.",
          "error"
        );
      }
    };

    reader.onerror = () => {
      showNotification(
        "Impossible de lire le fichier.",
        "error"
      );
    };

    reader.readAsText(
      file
    );
  }

  const pageTitles = {
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

  function renderPage() {
    switch (
      activePage
    ) {
      case "dashboard":
        return (
          <DashboardPage
            capitals={
              capitals
            }
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
            trades={
              trades
            }
            capitals={
              capitals
            }
            filter={
              tradeCapitalFilter
            }
            setFilter={
              setTradeCapitalFilter
            }
            onNew={
              openNewTradeModal
            }
            onView={
              openTradeDetail
            }
            onEdit={
              openEditTradeModal
            }
            onDelete={
              deleteTrade
            }
          />
        );

      case "capitals":
        return (
          <CapitalPage
            capitals={
              capitals
            }
            trades={
              trades
            }
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
            trades={
              trades
            }
          />
        );

      case "calculator":
        return (
          <CalculatorPage
            capitals={
              capitals
            }
          />
        );

      case "settings":
        return (
          <SettingsPage
            capitals={
              capitals
            }
            trades={
              trades
            }
            onExport={
              exportData
            }
            fileInputRef={
              fileInputRef
            }
            onImportFile={
              handleImportFile
            }
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
        navigate={
          navigate
        }
        open={
          sidebarOpen
        }
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
        form={
          capitalForm
        }
        setForm={
          setCapitalForm
        }
        onClose={() =>
          setCapitalModalOpen(
            false
          )
        }
        onSave={
          saveCapital
        }
      />

      <TradeModal
        open={
          tradeModalOpen
        }
        editingTradeId={
          editingTradeId
        }
        form={
          tradeForm
        }
        setForm={
          setTradeForm
        }
        capitals={
          capitals
        }
        onClose={() => {
          setTradeModalOpen(
            false
          );
          setEditingTradeId(
            null
          );
        }}
        onSave={
          saveTrade
        }
      />

      <TradeDetailModal
        open={
          tradeDetailOpen
        }
        trade={
          selectedTrade
        }
        capital={
          selectedTrade
            ? capitals.find(
                (capital) =>
                  capital.id ===
                  selectedTrade.capitalId
              )
            : null
        }
        onClose={() => {
          setTradeDetailOpen(
            false
          );
          setSelectedTrade(
            null
          );
        }}
        onEdit={
          openEditTradeModal
        }
      />
    </div>
  );
}
