type ProjectCardProps = {
  initials: string;
  name: string;
  category: string;
  totalCount: number;
  openCount: number;
  criticalCount: number;
};

function ProjectMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm">
      <span className="truncate">{label}</span>
      <span
        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-black ${tone}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ProjectCard({
  initials,
  name,
  category,
  totalCount,
  openCount,
  criticalCount,
}: ProjectCardProps) {
  return (
    <article className="rounded-2xl border border-[#D8D1FF] bg-[#F4F1FF] p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-[#8B5CF6]">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#111827]">
            {name}
          </h2>
          <p className="truncate text-xs font-normal text-gray-500">
            {category}
          </p>
        </div>
      </div>

      <div className="my-4 h-px bg-[#D8D1FF]" />

      <div className="grid grid-cols-3 gap-2">
        <ProjectMetric label="Total" value={totalCount} tone="bg-cyan-100" />
        <ProjectMetric label="Open" value={openCount} tone="bg-yellow-200" />
        <ProjectMetric
          label="Critical"
          value={criticalCount}
          tone="bg-slate-100"
        />
      </div>
    </article>
  );
}
