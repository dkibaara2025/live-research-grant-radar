import type { DataMode, RankedOpportunity, ResearchProfile } from "@/lib/agent/types";
import { buildPlanExportTitle } from "@/lib/export/plan";

type ActionPlanPanelProps = {
  opportunity: RankedOpportunity;
  profile: ResearchProfile;
  dataMode: DataMode;
  generatedAt: string;
};

export function ActionPlanPanel({
  opportunity,
  profile,
  dataMode,
  generatedAt,
}: ActionPlanPanelProps) {
  function exportPdf() {
    const originalTitle = document.title;

    document.title = buildPlanExportTitle(profile, opportunity, generatedAt);
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  return (
    <aside className="panel action-panel" aria-label="Application action plan">
      <div className="print-title">
        <h1>Live Research Grant Radar</h1>
        <p>One-page application action plan</p>
      </div>
      <div className="panel-header">
        <div>
          <p className="eyebrow">One-page plan</p>
          <h2>{opportunity.shortName}</h2>
        </div>
        <div className="panel-actions">
          <button className="ghost-button print-button" type="button" onClick={exportPdf}>
            Export PDF
          </button>
          <div className="score-stack">
            <div className="score-badge">{opportunity.score}%</div>
            <span className="provider-chip">{opportunity.llmProvider}</span>
          </div>
        </div>
      </div>

      <div className="plan-body">
        <section className="plan-block">
          <h3>Plan summary</h3>
          <p>{opportunity.planSummary}</p>
        </section>

        <section className="plan-block">
          <h3>Why this match</h3>
          <p>{opportunity.topMatchReason}</p>
        </section>

        <section className="plan-block">
          <h3>Positioning</h3>
          <p>
            Frame {profile.field || "the project"} around{" "}
            {profile.keywords || opportunity.focus}. Lead with{" "}
            {profile.region || opportunity.region} relevance and show a narrow,
            fundable outcome.
          </p>
        </section>

        <section className="plan-block">
          <h3>Score breakdown</h3>
          <div className="score-breakdown">
            {opportunity.scoreBreakdown.map((factor) => (
              <div className="score-factor" key={factor.key}>
                <span>
                  <strong>{factor.label}</strong>
                  <small>{factor.explanation}</small>
                </span>
                <b>
                  {factor.score}/{factor.max}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className="plan-block">
          <h3>Eligibility read</h3>
          <p>{opportunity.eligibilityNotes}</p>
        </section>

        <section className="plan-block">
          <h3>Application moves</h3>
          <ol className="plan-list">
            {opportunity.actionPlan.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="plan-block compact">
          <h3>Package</h3>
          <div className="package-grid">
            <span>Concept note</span>
            <strong>2 pages</strong>
            <span>Budget</span>
            <strong>{opportunity.amount}</strong>
            <span>Deadline</span>
            <strong>{opportunity.deadline}</strong>
            <span>Data mode</span>
            <strong>{dataMode}</strong>
            <span>Generated</span>
            <strong>{new Date(generatedAt).toLocaleDateString()}</strong>
          </div>
        </section>

        <section className="plan-block">
          <h3>Needs verification</h3>
          <ol className="plan-list">
            {opportunity.needsVerification.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}
