#!/usr/bin/env node
// Provisions a brand-new, fully isolated deployment of this app for one
// customer: a D1 database, a KV namespace, a Cloudflare Pages project, runs
// migrations, deploys the current build, sets a fresh session secret, and
// seeds the initial settings row with the customer's business config.
//
// Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment
// (wrangler picks these up automatically for non-interactive auth).
//
// Usage (env vars):
//   CUSTOMER_SLUG=acme BUSINESS_NAME="Acme Corp" CURRENCY=GHC TRIAL_DAYS=14 \
//     node scripts/provision-customer.mjs

import { execFileSync } from 'node:child_process';
import { writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const slug = (process.env.CUSTOMER_SLUG || '').trim().toLowerCase();
const businessName = process.env.BUSINESS_NAME || 'My Business';
const currency = process.env.CURRENCY || 'GHC';
const trialDays = Number(process.env.TRIAL_DAYS || '14');
const productionBranch = process.env.PRODUCTION_BRANCH || 'main';

if (!/^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/.test(slug)) {
  console.error(`Invalid CUSTOMER_SLUG "${slug}" — must be lowercase letters, digits, and hyphens, 2-50 chars, not starting/ending with a hyphen.`);
  process.exit(1);
}
if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in the environment.');
  process.exit(1);
}

const dbName = `${slug}-db`;
const kvName = `${slug}_kv`;
const projectName = slug;

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], ...opts });
}

function runQuiet(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], ...opts });
}

console.log(`Provisioning "${projectName}" for "${businessName}"...`);

// 1. Create D1 database
const d1Out = run('npx', ['wrangler', 'd1', 'create', dbName]);
const dbIdMatch = d1Out.match(/database_id\s*=\s*"([0-9a-f-]+)"/i);
if (!dbIdMatch) {
  console.error('Could not parse database_id from wrangler output:\n' + d1Out);
  process.exit(1);
}
const databaseId = dbIdMatch[1];
console.log(`D1 database created: ${dbName} (${databaseId})`);

// 2. Create KV namespace
const kvOut = run('npx', ['wrangler', 'kv', 'namespace', 'create', kvName]);
const kvIdMatch = kvOut.match(/id\s*=\s*"([0-9a-f]+)"/i);
if (!kvIdMatch) {
  console.error('Could not parse KV namespace id from wrangler output:\n' + kvOut);
  process.exit(1);
}
const kvId = kvIdMatch[1];
console.log(`KV namespace created: ${kvName} (${kvId})`);

// 3. Create Pages project
run('npx', ['wrangler', 'pages', 'project', 'create', projectName, '--production-branch', productionBranch]);

// 4. Write a scoped wrangler.toml for this customer (CI workspace is
// ephemeral, so overwriting it here is safe — nothing to restore).
const wranglerToml = `name = "${projectName}"
compatibility_date = "2025-07-15"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${databaseId}"
migrations_dir = "server/database/migrations"

[[kv_namespaces]]
binding = "KV"
id = "${kvId}"
`;
const tomlPath = 'wrangler.toml';
const hadExistingToml = existsSync(tomlPath);
const backupPath = 'wrangler.toml.provision-backup';
if (hadExistingToml) copyFileSync(tomlPath, backupPath);
writeFileSync(tomlPath, wranglerToml);

try {
  // 5. Apply migrations
  run('npx', ['wrangler', 'd1', 'migrations', 'apply', dbName, '--remote']);

  // 6. Build
  run('npx', ['nuxi', 'build', '--preset=cloudflare-pages']);

  // 7. Deploy
  run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', projectName, '--branch', productionBranch, '--commit-dirty=true']);

  // 8. Fresh session secret
  const sessionPassword = randomBytes(32).toString('hex');
  execFileSync('npx', ['wrangler', 'pages', 'secret', 'put', 'NUXT_SESSION_PASSWORD', '--project-name', projectName], {
    input: sessionPassword,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // 9. Seed the settings row with this customer's business config. Uses
  // ON CONFLICT since the app's own /api/settings GET also lazily creates a
  // default row — whichever runs first, this ends up with the right values.
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  const trialEndStr = trialEnd.toISOString().split('T')[0];
  const escapedName = businessName.replace(/'/g, "''");
  const sql = `
    INSERT INTO settings (id, business_name, currency, default_margin, low_stock_alert, out_of_stock_alert, email_daily_report, subscription_tier, trial_ends_at)
    VALUES (1, '${escapedName}', '${currency}', 30, 1, 1, 0, 'demo', '${trialEndStr}')
    ON CONFLICT(id) DO UPDATE SET business_name = excluded.business_name, currency = excluded.currency;
  `.trim();
  run('npx', ['wrangler', 'd1', 'execute', dbName, '--remote', '--command', sql]);

  console.log(`\nDone. "${projectName}" is live at https://${projectName}.pages.dev`);
  console.log(JSON.stringify({ projectName, databaseId, kvId, url: `https://${projectName}.pages.dev` }));
} finally {
  if (hadExistingToml) {
    copyFileSync(backupPath, tomlPath);
    unlinkSync(backupPath);
  }
}
