import type { AgentWarning, DataMode, RankedOpportunity } from "@/lib/agent/types";

type RadarResultsProps = {
  opportunities: RankedOpportunity[];
  selectedId: string;
  warnings: AgentWarning[];
  isLoading: boolean;
  dataMode: DataMode;
  onSelect: (id: string) => void;
};

export function RadarResults({
  opportunities,
  selectedId,
  warnings,
  isLoading,
  dataMode,
  onSelect,
}: RadarResultsProps) {
  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === selectedId) ??
    opportunities[0];

  return (
    <section className="panel results-panel" aria-label="Ranked opportunities">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ranked matches</p>
          <h2>{opportunities.length} opportunities</h2>
        </div>
        <span className={`source-chip ${dataMode}`}>
          {isLoading ? "Running" : dataMode.toUpperCase()}
        </span>
      </div>

      <div className="result-list">
        {opportunities.map((opportunity) => {
          const isSelected = opportunity.id === selectedId;

          return (
            <button
              className={`result-row${isSelected ? " selected" : ""}`}
              key={opportunity.id}
              type="button"
              onClick={() => onSelect(opportunity.id)}
              aria-pressed={isSelected}
            >
              <span className="rank">#{opportunity.rank}</span>
              <span className="result-copy">
                <span className="result-title">{opportunity.title}</span>
                <span className="result-meta">
                  {opportunity.funder} / {opportunity.deadline} /{" "}
                  {opportunity.amount}
                </span>
                <span className="tag-row">
                  {opportunity.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
              <span className="fit-score" aria-label={`Fit score ${opportunity.score}%`}>
                {opportunity.score}
              </span>
            </button>
          );
        })}
      </div>

      {warnings.length > 0 ? (
        <div className="notice-list" aria-label="Radar warnings">
          {warnings.slice(0, 3).map((warning) => (
            <div className="notice" key={`${warning.code}-${warning.message}`}>
              <strong>{warning.code}</strong>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rationale-strip" aria-label="Selected match rationale">
        {selectedOpportunity.scoreBreakdown.slice(0, 4).map((factor) => (
          <div className={`rationale-item ${factor.signal}`} key={factor.key}>
            <strong>{factor.label}</strong>
            <span>{factor.explanation}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
