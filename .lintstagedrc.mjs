const workspaceByPrefix = [
  { prefix: "apps/web/", workspace: "web" },
  { prefix: "apps/docs/", workspace: "docs" },
  { prefix: "packages/ui/", workspace: "@repo/ui" },
];

const quote = (value) => `"${value.replace(/"/g, '\\"')}"`;

const buildLintCommands = (files) => {
  const filesByWorkspace = new Map();

  for (const file of files) {
    const normalizedFile = file.replace(/\\/g, "/");
    const workspaceMatch = workspaceByPrefix.find(({ prefix }) =>
      normalizedFile.startsWith(prefix),
    );

    if (!workspaceMatch) {
      continue;
    }

    const relativeFile = normalizedFile.slice(workspaceMatch.prefix.length);
    const workspaceFiles = filesByWorkspace.get(workspaceMatch.workspace) ?? [];
    workspaceFiles.push(relativeFile);
    filesByWorkspace.set(workspaceMatch.workspace, workspaceFiles);
  }

  return Array.from(filesByWorkspace.entries()).map(([workspace, workspaceFiles]) =>
    `npm run lint --workspace ${quote(workspace)} -- ${workspaceFiles
      .map(quote)
      .join(" ")}`,
  );
};

export default {
  "**/*.{js,jsx,ts,tsx,mjs,cjs}": buildLintCommands,
};
