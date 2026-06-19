export function formatSandboxPlatform(context: unknown): string {
  const platform = (context as { platform?: unknown } | undefined)?.platform;
  if (typeof platform !== 'string' || platform.length === 0 || platform === 'unsupported') {
    return 'this platform';
  }
  return platform;
}

type SandboxMissingDependency = { name?: unknown; installHint?: unknown };

export function parseSandboxMissingDependencies(context: unknown): SandboxMissingDependency[] {
  const list = (context as { missingDependencies?: unknown } | undefined)?.missingDependencies;
  if (!Array.isArray(list)) return [];
  return list.filter((entry): entry is SandboxMissingDependency => {
    const name = (entry as SandboxMissingDependency | undefined)?.name;
    return typeof name === 'string';
  });
}

export function formatSandboxMissingDependencies(context: unknown): string {
  const deps = parseSandboxMissingDependencies(context);
  if (deps.length === 0) return 'unknown';
  return deps
    .map(entry => {
      const hint = typeof entry.installHint === 'string' ? ` (${entry.installHint})` : '';
      return `${entry.name}${hint}`;
    })
    .join(', ');
}

export function sandboxMissingDependencyKey(context: unknown): string {
  return parseSandboxMissingDependencies(context)
    .map(d => (typeof d.name === 'string' ? d.name : ''))
    .filter(Boolean)
    .sort()
    .join(',');
}
