type ProjectCardProps = {
  id?: string;
  initials: string;
  name: string;
  category: string;
  totalCount: number;
  openCount: number;
  criticalCount: number;
  colorHex?: string;
  onClick?: () => void;
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
    <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 md:gap-2 rounded-full bg-white py-0.75 md:py-1 pe-0.75 md:pe-1 ps-3 text-xs md:text-sm text-gray-600 shadow-sm">
      <span className="truncate font-medium">{label}</span>
      <span
        className={`flex md:h-5.5 h-4.5 min-w-4.5 md:min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-black ${tone}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ProjectCard({
  id,
  initials,
  name,
  category,
  totalCount,
  openCount,
  criticalCount,
  colorHex = '#A855F7',
  onClick,
}: ProjectCardProps) {
  return (
    <article
      className="cursor-pointer rounded-xl md:rounded-2xl border p-2.5 md:p-4 shadow-xs transition hover:drop-shadow"
      onClick={onClick}
      style={{
        borderColor: `${colorHex}33`,
        backgroundColor: `${colorHex}12`,
      }}
      data-project-id={id}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <span
          className="flex md:h-10.5 w-9 h-9 md:w-10.5 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold drop-shadow md:text-base"
          style={{ color: colorHex }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm md:text-base font-medium text-gray-900">
            {name}
          </h2>
          <p className="truncate text-[10px] md:text-xs font-normal text-gray-600">
            {category}
          </p>
        </div>
      </div>

      <div
        className="my-3 md:my-4 h-px"
        style={{ backgroundColor: `${colorHex}33` }}
      />

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
