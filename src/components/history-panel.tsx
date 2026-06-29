import type { DataMode, RankedOpportunity, ResearchProfile } from "@/lib/agent/types";

export type HistoryRun = {
  id: string;
  profile: ResearchProfile;
  rankedMatches: RankedOpportunity[];
  selectedMatch: RankedOpportunity | null;
  dataMode: DataMode;
  durationMs: number;
  createdAt: string;
};

type HistoryPanelProps = {
  items: HistoryRun[];
  query: string;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onOpen: (run: HistoryRun) => void;
};

export function HistoryPanel({
  items,
  query,
  isLoading,
  onQueryChange,
  onRefresh,
  onOpen,
}: HistoryPanelProps) {
  return (
    <section className="panel history-panel" aria-label="Search history">
      <div className="panel-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Previous radar runs</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <div className="history-body">
        <label className="field compact-field" htmlFor="history-search">
          <span>Search saved runs</span>
          <input
            id="history-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="field, region, funder, title, date"
          />
        </label>

        <div className="history-list">
          {isLoading ? <p className="empty-state">Loading history...</p> : null}
          {!isLoading && items.length === 0 ? (
            <p className="empty-state">No saved runs yet.</p>
          ) : null}
          {items.map((item) => (
            <button
              className="history-row"
              type="button"
              key={item.id}
              onClick={() => onOpen(item)}
            >
              <span>
                <strong>{item.profile.field}</strong>
                <small>
                  {item.profile.region} / {new Date(item.createdAt).toLocaleDateString()}
                </small>
              </span>
              <span className={`mode-dot ${item.dataMode}`}>{item.dataMode}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
