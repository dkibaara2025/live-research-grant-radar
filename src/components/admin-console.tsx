"use client";

import { useEffect, useState } from "react";

type AdminTab = "opportunities" | "team" | "proposals" | "sources" | "health";

type ManualOpportunityRow = {
  id: string;
  title: string;
  funder: string;
  callUrl: string;
  applicationUrl: string;
  funderType: string;
  deadline: string;
  amount: string;
  regionEligibility: string;
  careerStageEligibility: string;
  topics: string[];
  description: string;
};

type TeamRow = {
  id: string;
  name: string;
  role: string;
  scholarUrl?: string;
  affiliation?: string;
  expertise: string[];
  methods: string[];
  geographies: string[];
  careerStage: string;
  leadershipStrength: string;
  publicationHighlights: string;
  implementationExperience: string;
  availability: string;
};

type ProposalRow = {
  id: string;
  title: string;
  projectArea: string;
  abstract: string;
  fullText: string;
  funderTarget?: string;
  previousCall?: string;
  status: string;
  year: number;
  piTeam?: string;
  keywords: string[];
  methods: string[];
  geography: string;
  budgetRange: string;
};

type AdminStats = {
  manualOpportunities: number;
  teamMembers: number;
  proposals: number;
  radarRuns: number;
  missingCallLinks: number;
  latestSourceRefresh: string | null;
};

const emptyOpportunity = {
  title: "",
  funder: "",
  callUrl: "",
  applicationUrl: "",
  funderType: "needs verification",
  deadline: "",
  amount: "",
  regionEligibility: "",
  careerStageEligibility: "",
  topics: "",
  description: "",
};

const emptyTeam = {
  name: "",
  role: "",
  email: "",
  scholarUrl: "",
  affiliation: "",
  expertise: "",
  methods: "",
  geographies: "",
  careerStage: "",
  leadershipStrength: "",
  publicationHighlights: "",
  implementationExperience: "",
  availability: "",
};

const emptyProposal = {
  title: "",
  projectArea: "",
  abstract: "",
  fullText: "",
  funderTarget: "",
  previousCall: "",
  status: "draft",
  year: new Date().getFullYear(),
  piTeam: "",
  keywords: "",
  methods: "",
  geography: "",
  budgetRange: "",
  fileName: "",
};

export function AdminConsole() {
  const [activeTab, setActiveTab] = useState<AdminTab>("opportunities");
  const [adminKey, setAdminKey] = useState("");
  const [status, setStatus] = useState("Loading admin console...");
  const [productionWarning, setProductionWarning] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [opportunities, setOpportunities] = useState<ManualOpportunityRow[]>([]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);
  const [teamForm, setTeamForm] = useState(emptyTeam);
  const [proposalForm, setProposalForm] = useState(emptyProposal);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      await Promise.all([loadStats(), loadOpportunities(), loadTeam(), loadProposals()]);
    }

    void loadInitialData();
  }, []);

  async function loadStats() {
    const response = await fetch("/api/admin/stats");
    const payload = (await response.json()) as {
      stats: AdminStats;
      productionWarning: string | null;
    };

    setStats(payload.stats);
    setProductionWarning(payload.productionWarning);
  }

  async function loadOpportunities() {
    const response = await fetch("/api/admin/opportunities");
    const payload = (await response.json()) as { items: ManualOpportunityRow[] };

    setOpportunities(payload.items ?? []);
    setStatus(`${payload.items?.length ?? 0} manual opportunities loaded.`);
  }

  async function loadTeam() {
    const response = await fetch("/api/admin/team");
    const payload = (await response.json()) as { items: TeamRow[] };

    setTeam(payload.items ?? []);
  }

  async function loadProposals() {
    const response = await fetch("/api/admin/proposals");
    const payload = (await response.json()) as { items: ProposalRow[] };

    setProposals(payload.items ?? []);
  }

  async function saveOpportunity() {
    const payload = {
      ...opportunityForm,
      topics: splitList(opportunityForm.topics),
    };
    const response = await writeJson(
      "/api/admin/opportunities",
      editingOpportunityId ? "PATCH" : "POST",
      editingOpportunityId ? { id: editingOpportunityId, ...payload } : payload,
    );

    if (!response.ok) {
      setStatus(response.message);
      return;
    }

    setOpportunityForm(emptyOpportunity);
    setEditingOpportunityId(null);
    setStatus("Manual opportunity saved.");
    await Promise.all([loadOpportunities(), loadStats()]);
  }

  async function saveTeamMember() {
    const payload = {
      ...teamForm,
      expertise: splitList(teamForm.expertise),
      methods: splitList(teamForm.methods),
      geographies: splitList(teamForm.geographies),
    };
    const response = await writeJson(
      "/api/admin/team",
      editingTeamId ? "PATCH" : "POST",
      editingTeamId ? { id: editingTeamId, ...payload } : payload,
    );

    if (!response.ok) {
      setStatus(response.message);
      return;
    }

    setTeamForm(emptyTeam);
    setEditingTeamId(null);
    setStatus("Team member saved.");
    await Promise.all([loadTeam(), loadStats()]);
  }

  async function saveProposal() {
    const payload = {
      ...proposalForm,
      keywords: splitList(proposalForm.keywords),
      methods: splitList(proposalForm.methods),
    };
    const response = await writeJson(
      "/api/admin/proposals",
      editingProposalId ? "PATCH" : "POST",
      editingProposalId ? { id: editingProposalId, ...payload } : payload,
    );

    if (!response.ok) {
      setStatus(response.message);
      return;
    }

    setProposalForm(emptyProposal);
    setEditingProposalId(null);
    setStatus("Proposal saved. Proposal text is stored in the configured database.");
    await Promise.all([loadProposals(), loadStats()]);
  }

  async function refreshSources() {
    setStatus("Refreshing configured sources...");
    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: adminKey ? { "x-admin-key": adminKey } : {},
    });
    const payload = (await response.json()) as {
      error?: string;
      dataMode?: string;
      sourceStatuses?: Array<{ count: number }>;
    };

    if (!response.ok) {
      setStatus(payload.error ?? "Source refresh failed.");
      return;
    }

    const count =
      payload.sourceStatuses?.reduce((total, item) => total + item.count, 0) ?? 0;
    setStatus(`Source refresh completed in ${payload.dataMode ?? "unknown"} mode; ${count} records reported.`);
    await loadStats();
  }

  async function writeJson(url: string, method: "POST" | "PATCH", body: unknown) {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(adminKey ? { "x-admin-key": adminKey } : {}),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      error?: string;
      issues?: Array<{ field: string; message: string }>;
    };

    return {
      ok: response.ok,
      message:
        payload.issues?.[0]
          ? `${payload.issues[0].field}: ${payload.issues[0].message}`
          : payload.error ?? "Saved.",
    };
  }

  return (
    <section className="admin-console">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Management</p>
            <h2>Research matching console</h2>
          </div>
          <span className="source-chip cached">{adminKey ? "Key entered" : "No key entered"}</span>
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
              placeholder="Required for writes when configured"
            />
          </label>
          <div className="admin-tabs">
            {(["opportunities", "team", "proposals", "sources", "health"] as const).map((tab) => (
              <button
                className={activeTab === tab ? "tab-button active" : "tab-button"}
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="run-status">{status}</div>
        </div>
      </section>

      {activeTab === "health" ? (
        <AdminHealth stats={stats} />
      ) : activeTab === "sources" ? (
        <SourceRefresh onRefresh={refreshSources} />
      ) : activeTab === "opportunities" ? (
        <OpportunitySection
          form={opportunityForm}
          items={opportunities}
          editingId={editingOpportunityId}
          onFormChange={setOpportunityForm}
          onSave={saveOpportunity}
          onEdit={(item) => {
            setEditingOpportunityId(item.id);
            setOpportunityForm({
              title: item.title,
              funder: item.funder,
              callUrl: item.callUrl || "",
              applicationUrl: item.applicationUrl || "",
              funderType: item.funderType || "needs verification",
              deadline: item.deadline,
              amount: item.amount,
              regionEligibility: item.regionEligibility,
              careerStageEligibility: item.careerStageEligibility,
              topics: item.topics.join(", "),
              description: item.description,
            });
          }}
          onClear={() => {
            setOpportunityForm(emptyOpportunity);
            setEditingOpportunityId(null);
          }}
        />
      ) : activeTab === "team" ? (
        <TeamSection
          form={teamForm}
          items={team}
          editingId={editingTeamId}
          onFormChange={setTeamForm}
          onSave={saveTeamMember}
          onEdit={(item) => {
            setEditingTeamId(item.id);
            setTeamForm({
              name: item.name,
              role: item.role,
              email: "",
              scholarUrl: item.scholarUrl ?? "",
              affiliation: item.affiliation ?? "",
              expertise: item.expertise.join(", "),
              methods: item.methods.join(", "),
              geographies: item.geographies.join(", "),
              careerStage: item.careerStage,
              leadershipStrength: item.leadershipStrength,
              publicationHighlights: item.publicationHighlights,
              implementationExperience: item.implementationExperience,
              availability: item.availability,
            });
          }}
          onClear={() => {
            setTeamForm(emptyTeam);
            setEditingTeamId(null);
          }}
        />
      ) : (
        <ProposalSection
          form={proposalForm}
          items={proposals}
          editingId={editingProposalId}
          onFormChange={setProposalForm}
          onSave={saveProposal}
          onEdit={(item) => {
            setEditingProposalId(item.id);
            setProposalForm({
              title: item.title,
              projectArea: item.projectArea,
              abstract: item.abstract,
              fullText: item.fullText,
              funderTarget: item.funderTarget ?? "",
              previousCall: item.previousCall ?? "",
              status: item.status,
              year: item.year,
              piTeam: item.piTeam ?? "",
              keywords: item.keywords.join(", "),
              methods: item.methods.join(", "),
              geography: item.geography,
              budgetRange: item.budgetRange,
              fileName: "",
            });
          }}
          onClear={() => {
            setProposalForm(emptyProposal);
            setEditingProposalId(null);
          }}
        />
      )}
    </section>
  );
}

function OpportunitySection(props: {
  form: typeof emptyOpportunity;
  items: ManualOpportunityRow[];
  editingId: string | null;
  onFormChange: (form: typeof emptyOpportunity) => void;
  onSave: () => void;
  onEdit: (item: ManualOpportunityRow) => void;
  onClear: () => void;
}) {
  return (
    <section className="admin-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Opportunities</p>
            <h2>{props.editingId ? "Edit opportunity" : "Add opportunity"}</h2>
          </div>
        </div>
        <div className="admin-body">
          <TextField form={props.form} field="title" label="Title" onChange={props.onFormChange} />
          <div className="field-grid">
            <TextField form={props.form} field="funder" label="Funder" onChange={props.onFormChange} />
            <TextField form={props.form} field="funderType" label="Funder type" onChange={props.onFormChange} />
          </div>
          <TextField form={props.form} field="callUrl" label="Original call link" onChange={props.onFormChange} />
          <TextField form={props.form} field="applicationUrl" label="Application link (optional)" onChange={props.onFormChange} />
          <div className="field-grid">
            <TextField form={props.form} field="deadline" label="Deadline" onChange={props.onFormChange} />
            <TextField form={props.form} field="amount" label="Amount" onChange={props.onFormChange} />
          </div>
          <TextField form={props.form} field="regionEligibility" label="Region/country eligibility" onChange={props.onFormChange} />
          <TextField form={props.form} field="careerStageEligibility" label="Career-stage eligibility" onChange={props.onFormChange} />
          <TextField form={props.form} field="topics" label="Topics (comma-separated)" onChange={props.onFormChange} />
          <TextAreaField form={props.form} field="description" label="Description" onChange={props.onFormChange} />
          <FormActions onClear={props.onClear} onSave={props.onSave} />
        </div>
      </section>
      <ListPanel
        title={`${props.items.length} manual opportunities`}
        items={props.items.map((item) => ({
          id: item.id,
          title: item.title,
          meta: `${item.funder} / ${item.deadline}`,
          chip: item.callUrl ? "call link" : "missing link",
          onClick: () => props.onEdit(item),
        }))}
      />
    </section>
  );
}

function TeamSection(props: {
  form: typeof emptyTeam;
  items: TeamRow[];
  editingId: string | null;
  onFormChange: (form: typeof emptyTeam) => void;
  onSave: () => void;
  onEdit: (item: TeamRow) => void;
  onClear: () => void;
}) {
  return (
    <section className="admin-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Team Profiles</p>
            <h2>{props.editingId ? "Edit team member" : "Add team member"}</h2>
          </div>
        </div>
        <div className="admin-body">
          <div className="field-grid">
            <TextField form={props.form} field="name" label="Name" onChange={props.onFormChange} />
            <TextField form={props.form} field="role" label="Role" onChange={props.onFormChange} />
          </div>
          <TextField form={props.form} field="scholarUrl" label="Google Scholar profile link" onChange={props.onFormChange} />
          <TextField form={props.form} field="affiliation" label="Affiliation" onChange={props.onFormChange} />
          <TextField form={props.form} field="expertise" label="Expertise (comma-separated)" onChange={props.onFormChange} />
          <TextField form={props.form} field="methods" label="Methods (comma-separated)" onChange={props.onFormChange} />
          <TextField form={props.form} field="geographies" label="Geographies (comma-separated)" onChange={props.onFormChange} />
          <div className="field-grid">
            <TextField form={props.form} field="careerStage" label="Career stage" onChange={props.onFormChange} />
            <TextField form={props.form} field="availability" label="Availability" onChange={props.onFormChange} />
          </div>
          <TextAreaField form={props.form} field="leadershipStrength" label="Leadership/PI strength" onChange={props.onFormChange} />
          <TextAreaField form={props.form} field="publicationHighlights" label="Publication highlights (manual metadata)" onChange={props.onFormChange} />
          <TextAreaField form={props.form} field="implementationExperience" label="Implementation experience" onChange={props.onFormChange} />
          <p className="privacy-note">Scholar links are stored for reference only. The app does not scrape Scholar automatically.</p>
          <FormActions onClear={props.onClear} onSave={props.onSave} />
        </div>
      </section>
      <ListPanel
        title={`${props.items.length} team members`}
        items={props.items.map((item) => ({
          id: item.id,
          title: item.name,
          meta: `${item.role} / ${item.expertise.slice(0, 3).join(", ")}`,
          chip: item.scholarUrl ? "Scholar" : "manual",
          onClick: () => props.onEdit(item),
        }))}
      />
    </section>
  );
}

function ProposalSection(props: {
  form: typeof emptyProposal;
  items: ProposalRow[];
  editingId: string | null;
  onFormChange: (form: typeof emptyProposal) => void;
  onSave: () => void;
  onEdit: (item: ProposalRow) => void;
  onClear: () => void;
}) {
  return (
    <section className="admin-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Proposal Library</p>
            <h2>{props.editingId ? "Edit proposal" : "Add proposal"}</h2>
          </div>
        </div>
        <div className="admin-body">
          <p className="privacy-note">Proposal text is private IP and is stored only in the configured database. Do not paste content you are not allowed to store.</p>
          <div className="field-grid">
            <TextField form={props.form} field="title" label="Title" onChange={props.onFormChange} />
            <TextField form={props.form} field="projectArea" label="Project area" onChange={props.onFormChange} />
          </div>
          <div className="field-grid">
            <TextField form={props.form} field="status" label="Status" onChange={props.onFormChange} />
            <NumberField form={props.form} field="year" label="Year" onChange={props.onFormChange} />
          </div>
          <TextField form={props.form} field="keywords" label="Keywords (comma-separated)" onChange={props.onFormChange} />
          <TextField form={props.form} field="methods" label="Methods (comma-separated)" onChange={props.onFormChange} />
          <div className="field-grid">
            <TextField form={props.form} field="geography" label="Geography" onChange={props.onFormChange} />
            <TextField form={props.form} field="budgetRange" label="Budget range" onChange={props.onFormChange} />
          </div>
          <TextField form={props.form} field="funderTarget" label="Target funder (optional)" onChange={props.onFormChange} />
          <TextField form={props.form} field="previousCall" label="Previous call (optional)" onChange={props.onFormChange} />
          <TextField form={props.form} field="piTeam" label="PI/team (optional)" onChange={props.onFormChange} />
          <TextAreaField form={props.form} field="abstract" label="Abstract/summary" onChange={props.onFormChange} />
          <TextAreaField form={props.form} field="fullText" label="Paste proposal text" onChange={props.onFormChange} />
          <FormActions onClear={props.onClear} onSave={props.onSave} />
        </div>
      </section>
      <ListPanel
        title={`${props.items.length} saved proposals`}
        items={props.items.map((item) => ({
          id: item.id,
          title: item.title,
          meta: `${item.status} / ${item.projectArea} / ${item.year}`,
          chip: item.geography,
          onClick: () => props.onEdit(item),
        }))}
      />
    </section>
  );
}

function SourceRefresh(props: { onRefresh: () => void }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Source Refresh</p>
          <h2>Refresh configured sources</h2>
        </div>
      </div>
      <div className="admin-body">
        <p className="empty-state">Configured sources can include Grants.gov, public JSON feeds, RSS/Atom feeds, and manual opportunities. Failed live sources fall back to cached records where available.</p>
        <button className="primary-button" type="button" onClick={props.onRefresh}>
          Refresh sources
        </button>
      </div>
    </section>
  );
}

function AdminHealth({ stats }: { stats: AdminStats | null }) {
  const cards = [
    ["Manual opportunities", stats?.manualOpportunities ?? 0],
    ["Team members", stats?.teamMembers ?? 0],
    ["Saved proposals", stats?.proposals ?? 0],
    ["Radar runs", stats?.radarRuns ?? 0],
    ["Missing call links", stats?.missingCallLinks ?? 0],
    ["Latest source refresh", stats?.latestSourceRefresh ?? "none"],
  ];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Data Health</p>
          <h2>Database summary</h2>
        </div>
      </div>
      <div className="health-grid">
        {cards.map(([label, value]) => (
          <div className="health-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListPanel(props: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    chip: string;
    onClick: () => void;
  }>;
}) {
  return (
    <section className="panel admin-list-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Saved records</p>
          <h2>{props.title}</h2>
        </div>
      </div>
      <div className="history-list admin-list">
        {props.items.length === 0 ? <p className="empty-state">No records yet.</p> : null}
        {props.items.map((item) => (
          <button className="history-row" type="button" key={item.id} onClick={item.onClick}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </span>
            <span className="mode-dot cached">{item.chip}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TextField<T extends Record<string, string | number>>(props: {
  form: T;
  field: keyof T;
  label: string;
  onChange: (form: T) => void;
}) {
  return (
    <label className="field" htmlFor={String(props.field)}>
      <span>{props.label}</span>
      <input
        id={String(props.field)}
        value={String(props.form[props.field] ?? "")}
        onChange={(event) =>
          props.onChange({ ...props.form, [props.field]: event.target.value })
        }
      />
    </label>
  );
}

function NumberField<T extends Record<string, string | number>>(props: {
  form: T;
  field: keyof T;
  label: string;
  onChange: (form: T) => void;
}) {
  return (
    <label className="field" htmlFor={String(props.field)}>
      <span>{props.label}</span>
      <input
        id={String(props.field)}
        type="number"
        value={Number(props.form[props.field] ?? 0)}
        onChange={(event) =>
          props.onChange({ ...props.form, [props.field]: Number(event.target.value) })
        }
      />
    </label>
  );
}

function TextAreaField<T extends Record<string, string | number>>(props: {
  form: T;
  field: keyof T;
  label: string;
  onChange: (form: T) => void;
}) {
  return (
    <label className="field" htmlFor={String(props.field)}>
      <span>{props.label}</span>
      <textarea
        id={String(props.field)}
        value={String(props.form[props.field] ?? "")}
        onChange={(event) =>
          props.onChange({ ...props.form, [props.field]: event.target.value })
        }
      />
    </label>
  );
}

function FormActions(props: { onClear: () => void; onSave: () => void }) {
  return (
    <div className="actions">
      <button className="ghost-button" type="button" onClick={props.onClear}>
        Clear
      </button>
      <button className="primary-button" type="button" onClick={props.onSave}>
        Save
      </button>
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
