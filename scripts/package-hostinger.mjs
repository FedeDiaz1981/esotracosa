import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(projectRoot, ".next");
const standaloneRoot = path.join(buildRoot, "standalone");
const packageRoot = path.join(projectRoot, "dist", "hostinger-deploy");

async function main() {
  await rm(packageRoot, { recursive: true, force: true });
  await mkdir(packageRoot, { recursive: true });

  await cp(standaloneRoot, packageRoot, { recursive: true, dereference: true });

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
