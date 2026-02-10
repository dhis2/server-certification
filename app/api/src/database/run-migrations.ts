import 'reflect-metadata';
import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  console.log('Initializing data source...');
  await dataSource.initialize();

  try {
    console.log('Running pending migrations...');
    const migrations = await dataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('No pending migrations');
    } else {
      console.log(`Executed ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(`  - ${m.name}`));
    }
  } finally {
    await dataSource.destroy();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
