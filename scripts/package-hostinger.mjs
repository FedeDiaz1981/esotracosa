import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(projectRoot, ".next");
const standaloneRoot = path.join(buildRoot, "standalone");
const packageRoot = path.join(projectRoot, "dist", "hostinger-deploy");

async function findStandaloneAppRoot(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.some((entry) => entry.isFile() && entry.name === "server.js")) return directory;

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules") continue;
    const found = await findStandaloneAppRoot(path.join(directory, entry.name));
    if (found) return found;
  }

  return "";
}

async function main() {
  await rm(packageRoot, { recursive: true, force: true });
  await mkdir(packageRoot, { recursive: true });

  const standaloneAppRoot = await findStandaloneAppRoot(standaloneRoot);
  if (!standaloneAppRoot) throw new Error("No se encontró server.js en el build standalone.");

  await cp(standaloneAppRoot, packageRoot, { recursive: true, dereference: true });

  await cp(path.join(buildRoot, "static"), path.join(packageRoot, ".next", "static"), {
    recursive: true,
    dereference: true,
  });
  await cp(path.join(projectRoot, "public"), path.join(packageRoot, "public"), {
    recursive: true,
    dereference: true,
  });

  const envInstructions = [
    "Hostinger deploy bundle for PintoFruta Store",
    "",
    "Before starting the app, set these environment variables in Hostinger:",
    "- DATABASE_URL",
    "- SUPABASE_URL",
    "- SUPABASE_ANON_KEY",
    "- SUPABASE_SERVICE_ROLE_KEY",
    "",
    "Start command:",
    "node server.js",
    "",
    "Port:",
    "Use the platform-provided PORT environment variable.",
  ].join("\n");

  await writeFile(path.join(packageRoot, "HOSTINGER_README.txt"), envInstructions, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
