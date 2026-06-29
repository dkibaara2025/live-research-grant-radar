import type { RankedOpportunity, ResearchProfile } from "@/lib/agent/types";

type ActionPlanPanelProps = {
  opportunity: RankedOpportunity;
  profile: ResearchProfile;
};

export function ActionPlanPanel({
  opportunity,
  profile,
}: ActionPlanPanelProps) {
  return (
    <aside className="panel action-panel" aria-label="Application action plan">
      <div className="panel-header">
        <div>
          <p className="eyebrow">One-page plan</p>
          <h2>{opportunity.shortName}</h2>
        </div>
        <div className="score-stack">
          <div className="score-badge">{opportunity.score}%</div>
          <span className="provider-chip">{opportunity.llmProvider}</span>
        </div>
      </div>

      <div className="plan-body">
        <section className="plan-block">
          <h3>Plan summary</h3>
          <p>{opportunity.planSummary}</p>
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
          </div>
        </section>
      </div>
    </aside>
  );
}
