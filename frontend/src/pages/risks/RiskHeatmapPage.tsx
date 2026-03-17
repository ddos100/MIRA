import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useRiskHeatmap } from "@/api/risks";
import { cn } from "@/utils/cn";

// ─── Cell colour logic ────────────────────────────────────────────────────────

function cellColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 15) return "bg-red-500 hover:bg-red-600 text-white";
  if (score >= 10) return "bg-orange-400 hover:bg-orange-500 text-white";
  if (score >= 5) return "bg-yellow-300 hover:bg-yellow-400 text-gray-900";
  return "bg-green-400 hover:bg-green-500 text-white";
}

function scoreBand(score: number): string {
  if (score >= 15) return "Critical (15–25)";
  if (score >= 10) return "High (10–14)";
  if (score >= 5) return "Medium (5–9)";
  return "Low (1–4)";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RiskHeatmapPage() {
  const navigate = useNavigate();
  const { data: heatmapData, isLoading, isError } = useRiskHeatmap();

  // Build lookup: "likelihood-impact" → count
  const countMap: Record<string, number> = {};
  if (heatmapData) {
    for (const item of heatmapData) {
      countMap[`${item.likelihood}-${item.impact}`] = item.count;
    }
  }

  function handleCellClick(likelihood: number, impact: number) {
    const params = new URLSearchParams({
      inherent_likelihood: String(likelihood),
      inherent_impact: String(impact),
    });
    navigate(`/risks?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Heat Map"
        description="Visual representation of risks by likelihood and impact."
      />

      {isLoading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load heatmap data.</p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-[500px]">
            {/* Legend */}
            <div className="mb-6 flex flex-wrap gap-3 text-xs">
              {[
                { label: "Low (1–4)", cls: "bg-green-400" },
                { label: "Medium (5–9)", cls: "bg-yellow-300" },
                { label: "High (10–14)", cls: "bg-orange-400" },
                { label: "Critical (15–25)", cls: "bg-red-500" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded-sm", cls)} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Grid container with axis labels */}
            <div className="flex gap-2">
              {/* Y-axis label (rotated) */}
              <div className="flex items-center justify-center">
                <span
                  className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Likelihood →
                </span>
              </div>

              <div>
                {/* 5×5 grid — rows: likelihood 5→1 (top to bottom), cols: impact 1→5 */}
                <div className="grid"
                  style={{ gridTemplateColumns: "repeat(5, minmax(80px, 1fr))", gap: "4px" }}
                >
                  {[5, 4, 3, 2, 1].map((likelihood) =>
                    [1, 2, 3, 4, 5].map((impact) => {
                      const count = countMap[`${likelihood}-${impact}`] ?? 0;
                      const score = likelihood * impact;
                      return (
                        <button
                          key={`${likelihood}-${impact}`}
                          onClick={() => handleCellClick(likelihood, impact)}
                          title={`L${likelihood} × I${impact} = ${score} (${scoreBand(score)})\n${count} risk${count !== 1 ? "s" : ""}`}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-md",
                            "h-16 w-full cursor-pointer transition-colors",
                            "border border-white/20 select-none",
                            cellColor(likelihood, impact)
                          )}
                        >
                          <span className="text-lg font-bold leading-none">
                            {count > 0 ? count : ""}
                          </span>
                          <span className="text-[10px] opacity-75 mt-0.5">
                            {score}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* X-axis labels (impact 1–5) */}
                <div
                  className="mt-1 grid"
                  style={{ gridTemplateColumns: "repeat(5, minmax(80px, 1fr))", gap: "4px" }}
                >
                  {[1, 2, 3, 4, 5].map((impact) => (
                    <div
                      key={impact}
                      className="flex items-center justify-center text-xs text-muted-foreground py-1"
                    >
                      {impact}
                    </div>
                  ))}
                </div>

                {/* X-axis title */}
                <div className="text-center text-xs font-medium text-muted-foreground mt-1">
                  Impact →
                </div>
              </div>

              {/* Y-axis scale numbers (5→1) */}
              <div className="flex flex-col justify-around pl-1">
                {[5, 4, 3, 2, 1].map((l) => (
                  <span
                    key={l}
                    className="flex h-16 items-center text-xs text-muted-foreground"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Summary counts */}
            {heatmapData && heatmapData.length > 0 && (
              <div className="mt-6 rounded-md border border-border p-4">
                <p className="text-sm font-medium text-foreground mb-3">
                  Total risks: {heatmapData.reduce((acc, d) => acc + d.count, 0)}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Critical", filter: (l: number, i: number) => l * i >= 15, cls: "text-red-600" },
                    { label: "High", filter: (l: number, i: number) => l * i >= 10 && l * i < 15, cls: "text-orange-600" },
                    { label: "Medium", filter: (l: number, i: number) => l * i >= 5 && l * i < 10, cls: "text-yellow-600" },
                    { label: "Low", filter: (l: number, i: number) => l * i < 5, cls: "text-green-600" },
                  ].map(({ label, filter, cls }) => {
                    const total = heatmapData
                      .filter((d) => filter(d.likelihood, d.impact))
                      .reduce((acc, d) => acc + d.count, 0);
                    return (
                      <div key={label} className="text-center">
                        <p className={cn("text-xl font-bold", cls)}>{total}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
