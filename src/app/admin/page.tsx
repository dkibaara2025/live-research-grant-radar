import Link from "next/link";
import { AdminConsole } from "@/components/admin-console";

export default function AdminPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            LR
          </div>
          <div className="brand-text">
            <h1>Admin Console</h1>
            <p>Maintain manual opportunities and refresh configured sources.</p>
          </div>
        </div>
        <Link className="ghost-button nav-link" href="/">
          Back to radar
        </Link>
      </header>
      <AdminConsole />
    </main>
  );
}
