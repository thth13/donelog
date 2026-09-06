export type ProjectOption = { _id: string; name: string };

export function isProjectOption(value: unknown): value is ProjectOption {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<ProjectOption>;
  return typeof project._id === "string" && /^[a-f0-9]{24}$/.test(project._id) &&
    typeof project.name === "string" && !!project.name.trim() && project.name.length <= 80;
}

export function mergeProjects(...lists: ProjectOption[][]): ProjectOption[] {
  return [...new Map(lists.flat().map(project => [project._id, project])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
}
