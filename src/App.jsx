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

const CAPITALS_STORAGE_KEY = "trading-journal-capitals";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [capitals, setCapitals] = useState(() => {
    try {
      const savedCapitals = localStorage.getItem(CAPITALS_STORAGE_KEY);

      if (!savedCapitals) {
        return [];
      }

      const parsedCapitals = JSON.parse(savedCapitals);

      return Array.isArray(parsedCapitals) ? parsedCapitals : [];
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

  const activeNavigation = navigationItems.find(
    (item) => item.id === activePage
  );

  const totalBalance = useMemo(() => {
    return capitals.reduce(
      (total, capital) => total + Number(capital.currentBalance || 0),
      0
    );
  }, [capitals]);

  const totalInitialCapital = useMemo(() => {
    return capitals.reduce(
      (total, capital) => total + Number(capital.initialCapital || 0),
      0
    );
  }, [capitals]);

  const totalPnL = totalBalance - totalInitialCapital;

  const createCapital = (capitalData) => {
    const newCapital = {
      id: crypto.randomUUID(),
      name: capitalData.name.trim(),
      initialCapital: Number(capitalData.initialCapital),
      currentBalance: Number(capitalData.initialCapital),
      riskMode: capitalData.riskMode,
      riskPercent: Number(capitalData.riskPercent || 0),
      riskAmount: Number(capitalData.riskAmount || 0),
      status: "active",
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };

    setCapitals((currentCapitals) => [
      ...currentCapitals,
      newCapital,
    ]);
  };

  const updateCapital = (capitalId, updates) => {
    setCapitals((currentCapitals) =>
      currentCapitals.map((capital) =>
        capital.id === capitalId
          ? {
              ...capital,
              ...updates,
            }
          : capital
      )
    );
  };

  const archiveCapital = (capitalId) => {
    setCapitals((currentCapitals) =>
      currentCapitals.map((capital) =>
        capital.id === capitalId
          ? {
              ...capital,
              status: "archived",
              archivedAt: new Date().toISOString(),
            }
          : capital
      )
    );
  };

  const restoreCapital = (capitalId) => {
    setCapitals((currentCapitals) =>
      currentCapitals.map((capital) =>
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

  const deleteCapital = (capitalId) => {
    const capital = capitals.find(
      (item) => item.id === capitalId
    );

    if (!capital) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement le capital "${capital.name}" ?\n\nCette action supprimera uniquement ce capital.`
    );

    if (!confirmed) {
      return;
    }

    setCapitals((currentCapitals) =>
      currentCapitals.filter(
        (item) => item.id !== capitalId
      )
    );
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <div className="sidebar-header">
          {sidebarOpen && (
            <div className="brand">
              <div className="brand-icon">TJ</div>

              <div className="brand-text">
                <strong>Trading Journal</strong>
                <span>Professional</span>
              </div>
            </div>
          )}

          {!sidebarOpen && (
            <div className="brand-icon">TJ</div>
          )}
        </div>

        <nav className="sidebar-navigation">
          <div className="navigation-section-title">
            {sidebarOpen ? "MENU PRINCIPAL" : ""}
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`navigation-item ${
                  isActive ? "navigation-item-active" : ""
                }`}
                onClick={() => setActivePage(item.id)}
                title={!sidebarOpen ? item.label : ""}
              >
                <Icon size={20} strokeWidth={1.8} />

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
            title={!sidebarOpen ? "Paramètres" : ""}
          >
            <Settings
              size={20}
              strokeWidth={1.8}
            />

            {sidebarOpen && <span>Paramètres</span>}
          </button>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() =>
              setSidebarOpen((current) => !current)
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

            {sidebarOpen && <span>Réduire</span>}
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
              {activeNavigation?.label || "Dashboard"}
            </h1>
          </div>

          <div className="topbar-status">
            <span className="status-dot"></span>
            <span>Système opérationnel</span>
          </div>
        </header>

        <section className="page-content">
          {activePage === "dashboard" && (
            <Dashboard
              capitals={capitals}
              totalBalance={totalBalance}
              totalInitialCapital={totalInitialCapital}
              totalPnL={totalPnL}
            />
          )}

          {activePage === "trades" && (
            <PlaceholderPage title="Journal des trades" />
          )}

          {activePage === "capitals" && (
            <CapitalsPage
              capitals={capitals}
              onCreateCapital={createCapital}
              onUpdateCapital={updateCapital}
              onArchiveCapital={archiveCapital}
              onRestoreCapital={restoreCapital}
              onDeleteCapital={deleteCapital}
            />
          )}

          {activePage === "calendar" && (
            <PlaceholderPage title="Calendrier" />
          )}

          {activePage === "calculator" && (
            <PlaceholderPage title="Calculateur" />
          )}
        </section>
      </main>
    </div>
  );
}

function Dashboard({
  capitals,
  totalBalance,
  totalInitialCapital,
  totalPnL,
}) {
  const totalTrades = 0;
  const winRate = 0;

  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="section-label">
            VUE D&apos;ENSEMBLE
          </span>

          <h2>Performance générale</h2>

          <p>
            Analyse de tous les capitaux actifs et archivés.
          </p>
        </div>

        <div className="capital-selector">
          <span>Capital analysé</span>

          <button type="button">
            Tous les capitaux
            <ChevronDown size={16} />
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Balance totale"
          value={formatMoney(totalBalance)}
          subtitle={`${capitals.length} capital${
            capitals.length > 1 ? "aux" : ""
          }`}
        />

        <StatCard
          title="P&L"
          value={formatMoney(totalPnL)}
          subtitle={`Initial : ${formatMoney(
            totalInitialCapital
          )}`}
        />

        <StatCard
          title="Win Rate"
          value={`${winRate.toFixed(2)}%`}
          subtitle="Tous les trades"
        />

        <StatCard
          title="Trades"
          value={String(totalTrades)}
          subtitle="Total enregistré"
        />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card large-card">
          <div className="card-header">
            <div>
              <span className="card-label">
                EQUITY
              </span>

              <h3>Courbe de performance</h3>
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
              Aucune donnée de trading disponible
            </strong>

            <span>
              Les données d&apos;equity apparaîtront
              après l&apos;enregistrement des trades.
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-label">
                CAPITAUX
              </span>

              <h3>Résumé</h3>
            </div>
          </div>

          <div className="statistics-list">
            <StatisticRow
              label="Capitaux actifs"
              value={String(
                capitals.filter(
                  (capital) => capital.status === "active"
                ).length
              )}
            />

            <StatisticRow
              label="Capitaux archivés"
              value={String(
                capitals.filter(
                  (capital) =>
                    capital.status === "archived"
                ).length
              )}
            />

            <StatisticRow
              label="Capital initial"
              value={formatMoney(totalInitialCapital)}
            />

            <StatisticRow
              label="Balance totale"
              value={formatMoney(totalBalance)}
            />

            <StatisticRow
              label="P&L cumulé"
              value={formatMoney(totalPnL)}
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

            <h3>Trades récents</h3>
          </div>

          <span className="trade-count">
            0 trade
          </span>
        </div>

        <div className="empty-state">
          <BookOpen size={40} />

          <strong>
            Ton journal est encore vide
          </strong>

          <span>
            Tes trades apparaîtront ici une fois
            enregistrés.
          </span>
        </div>
      </section>
    </>
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
  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [editingCapitalId, setEditingCapitalId] =
    useState(null);

  const activeCapitals = capitals.filter(
    (capital) => capital.status === "active"
  );

  const archivedCapitals = capitals.filter(
    (capital) => capital.status === "archived"
  );

  return (
    <div className="capitals-module">
      <section className="welcome-section">
        <div>
          <span className="section-label">
            GESTION
          </span>

          <h2>Capitaux</h2>

          <p>
            Gère tes comptes de trading actifs et
            archivés.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowCreateForm(true)
          }
          style={primaryButtonStyle}
        >
          <Plus size={18} />
          Nouveau capital
        </button>
      </section>

      {showCreateForm && (
        <CapitalForm
          onCancel={() =>
            setShowCreateForm(false)
          }
          onSubmit={(data) => {
            onCreateCapital(data);
            setShowCreateForm(false);
          }}
        />
      )}

      <section style={capitalSummaryGridStyle}>
        <CapitalSummaryCard
          icon={<WalletCards size={21} />}
          label="Capitaux actifs"
          value={activeCapitals.length}
        />

        <CapitalSummaryCard
          icon={<Archive size={21} />}
          label="Capitaux archivés"
          value={archivedCapitals.length}
        />

        <CapitalSummaryCard
          icon={<CircleDollarSign size={21} />}
          label="Balance totale"
          value={formatMoney(
            capitals.reduce(
              (total, capital) =>
                total +
                Number(capital.currentBalance || 0),
              0
            )
          )}
        />
      </section>

      <CapitalSection
        title="Capitaux actifs"
        label="ACTIFS"
        capitals={activeCapitals}
        emptyMessage="Aucun capital actif."
        editingCapitalId={editingCapitalId}
        setEditingCapitalId={setEditingCapitalId}
        onUpdateCapital={onUpdateCapital}
        onArchiveCapital={onArchiveCapital}
        onRestoreCapital={onRestoreCapital}
        onDeleteCapital={onDeleteCapital}
      />

      <CapitalSection
        title="Capitaux archivés"
        label="ARCHIVES"
        capitals={archivedCapitals}
        emptyMessage="Aucun capital archivé."
        editingCapitalId={editingCapitalId}
        setEditingCapitalId={setEditingCapitalId}
        onUpdateCapital={onUpdateCapital}
        onArchiveCapital={onArchiveCapital}
        onRestoreCapital={onRestoreCapital}
        onDeleteCapital={onDeleteCapital}
      />
    </div>
  );
}

function CapitalSection({
  title,
  label,
  capitals,
  emptyMessage,
  editingCapitalId,
  setEditingCapitalId,
  onUpdateCapital,
  onArchiveCapital,
  onRestoreCapital,
  onDeleteCapital,
}) {
  return (
    <section style={sectionContainerStyle}>
      <div style={sectionHeadingStyle}>
        <div>
          <span className="section-label">
            {label}
          </span>

          <h3 style={sectionTitleStyle}>
            {title}
          </h3>
        </div>

        <span style={countBadgeStyle}>
          {capitals.length}
        </span>
      </div>

      {capitals.length === 0 ? (
        <div style={emptyCapitalStyle}>
          <WalletCards size={34} />

          <strong>{emptyMessage}</strong>

          <span>
            Crée ton premier capital pour commencer
            à enregistrer tes trades.
          </span>
        </div>
      ) : (
        <div style={capitalCardsGridStyle}>
          {capitals.map((capital) => (
            <div key={capital.id}>
              {editingCapitalId === capital.id ? (
                <CapitalEditForm
                  capital={capital}
                  onCancel={() =>
                    setEditingCapitalId(null)
                  }
                  onSave={(updates) => {
                    onUpdateCapital(
                      capital.id,
                      updates
                    );

                    setEditingCapitalId(null);
                  }}
                />
              ) : (
                <CapitalCard
                  capital={capital}
                  onEdit={() =>
                    setEditingCapitalId(capital.id)
                  }
                  onArchive={() =>
                    onArchiveCapital(capital.id)
                  }
                  onRestore={() =>
                    onRestoreCapital(capital.id)
                  }
                  onDelete={() =>
                    onDeleteCapital(capital.id)
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CapitalCard({
  capital,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}) {
  const pnl =
    Number(capital.currentBalance || 0) -
    Number(capital.initialCapital || 0);

  const pnlPercent =
    Number(capital.initialCapital || 0) > 0
      ? (pnl / Number(capital.initialCapital)) * 100
      : 0;

  const calculatedRiskAmount =
    capital.riskMode === "percentage"
      ? (Number(capital.currentBalance || 0) *
          Number(capital.riskPercent || 0)) /
        100
      : Number(capital.riskAmount || 0);

  return (
    <article style={capitalCardStyle}>
      <div style={capitalCardHeaderStyle}>
        <div>
          <div style={capitalNameRowStyle}>
            <h4 style={capitalNameStyle}>
              {capital.name}
            </h4>

            <span
              style={{
                ...statusBadgeStyle,
                ...(capital.status === "active"
                  ? activeBadgeStyle
                  : archivedBadgeStyle),
              }}
            >
              {capital.status === "active"
                ? "ACTIF"
                : "ARCHIVÉ"}
            </span>
          </div>

          <span style={createdDateStyle}>
            Créé le {formatDate(capital.createdAt)}
          </span>
        </div>

        <div style={capitalCardActionsStyle}>
          <button
            type="button"
            onClick={onEdit}
            title="Modifier"
            style={iconButtonStyle}
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Supprimer"
            style={iconButtonDangerStyle}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div style={balanceBlockStyle}>
        <span style={smallLabelStyle}>
          BALANCE ACTUELLE
        </span>

        <strong style={balanceValueStyle}>
          {formatMoney(capital.currentBalance)}
        </strong>

        <span
          style={{
            ...pnlTextStyle,
            ...(pnl >= 0
              ? positiveTextStyle
              : negativeTextStyle),
          }}
        >
          {pnl >= 0 ? "+" : ""}
          {formatMoney(pnl)} (
          {pnlPercent >= 0 ? "+" : ""}
          {pnlPercent.toFixed(2)}%)
        </span>
      </div>

      <div style={capitalDetailsGridStyle}>
        <CapitalDetail
          label="Capital initial"
          value={formatMoney(capital.initialCapital)}
        />

        <CapitalDetail
          label="Risque"
          value={`${Number(
            capital.riskPercent || 0
          ).toFixed(2)} %`}
        />

        <CapitalDetail
          label="Montant du risque"
          value={formatMoney(calculatedRiskAmount)}
        />

        <CapitalDetail
          label="Mode"
          value={
            capital.riskMode === "percentage"
              ? "Pourcentage"
              : "Montant fixe"
          }
        />
      </div>

      <div style={capitalCardFooterStyle}>
        {capital.status === "active" ? (
          <button
            type="button"
            onClick={onArchive}
            style={secondaryButtonStyle}
          >
            <Archive size={16} />
            Archiver
          </button>
        ) : (
          <button
            type="button"
            onClick={onRestore}
            style={secondaryButtonStyle}
          >
            <RotateCcw size={16} />
            Réactiver
          </button>
        )}
      </div>
    </article>
  );
}

function CapitalForm({ onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [initialCapital, setInitialCapital] =
    useState("");
  const [riskMode, setRiskMode] =
    useState("percentage");
  const [riskPercent, setRiskPercent] =
    useState("1");
  const [riskAmount, setRiskAmount] =
    useState("");

  const numericCapital = Number(initialCapital) || 0;

  const calculatedAmount =
    riskMode === "percentage"
      ? (numericCapital *
          (Number(riskPercent) || 0)) /
        100
      : Number(riskAmount) || 0;

  const calculatedPercent =
    numericCapital > 0
      ? ((Number(riskAmount) || 0) /
          numericCapital) *
        100
      : 0;

  const canSubmit =
    name.trim().length > 0 &&
    numericCapital > 0 &&
    calculatedAmount > 0;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      name,
      initialCapital: numericCapital,
      riskMode,
      riskPercent:
        riskMode === "percentage"
          ? Number(riskPercent)
          : calculatedPercent,
      riskAmount: calculatedAmount,
    });
  };

  return (
    <section style={formContainerStyle}>
      <div style={formHeaderStyle}>
        <div>
          <span className="section-label">
            NOUVEAU
          </span>

          <h3 style={formTitleStyle}>
            Créer un capital
          </h3>
        </div>

        <button
          type="button"
          onClick={onCancel}
          style={closeButtonStyle}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={formGridStyle}>
          <FormField label="Nom du capital">
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Ex : Capital principal"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Capital initial">
            <div style={inputWithSuffixStyle}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={initialCapital}
                onChange={(event) =>
                  setInitialCapital(
                    event.target.value
                  )
                }
                placeholder="1000"
                style={inputWithoutBorderStyle}
              />

              <span>USD</span>
            </div>
          </FormField>
        </div>

        <div style={riskSectionStyle}>
          <div>
            <span style={riskTitleStyle}>
              Risque par trade
            </span>

            <p style={riskDescriptionStyle}>
              Les deux valeurs seront enregistrées
              pour chaque capital.
            </p>
          </div>

          <div style={modeSelectorStyle}>
            <button
              type="button"
              onClick={() =>
                setRiskMode("percentage")
              }
              style={{
                ...modeButtonStyle,
                ...(riskMode === "percentage"
                  ? modeButtonActiveStyle
                  : {}),
              }}
            >
              Pourcentage
            </button>

            <button
              type="button"
              onClick={() =>
                setRiskMode("fixed")
              }
              style={{
                ...modeButtonStyle,
                ...(riskMode === "fixed"
                  ? modeButtonActiveStyle
                  : {}),
              }}
            >
              Montant fixe
            </button>
          </div>

          <div style={formGridStyle}>
            <FormField label="Risque en %">
              <div style={inputWithSuffixStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    riskMode === "percentage"
                      ? riskPercent
                      : calculatedPercent.toFixed(2)
                  }
                  onChange={(event) => {
                    if (
                      riskMode === "percentage"
                    ) {
                      setRiskPercent(
                        event.target.value
                      );
                    }
                  }}
                  disabled={
                    riskMode === "fixed"
                  }
                  style={{
                    ...inputWithoutBorderStyle,
                    ...(riskMode === "fixed"
                      ? disabledInputStyle
                      : {}),
                  }}
                  placeholder="1"
                />

                <span>%</span>
              </div>
            </FormField>

            <FormField label="Montant exact du risque">
              <div style={inputWithSuffixStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    riskMode === "percentage"
                      ? calculatedAmount
                        ? calculatedAmount.toFixed(
                            2
                          )
                        : ""
                      : riskAmount
                  }
                  onChange={(event) => {
                    if (riskMode === "fixed") {
                      setRiskAmount(
                        event.target.value
                      );
                    }
                  }}
                  disabled={
                    riskMode === "percentage"
                  }
                  style={{
                    ...inputWithoutBorderStyle,
                    ...(riskMode === "percentage"
                      ? disabledInputStyle
                      : {}),
                  }}
                  placeholder="10"
                />

                <span>USD</span>
              </div>
            </FormField>
          </div>

          <div style={riskPreviewStyle}>
            <div>
              <span>
                Risque enregistré
              </span>

              <strong>
                {formatMoney(calculatedAmount)}
              </strong>
            </div>

            <div>
              <span>
                Pourcentage enregistré
              </span>

              <strong>
                {(
                  riskMode === "percentage"
                    ? Number(riskPercent) || 0
                    : calculatedPercent
                ).toFixed(2)}
                %
              </strong>
            </div>
          </div>
        </div>

        <div style={formActionsStyle}>
          <button
            type="button"
            onClick={onCancel}
            style={secondaryButtonStyle}
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...primaryButtonStyle,
              ...(!canSubmit
                ? disabledButtonStyle
                : {}),
            }}
          >
            <Check size={17} />
            Créer le capital
          </button>
        </div>
      </form>
    </section>
  );
}

function CapitalEditForm({
  capital,
  onCancel,
  onSave,
}) {
  const [name, setName] = useState(
    capital.name
  );

  const [currentBalance, setCurrentBalance] =
    useState(String(capital.currentBalance));

  const [riskMode, setRiskMode] =
    useState(capital.riskMode);

  const [riskPercent, setRiskPercent] =
    useState(String(capital.riskPercent));

  const [riskAmount, setRiskAmount] =
    useState(String(capital.riskAmount));

  const numericBalance =
    Number(currentBalance) || 0;

  const calculatedRiskAmount =
    riskMode === "percentage"
      ? (numericBalance *
          (Number(riskPercent) || 0)) /
        100
      : Number(riskAmount) || 0;

  const calculatedRiskPercent =
    numericBalance > 0
      ? ((Number(riskAmount) || 0) /
          numericBalance) *
        100
      : 0;

  const handleSubmit = (event) => {
    event.preventDefault();

    const finalRiskAmount =
      riskMode === "percentage"
        ? calculatedRiskAmount
        : Number(riskAmount) || 0;

    const finalRiskPercent =
      riskMode === "percentage"
        ? Number(riskPercent) || 0
        : calculatedRiskPercent;

    onSave({
      name: name.trim() || capital.name,
      currentBalance: numericBalance,
      riskMode,
      riskPercent: finalRiskPercent,
      riskAmount: finalRiskAmount,
    });
  };

  return (
    <section style={editFormStyle}>
      <div style={formHeaderStyle}>
        <div>
          <span className="section-label">
            MODIFICATION
          </span>

          <h4 style={formTitleStyle}>
            {capital.name}
          </h4>
        </div>

        <button
          type="button"
          onClick={onCancel}
          style={closeButtonStyle}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={formGridStyle}>
          <FormField label="Nom">
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              style={inputStyle}
            />
          </FormField>

          <FormField label="Balance actuelle">
            <div style={inputWithSuffixStyle}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentBalance}
                onChange={(event) =>
                  setCurrentBalance(
                    event.target.value
                  )
                }
                style={inputWithoutBorderStyle}
              />

              <span>USD</span>
            </div>
          </FormField>
        </div>

        <div style={riskSectionStyle}>
          <span style={riskTitleStyle}>
            Risque par trade
          </span>

          <div style={modeSelectorStyle}>
            <button
              type="button"
              onClick={() =>
                setRiskMode("percentage")
              }
              style={{
                ...modeButtonStyle,
                ...(riskMode === "percentage"
                  ? modeButtonActiveStyle
                  : {}),
              }}
            >
              Pourcentage
            </button>

            <button
              type="button"
              onClick={() =>
                setRiskMode("fixed")
              }
              style={{
                ...modeButtonStyle,
                ...(riskMode === "fixed"
                  ? modeButtonActiveStyle
                  : {}),
              }}
            >
              Montant fixe
            </button>
          </div>

          <div style={formGridStyle}>
            <FormField label="Risque en %">
              <div style={inputWithSuffixStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    riskMode === "percentage"
                      ? riskPercent
                      : calculatedRiskPercent.toFixed(
                          2
                        )
                  }
                  onChange={(event) => {
                    if (
                      riskMode === "percentage"
                    ) {
                      setRiskPercent(
                        event.target.value
                      );
                    }
                  }}
                  disabled={
                    riskMode === "fixed"
                  }
                  style={{
                    ...inputWithoutBorderStyle,
                    ...(riskMode === "fixed"
                      ? disabledInputStyle
                      : {}),
                  }}
                />

                <span>%</span>
              </div>
            </FormField>

            <FormField label="Montant exact">
              <div style={inputWithSuffixStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    riskMode === "percentage"
                      ? calculatedRiskAmount.toFixed(
                          2
                        )
                      : riskAmount
                  }
                  onChange={(event) => {
                    if (riskMode === "fixed") {
                      setRiskAmount(
                        event.target.value
                      );
                    }
                  }}
                  disabled={
                    riskMode === "percentage"
                  }
                  style={{
                    ...inputWithoutBorderStyle,
                    ...(riskMode === "percentage"
                      ? disabledInputStyle
                      : {}),
                  }}
                />

                <span>USD</span>
              </div>
            </FormField>
          </div>
        </div>

        <div style={formActionsStyle}>
          <button
            type="button"
            onClick={onCancel}
            style={secondaryButtonStyle}
          >
            Annuler
          </button>

          <button
            type="submit"
            style={primaryButtonStyle}
          >
            <Check size={17} />
            Enregistrer
          </button>
        </div>
      </form>
    </section>
  );
}

function FormField({ label, children }) {
  return (
    <label style={formFieldStyle}>
      <span style={fieldLabelStyle}>
        {label}
      </span>

      {children}
    </label>
  );
}

function CapitalSummaryCard({
  icon,
  label,
  value,
}) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryIconStyle}>
        {icon}
      </div>

      <div>
        <span style={smallLabelStyle}>
          {label}
        </span>

        <strong style={summaryValueStyle}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function CapitalDetail({ label, value }) {
  return (
    <div style={capitalDetailStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function StatisticRow({ label, value }) {
  return (
    <div className="statistic-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <BookOpen size={34} />
      </div>

      <span className="section-label">
        MODULE
      </span>

      <h2>{title}</h2>

      <p>
        Ce module sera développé dans les
        prochaines étapes du projet.
      </p>
    </section>
  );
}

function formatMoney(value) {
  const numericValue = Number(value) || 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "11px 16px",
  border: "none",
  borderRadius: "10px",
  background: "var(--accent, #2563eb)",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "9px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const disabledButtonStyle = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const capitalSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
  marginBottom: "28px",
};

const summaryCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "18px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.025)",
};

const summaryIconStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(37,99,235,0.12)",
};

const summaryValueStyle = {
  display: "block",
  marginTop: "4px",
  fontSize: "21px",
};

const smallLabelStyle = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "0.07em",
  opacity: 0.55,
};

const sectionContainerStyle = {
  marginBottom: "34px",
};

const sectionHeadingStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "15px",
};

const sectionTitleStyle = {
  margin: "5px 0 0",
  fontSize: "20px",
};

const countBadgeStyle = {
  minWidth: "30px",
  height: "30px",
  padding: "0 9px",
  borderRadius: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.06)",
  fontSize: "13px",
  fontWeight: 700,
};

const emptyCapitalStyle = {
  minHeight: "190px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "30px",
  borderRadius: "14px",
  border: "1px dashed rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.018)",
  textAlign: "center",
  opacity: 0.7,
};

const capitalCardsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(310px, 1fr))",
  gap: "16px",
};

const capitalCardStyle = {
  padding: "20px",
  borderRadius: "15px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.025)",
};

const capitalCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "15px",
};

const capitalNameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const capitalNameStyle = {
  margin: 0,
  fontSize: "17px",
};

const statusBadgeStyle = {
  padding: "4px 7px",
  borderRadius: "5px",
  fontSize: "9px",
  fontWeight: 800,
  letterSpacing: "0.06em",
};

const activeBadgeStyle = {
  background: "rgba(34,197,94,0.12)",
  color: "#4ade80",
};

const archivedBadgeStyle = {
  background: "rgba(148,163,184,0.12)",
  color: "#94a3b8",
};

const createdDateStyle = {
  display: "block",
  marginTop: "5px",
  fontSize: "11px",
  opacity: 0.45,
};

const capitalCardActionsStyle = {
  display: "flex",
  gap: "6px",
};

const iconButtonStyle = {
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "inherit",
  cursor: "pointer",
};

const iconButtonDangerStyle = {
  ...iconButtonStyle,
  color: "#f87171",
};

const balanceBlockStyle = {
  marginTop: "22px",
  paddingBottom: "18px",
  borderBottom:
    "1px solid rgba(255,255,255,0.07)",
};

const balanceValueStyle = {
  display: "block",
  marginTop: "5px",
  fontSize: "27px",
  letterSpacing: "-0.02em",
};

const pnlTextStyle = {
  display: "block",
  marginTop: "5px",
  fontSize: "12px",
  fontWeight: 600,
};

const positiveTextStyle = {
  color: "#4ade80",
};

const negativeTextStyle = {
  color: "#f87171",
};

const capitalDetailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "18px",
};

const capitalDetailStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const capitalCardFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "18px",
};

const formContainerStyle = {
  marginBottom: "28px",
  padding: "22px",
  borderRadius: "15px",
  border:
    "1px solid rgba(37,99,235,0.30)",
  background: "rgba(37,99,235,0.045)",
};

const editFormStyle = {
  padding: "20px",
  borderRadius: "15px",
  border:
    "1px solid rgba(37,99,235,0.30)",
  background: "rgba(37,99,235,0.045)",
};

const formHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: "22px",
};

const formTitleStyle = {
  margin: "5px 0 0",
  fontSize: "20px",
};

const closeButtonStyle = {
  width: "34px",
  height: "34px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "inherit",
  cursor: "pointer",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
};

const formFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const fieldLabelStyle = {
  fontSize: "12px",
  fontWeight: 600,
  opacity: 0.72,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: "9px",
  border:
    "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.16)",
  color: "inherit",
  outline: "none",
};

const inputWithSuffixStyle = {
  display: "flex",
  alignItems: "center",
  borderRadius: "9px",
  border:
    "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.16)",
  overflow: "hidden",
};

const inputWithoutBorderStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "inherit",
};

const disabledInputStyle = {
  opacity: 0.55,
};

const riskSectionStyle = {
  marginTop: "22px",
  padding: "18px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background: "rgba(0,0,0,0.10)",
};

const riskTitleStyle = {
  display: "block",
  fontWeight: 700,
};

const riskDescriptionStyle = {
  margin: "4px 0 15px",
  fontSize: "12px",
  opacity: 0.55,
};

const modeSelectorStyle = {
  display: "inline-flex",
  gap: "4px",
  padding: "4px",
  marginBottom: "17px",
  borderRadius: "9px",
  background: "rgba(255,255,255,0.05)",
};

const modeButtonStyle = {
  padding: "8px 11px",
  border: "none",
  borderRadius: "7px",
  background: "transparent",
  color: "inherit",
  opacity: 0.65,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};

const modeButtonActiveStyle = {
  background: "rgba(255,255,255,0.09)",
  opacity: 1,
};

const riskPreviewStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "16px",
};

const formActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "9px",
  marginTop: "22px",
};

export default App;
