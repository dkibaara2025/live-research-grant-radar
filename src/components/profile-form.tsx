import type { FormEvent } from "react";
import type { ResearchProfile } from "@/lib/agent/types";

type ProfileFormProps = {
  profile: ResearchProfile;
  readiness: number;
  runCount: number;
  isLoading: boolean;
  error: string | null;
  lastRun: string | null;
  onChange: (profile: ResearchProfile) => void;
  onSubmit: () => void;
};

const careerStages = [
  "Graduate researcher",
  "Postdoctoral researcher",
  "Early-career PI",
  "Mid-career PI",
  "Consortium lead",
];

export function ProfileForm({
  profile,
  readiness,
  runCount,
  isLoading,
  error,
  lastRun,
  onChange,
  onSubmit,
}: ProfileFormProps) {
  function updateField(field: keyof ResearchProfile, value: string) {
    onChange({ ...profile, [field]: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <section className="panel profile-panel" aria-label="Research profile">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Research profile</p>
          <h2>Grant fit intake</h2>
        </div>
        <div className="readiness-meter" aria-label={`Profile readiness ${readiness}%`}>
          <span>{readiness}%</span>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${readiness}%` }} />
          </div>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field" htmlFor="field">
            <span>Research field</span>
            <input
              id="field"
              name="field"
              value={profile.field}
              onChange={(event) => updateField("field", event.target.value)}
              placeholder="Climate health"
            />
          </label>

          <label className="field" htmlFor="region">
            <span>Region</span>
            <input
              id="region"
              name="region"
              value={profile.region}
              onChange={(event) => updateField("region", event.target.value)}
              placeholder="Kenya"
            />
          </label>

          <label className="field" htmlFor="career-stage">
            <span>Career stage</span>
            <select
              id="career-stage"
              name="career-stage"
              value={profile.careerStage}
              onChange={(event) => updateField("careerStage", event.target.value)}
            >
              {careerStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="deadline-window">
            <span>Deadline window</span>
            <input
              id="deadline-window"
              name="deadline-window"
              value={profile.deadlineWindow}
              onChange={(event) =>
                updateField("deadlineWindow", event.target.value)
              }
              placeholder="120 days"
            />
          </label>
        </div>

        <label className="field" htmlFor="keywords">
          <span>Keywords</span>
          <input
            id="keywords"
            name="keywords"
            value={profile.keywords}
            onChange={(event) => updateField("keywords", event.target.value)}
            placeholder="implementation science, adaptation"
          />
        </label>

        <label className="field" htmlFor="profile-summary">
          <span>Profile summary</span>
          <textarea
            id="profile-summary"
            name="profile-summary"
            value={profile.summary}
            onChange={(event) => updateField("summary", event.target.value)}
            placeholder="Describe the project, team, fundable outcome, and constraints."
          />
        </label>

        <div className="actions">
          <div className="run-status" aria-live="polite">
            {isLoading
              ? "Running agent..."
              : lastRun ?? (runCount > 0 ? `Radar pass ${runCount}` : "Ready")}
          </div>
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Running" : "Run radar"}
          </button>
        </div>
        {error ? (
          <div className="error-text" role="alert">
            {error}
          </div>
        ) : null}
      </form>
    </section>
  );
}
