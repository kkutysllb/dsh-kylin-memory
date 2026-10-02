import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const installLifecycles = ["preinstall", "install", "postinstall", "prepare"];

for (const lifecycle of installLifecycles) {
  if (manifest.scripts?.[lifecycle] && lifecycle !== "prepack") {
    throw new Error(`package must not execute ${lifecycle} on a user's machine`);
  }
}

for (const dependency of Object.keys(manifest.dependencies ?? {})) {
  const dependencyManifest = JSON.parse(
    readFileSync(new URL(`../node_modules/${dependency}/package.json`, import.meta.url), "utf8"),
  );
  for (const lifecycle of ["preinstall", "install", "postinstall"]) {
    if (dependencyManifest.scripts?.[lifecycle]) {
      throw new Error(`runtime dependency ${dependency} executes ${lifecycle} during install`);
    }
  }
}

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
});
const [report] = JSON.parse(output);
const packedFiles = new Set(report.files.map((entry) => entry.path));
for (const required of [
  "lib/index.js",
  "lib/types/index.d.ts",
  "cordis.patch.yml",
  "package.json",
  "README.md",
  "LICENSE",
]) {
  if (!packedFiles.has(required)) {
    throw new Error(`packed artifact is missing ${required}`);
  }
}

console.log(`[dsh-kylin-memory] verify:package OK (${report.files.length} files)`);
