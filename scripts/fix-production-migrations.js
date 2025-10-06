#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function fixProductionMigrations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing production migration issues...');
    
    // Check if the failed migration exists in the database
    const failedMigration = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" 
      WHERE migration_name = '20251001084327_init_db' 
      AND finished_at IS NULL
    `;
    
    if (failedMigration.length > 0) {
      console.log('⚠️  Found failed migration, marking as rolled back...');
      
      // Mark the failed migration as rolled back
      await prisma.$queryRaw`
        UPDATE "_prisma_migrations" 
        SET finished_at = NOW(), 
            logs = 'Marked as rolled back due to missing migration file'
        WHERE migration_name = '20251001084327_init_db' 
        AND finished_at IS NULL
      `;
      
      console.log('✅ Failed migration marked as rolled back');
    } else {
      console.log('ℹ️  No failed migration found');
    }
    
    // Check migration status
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, logs 
      FROM "_prisma_migrations" 
      ORDER BY started_at
    `;
    
    console.log('📊 Current migration status:');
    migrations.forEach(migration => {
      const status = migration.finished_at ? '✅ Applied' : '❌ Failed';
      console.log(`   ${migration.migration_name}: ${status}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing migrations:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionMigrations();
