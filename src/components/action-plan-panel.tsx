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
  const teamRecommendation = opportunity.teamRecommendation ?? {
    coInvestigators: [],
    missingExpertise: ["Add team profiles in Admin to calculate team fit."],
    teamStrengthScore: 0,
    reasons: [],
    risks: [],
    writingPlan: [],
    letterSupportPlan: [],
    dataAvailable: false,
  };
  const proposalRecommendation = opportunity.proposalRecommendation ?? {
    fitScore: 0,
    whyFits: [],
    adaptationChecklist: [],
    reusableSections: [],
    rewriteSections: [],
    newEvidenceNeeded: [],
    suggestedPackage: [],
    dataAvailable: false,
  };
  const nextSevenDayPlan =
    opportunity.nextSevenDayPlan?.length > 0
      ? opportunity.nextSevenDayPlan
      : opportunity.actionPlan;

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
          <h3>Source and links</h3>
          <div className="source-details">
            <span>Source</span>
            <strong>
              {opportunity.sourceName} ({opportunity.sourceType})
            </strong>
            <span>Source URL</span>
            {opportunity.sourceUrl ? (
              <a
                className="plain-link"
                href={opportunity.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {opportunity.sourceUrl}
              </a>
            ) : (
              <strong>Needs verification</strong>
            )}
            <span>Original call</span>
            {opportunity.callUrl && opportunity.callUrl !== "missing" ? (
              <a
                className="plain-link"
                href={opportunity.callUrl}
                target="_blank"
                rel="noreferrer"
              >
                {opportunity.callUrl}
              </a>
            ) : (
              <strong>Call link missing - needs verification</strong>
            )}
            <span>Application</span>
            {opportunity.applicationUrl && opportunity.applicationUrl !== "missing" ? (
              <a
                className="plain-link"
                href={opportunity.applicationUrl}
                target="_blank"
                rel="noreferrer"
              >
                {opportunity.applicationUrl}
              </a>
            ) : (
              <strong>Use original call page or verify submission route.</strong>
            )}
          </div>
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

        <section className="plan-block">
          <h3>Recommended team</h3>
          {teamRecommendation.bestPi ? (
            <div className="recommendation-list">
              <p>
                Recommended PI:{" "}
                <strong>{teamRecommendation.bestPi.name}</strong>{" "}
                ({teamRecommendation.bestPi.fitScore}% fit)
              </p>
              <p>
                Co-investigators:{" "}
                {teamRecommendation.coInvestigators
                  .map((member) => member.name)
                  .join(", ") || "Add team profiles to calculate."}
              </p>
            </div>
          ) : (
            <p>Add team profiles in Admin to calculate PI and co-investigator fit.</p>
          )}
        </section>

        <section className="plan-block">
          <h3>Best proposal to adapt</h3>
          {proposalRecommendation.bestProposal ? (
            <div className="recommendation-list">
              <p>
                <strong>{proposalRecommendation.bestProposal.title}</strong>{" "}
                ({proposalRecommendation.fitScore}% fit)
              </p>
              <ol className="plan-list">
                {proposalRecommendation.adaptationChecklist.map((item) => (
                  <li key={`${item.action}-${item.item}`}>
                    <strong>{item.action}:</strong> {item.item}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p>Save previous proposals in Admin to calculate adaptation recommendations.</p>
          )}
        </section>

        <section className="plan-block">
          <h3>Next 7-day action plan</h3>
          <ol className="plan-list">
            {nextSevenDayPlan.map((item) => (
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
            {(opportunity.needsVerification ?? [
              "Eligibility, deadline, and call link need verification.",
            ]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}
