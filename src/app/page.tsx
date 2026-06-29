import Link from "next/link";
import { GrantRadarShell } from "@/components/grant-radar-shell";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            LR
          </div>
          <div className="brand-text">
            <h1>Live Research Grant Radar</h1>
            <p>Ranked funding matches for research teams.</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Link className="ghost-button nav-link" href="/admin">
            Admin
          </Link>
          <div className="status-pill" aria-label="Application status">
            <span className="status-dot" aria-hidden="true" />
            Live radar
          </div>
        </div>
      </header>

      <GrantRadarShell />
    </main>
  );
}
