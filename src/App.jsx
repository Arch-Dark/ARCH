import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Calculator,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Settings,
  WalletCards,
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

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeNavigation = navigationItems.find(
    (item) => item.id === activePage
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
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

          {!sidebarOpen && <div className="brand-icon">TJ</div>}
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

                {sidebarOpen && <span>{item.label}</span>}
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
            <Settings size={20} strokeWidth={1.8} />

            {sidebarOpen && <span>Paramètres</span>}
          </button>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <ChevronDown
              size={18}
              className={sidebarOpen ? "rotate-90" : "rotate-minus-90"}
            />

            {sidebarOpen && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">TRADING JOURNAL</p>

            <h1>{activeNavigation?.label || "Dashboard"}</h1>
          </div>

          <div className="topbar-status">
            <span className="status-dot"></span>
            <span>Système opérationnel</span>
          </div>
        </header>

        <section className="page-content">
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "trades" && <PlaceholderPage title="Journal des trades" />}
          {activePage === "capitals" && <PlaceholderPage title="Capitaux" />}
          {activePage === "calendar" && <PlaceholderPage title="Calendrier" />}
          {activePage === "calculator" && (
            <PlaceholderPage title="Calculateur" />
          )}
        </section>
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="section-label">VUE D'ENSEMBLE</span>

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
          title="Capital total"
          value="$0.00"
          subtitle="Actif + archives"
        />

        <StatCard
          title="P&L"
          value="$0.00"
          subtitle="Performance cumulée"
        />

        <StatCard
          title="Win Rate"
          value="0.00%"
          subtitle="Tous les trades"
        />

        <StatCard
          title="Trades"
          value="0"
          subtitle="Total enregistré"
        />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card large-card">
          <div className="card-header">
            <div>
              <span className="card-label">ÉQUITY</span>
              <h3>Courbe de performance</h3>
            </div>

            <button type="button" className="card-action">
              Tout
              <ChevronDown size={15} />
            </button>
          </div>

          <div className="empty-chart">
            <BarChart3 size={42} />

            <strong>Aucune donnée disponible</strong>

            <span>
              Ajoute ton premier capital et ton premier trade pour commencer.
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-label">RÉSUMÉ</span>
              <h3>Statistiques</h3>
            </div>
          </div>

          <div className="statistics-list">
            <StatisticRow label="Profit Factor" value="—" />
            <StatisticRow label="R:R moyen" value="—" />
            <StatisticRow label="Gain moyen" value="—" />
            <StatisticRow label="Perte moyenne" value="—" />
            <StatisticRow label="Drawdown max." value="—" />
          </div>
        </div>
      </section>

      <section className="dashboard-card recent-trades-card">
        <div className="card-header">
          <div>
            <span className="card-label">JOURNAL</span>
            <h3>Trades récents</h3>
          </div>

          <span className="trade-count">0 trade</span>
        </div>

        <div className="empty-state">
          <BookOpen size={40} />

          <strong>Ton journal est encore vide</strong>

          <span>
            Tes trades apparaîtront ici une fois enregistrés.
          </span>
        </div>
      </section>
    </>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <article className="stat-card">
      <span className="stat-title">{title}</span>

      <strong className="stat-value">{value}</strong>

      <span className="stat-subtitle">{subtitle}</span>
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

      <span className="section-label">MODULE</span>

      <h2>{title}</h2>

      <p>
        Ce module sera développé dans les prochaines étapes du projet.
      </p>
    </section>
  );
}

export default App;
