"use client";

import { useEffect, useState } from "react";

type ManualOpportunityRow = {
  id: string;
  title: string;
  funder: string;
  deadline: string;
  amount: string;
  regionEligibility: string;
  careerStageEligibility: string;
  topics: string[];
  description: string;
  url: string;
  updatedAt: string;
};

type AdminResponse = {
  items: ManualOpportunityRow[];
  adminKeyConfigured: boolean;
  productionWarning: string | null;
};

type ManualForm = {
  title: string;
  funder: string;
  url: string;
  deadline: string;
  amount: string;
  regionEligibility: string;
  careerStageEligibility: string;
  topics: string;
  description: string;
};

const emptyForm: ManualForm = {
  title: "",
  funder: "",
  url: "",
  deadline: "",
  amount: "",
  regionEligibility: "",
  careerStageEligibility: "",
  topics: "",
  description: "",
};

export function AdminConsole() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<ManualOpportunityRow[]>([]);
  const [form, setForm] = useState<ManualForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading admin data...");
  const [adminKeyConfigured, setAdminKeyConfigured] = useState(false);
  const [productionWarning, setProductionWarning] = useState<string | null>(null);

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function loadAdminData() {
    const response = await fetch("/api/admin/opportunities");
    const payload = (await response.json()) as AdminResponse;

    setItems(payload.items ?? []);
    setAdminKeyConfigured(payload.adminKeyConfigured);
    setProductionWarning(payload.productionWarning);
    setStatus(`${payload.items?.length ?? 0} manual opportunities loaded.`);
  }

  async function saveManualOpportunity() {
    const payload = {
      ...form,
      topics: form.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
    };
    const response = await fetch("/api/admin/opportunities", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminKey ? { "x-admin-key": adminKey } : {}),
      },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(result.error ?? "Manual opportunity save failed.");
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setStatus("Manual opportunity saved.");
    await loadAdminData();
  }

  async function refreshSources() {
    setStatus("Refreshing configured funding sources...");

    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: adminKey ? { "x-admin-key": adminKey } : {},
    });
    const result = (await response.json()) as {
      error?: string;
      dataMode?: string;
      opportunityCount?: number;
      sourceStatuses?: Array<{ count: number }>;
    };

    if (!response.ok) {
      setStatus(result.error ?? "Source refresh failed.");
      return;
    }

    const count =
      result.sourceStatuses?.reduce((total, item) => total + item.count, 0) ?? 0;
    setStatus(`Source refresh completed in ${result.dataMode ?? "unknown"} mode; ${count} items reported.`);
  }

  function editItem(item: ManualOpportunityRow) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      funder: item.funder,
      url: item.url,
      deadline: item.deadline,
      amount: item.amount,
      regionEligibility: item.regionEligibility,
      careerStageEligibility: item.careerStageEligibility,
      topics: item.topics.join(", "),
      description: item.description,
    });
  }

  return (
    <section className="admin-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Access</p>
            <h2>Admin key</h2>
          </div>
          <span className="source-chip cached">
            {adminKeyConfigured ? "Protected" : "Open"}
          </span>
        </div>
        <div className="admin-body">
          {productionWarning ? <div className="notice">{productionWarning}</div> : null}
          <label className="field" htmlFor="admin-key">
            <span>ADMIN_KEY</span>
            <input
              id="admin-key"
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Required only when configured"
            />
          </label>
          <div className="actions">
            <div className="run-status">{status}</div>
            <button className="primary-button" type="button" onClick={refreshSources}>
              Refresh sources
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Manual opportunity</p>
            <h2>{editingId ? "Edit opportunity" : "Add opportunity"}</h2>
          </div>
        </div>
        <div className="admin-body">
          <div className="field-grid">
            {(["title", "funder", "url", "deadline", "amount"] as const).map((field) => (
              <label className="field" htmlFor={field} key={field}>
                <span>{field}</span>
                <input
                  id={field}
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <label className="field" htmlFor="topics">
            <span>topics</span>
            <input
              id="topics"
              value={form.topics}
              onChange={(event) =>
                setForm((current) => ({ ...current, topics: event.target.value }))
              }
              placeholder="climate, health systems, pilot"
            />
          </label>
          <div className="field-grid">
            <label className="field" htmlFor="regionEligibility">
              <span>region eligibility</span>
              <input
                id="regionEligibility"
                value={form.regionEligibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    regionEligibility: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field" htmlFor="careerStageEligibility">
              <span>career stage eligibility</span>
              <input
                id="careerStageEligibility"
                value={form.careerStageEligibility}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    careerStageEligibility: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label className="field" htmlFor="description">
            <span>description</span>
            <textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <div className="actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
              }}
            >
              Clear
            </button>
            <button className="primary-button" type="button" onClick={saveManualOpportunity}>
              Save opportunity
            </button>
          </div>
        </div>
      </section>

      <section className="panel admin-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current opportunities</p>
            <h2>{items.length} manual records</h2>
          </div>
        </div>
        <div className="history-list admin-list">
          {items.length === 0 ? <p className="empty-state">No manual opportunities yet.</p> : null}
          {items.map((item) => (
            <button
              className="history-row"
              type="button"
              key={item.id}
              onClick={() => editItem(item)}
            >
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.funder} / {item.deadline}
                </small>
              </span>
              <span className="mode-dot cached">edit</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
