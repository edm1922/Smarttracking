import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'audit_log_entries',
    'custom_oauth_providers',
    'flow_state',
    'identities',
    'instances',
    'mfa_amr_claims',
    'mfa_factors',
    'mfa_challenges',
    'one_time_tokens',
    'refresh_tokens',
    'saml_providers',
    'saml_relay_states',
    'schema_migrations',
    'sessions',
    'sso_domains',
    'sso_providers',
    'users'
  ];

  console.log('Changing owner of auth tables to postgres...');
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE auth."${table}" OWNER TO postgres;`);
      console.log(`Success: Changed owner of auth."${table}" to postgres`);
    } catch (e: any) {
      console.warn(`Could not change owner of auth."${table}": ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
