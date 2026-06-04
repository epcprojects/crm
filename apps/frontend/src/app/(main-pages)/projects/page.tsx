import ProjectCard from '../../../components/projects/ProjectCard';

const projects = [
  {
    id: 'acme-corp',
    initials: 'AC',
    name: 'Acme Corp',
    category: 'Open',
    totalCount: 2,
    openCount: 1,
    criticalCount: 0,
  },
  {
    id: 'stellar-tech',
    initials: 'AC',
    name: 'Stellar Tech',
    category: 'Technology',
    totalCount: 2,
    openCount: 1,
    criticalCount: 0,
  },
  {
    id: 'greenleaf-co',
    initials: 'GC',
    name: 'GreenLeaf Co',
    category: 'Agriculture',
    totalCount: 2,
    openCount: 1,
    criticalCount: 0,
  },
];

export default function ProjectsPage() {
  return (
    <div className="max-h-dvh min-h-[calc(100dvh-97px)]">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            initials={project.initials}
            name={project.name}
            category={project.category}
            totalCount={project.totalCount}
            openCount={project.openCount}
            criticalCount={project.criticalCount}
          />
        ))}
      </div>
    </div>
  );
}
