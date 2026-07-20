const { build } = require('esbuild');
const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');

async function buildLambda() {
  const outDir = join(__dirname, '../../dist/apps/harperhelp/lambda');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  await build({
    entryPoints: [
      join(__dirname, 'src/app/modules/notifications/queue/lambda/index.ts'),
    ],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: join(outDir, 'notifications.js'),
    sourcemap: true,
  });
}

buildLambda().catch((error) => {
  console.error(error);
  process.exit(1);
});
