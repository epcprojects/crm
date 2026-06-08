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
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-white py-1 pe-1 ps-3 text-sm text-gray-600 shadow-sm">
      <span className="truncate font-medium">{label}</span>
      <span
        className={`flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-black ${tone}`}
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
    <article className="rounded-2xl border border-purple-200 hover:drop-shadow cursor-pointer bg-purple-50 p-4 shadow-xs">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="flex h-10.5 w-10.5 shrink-0 items-center drop-shadow justify-center rounded-full bg-white text-sm md:text-base font-semibold text-purple-500">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-gray-900">
            {name}
          </h2>
          <p className="truncate text-xs font-normal text-gray-600">
            {category}
          </p>
        </div>
      </div>

      <div className="my-4 h-px bg-purple-200" />

      <div className="grid grid-cols-3 gap-2">
        <ProjectMetric label="Total" value={totalCount} tone="bg-cyan-100" />
        <ProjectMetric label="Open" value={openCount} tone="bg-warning-200" />
        <ProjectMetric
          label="Critical"
          value={criticalCount}
          tone="bg-purple-100"
        />
      </div>
    </article>
  );
}
