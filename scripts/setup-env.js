#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup script to create .env file with secure defaults
 */

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const templatePath = path.join(__dirname, '..', 'env.local');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Backing up to .env.backup');
    fs.copyFileSync(envPath, path.join(__dirname, '..', '.env.backup'));
  }
  
  // Read template
  if (!fs.existsSync(templatePath)) {
    console.error('❌ env.local template file not found!');
    process.exit(1);
  }
  
  let envContent = fs.readFileSync(templatePath, 'utf8');
  
  // Generate secure secrets
  const jwtSecret = generateSecureSecret(32);
  const refreshSecret = generateSecureSecret(32);
  
  // Replace placeholder secrets
  envContent = envContent.replace(
    'your-super-secure-jwt-secret-key-here-change-this-in-production',
    jwtSecret
  );
  envContent = envContent.replace(
    'your-super-secure-refresh-secret-key-here-change-this-in-production',
    refreshSecret
  );
  
  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env file created successfully!');
  console.log('🔐 Generated secure JWT secrets');
  console.log('📝 Please fill in the remaining API keys and configuration values');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set up your database (PostgreSQL)');
  console.log('2. Get API keys for external services (OpenAI, Weather, Brevo, etc.)');
  console.log('3. Configure file storage (AWS S3 or Cloudflare R2)');
  console.log('4. Set up payment processing (Stripe/Paystack)');
  console.log('');
  console.log('Run "npm run db:init" to initialize the database');
}

// Run the setup
createEnvFile();
