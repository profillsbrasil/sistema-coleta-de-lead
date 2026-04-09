import { createServer } from "node:net";
import { spawn } from "node:child_process";

const BASE_PORT = 3001;
const MAX_ATTEMPTS = 10;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

async function findAvailablePort(): Promise<number> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const port = BASE_PORT + i;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`⚠ Porta ${port} ocupada, tentando ${port + 1}...`);
  }
  throw new Error(
    `Nenhuma porta disponível entre ${BASE_PORT} e ${BASE_PORT + MAX_ATTEMPTS - 1}`
  );
}

const port = await findAvailablePort();
console.log(`✓ Iniciando Next.js na porta ${port}`);

const child = spawn("next", ["dev", "--port", String(port)], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
