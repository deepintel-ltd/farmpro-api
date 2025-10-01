#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    log(`Running: ${command}`, 'blue');
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: options.cwd || process.cwd(),
      ...options 
    });
    return result;
  } catch (error) {
    log(`Error running command: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function checkGitStatus() {
  log('Checking git status...', 'cyan');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('Warning: You have uncommitted changes:', 'yellow');
      log(status, 'yellow');
      log('Consider committing your changes before publishing contracts.', 'yellow');
    } else {
      log('Git working directory is clean ✓', 'green');
    }
  } catch {
    log('Warning: Could not check git status', 'yellow');
  }
}

function updateContractsVersion(versionType = 'patch') {
  log(`Updating contracts package version (${versionType})...`, 'cyan');
  
  const contractsDir = join(__dirname, '..', 'contracts');
  const packageJsonPath = join(contractsDir, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    log('Error: contracts/package.json not found', 'red');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  log(`Current version: ${currentVersion}`, 'blue');
  
  // Update version
  execCommand(`npm version ${versionType}`, { cwd: contractsDir });
  
  // Read updated version
  const updatedPackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const newVersion = updatedPackageJson.version;
  
  log(`New version: ${newVersion}`, 'green');
  return newVersion;
}

function buildContracts() {
  log('Building contracts package...', 'cyan');
  execCommand('npm run contracts:build');
  log('Contracts built successfully ✓', 'green');
}

function validateContracts() {
  log('Validating contracts package...', 'cyan');
  execCommand('npm run contracts:validate');
  log('Contracts validation passed ✓', 'green');
}

function publishToGitHub() {
  log('Creating GitHub release tag...', 'cyan');
  
  // First, commit the version changes
  log('Committing version changes...', 'blue');
  execCommand('git add contracts/package.json contracts/package-lock.json');
  execCommand('git commit -m "chore: bump contracts package version"');
  
  // Create and push git tag
  const contractsDir = join(__dirname, '..', 'contracts');
  const packageJson = JSON.parse(readFileSync(join(contractsDir, 'package.json'), 'utf8'));
  const version = packageJson.version;
  
  log(`Creating git tag: contracts-v${version}`, 'blue');
  execCommand(`git tag -a contracts-v${version} -m "Release contracts package v${version}"`);
  
  log('Pushing changes and tags to GitHub...', 'blue');
  execCommand('git push origin main');
  execCommand(`git push origin contracts-v${version}`);
  
  log('GitHub release tag created successfully ✓', 'green');
  log(`Tag: contracts-v${version}`, 'green');
  log('Note: Package is published to NPM registry only', 'yellow');
}

function publishToNPM() {
  log('Publishing to NPM registry...', 'cyan');
  
  const contractsDir = join(__dirname, '..', 'contracts');
  const packageJson = JSON.parse(readFileSync(join(contractsDir, 'package.json'), 'utf8'));
  const packageName = packageJson.name;
  
  log(`Publishing ${packageName} to NPM registry...`, 'blue');
  execCommand(`cd contracts && npm publish --registry https://registry.npmjs.org/ --access public`);
  
  log('Published to NPM registry successfully ✓', 'green');
  log(`Package: ${packageName}`, 'green');
  log('Registry: https://registry.npmjs.org/', 'green');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  log('🚀 FarmPro API Contracts Publisher', 'bright');
  log('=====================================', 'bright');
  
  switch (command) {
    case 'build':
      log('Building contracts only...', 'cyan');
      buildContracts();
      break;
      
    case 'validate':
      log('Validating contracts only...', 'cyan');
      validateContracts();
      break;
      
    case 'version': {
      const versionType = args[1] || 'patch';
      updateContractsVersion(versionType);
      break;
    }
      
    case 'github':
      log('Creating GitHub release tag only...', 'cyan');
      checkGitStatus();
      buildContracts();
      validateContracts();
      publishToGitHub();
      break;
      
    case 'npm':
      log('Publishing to NPM registry only...', 'cyan');
      buildContracts();
      validateContracts();
      publishToNPM();
      break;
      
    case 'all': {
      log('Publishing to NPM registry with GitHub release tag...', 'cyan');
      checkGitStatus();
      const newVersion = updateContractsVersion(args[1] ?? 'patch');
      buildContracts();
      validateContracts();
      publishToNPM();
      publishToGitHub();
      log(`\n🎉 Successfully published contracts v${newVersion} to NPM!`, 'green');
      log('📦 NPM Package: https://www.npmjs.com/package/@deepintel-ltd/farmpro-api-contracts', 'green');
      break;
    }
      
    case 'help':
    default:
      log('Available commands:', 'bright');
      log('  build     - Build contracts package only', 'blue');
      log('  validate  - Validate contracts package only', 'blue');
      log('  version   - Update version (patch|minor|major)', 'blue');
      log('  github    - Create GitHub release tag only', 'blue');
      log('  npm       - Publish to NPM registry only', 'blue');
      log('  all       - Full publish (NPM + GitHub tag)', 'blue');
      log('  help      - Show this help message', 'blue');
      log('\nNote: Package is published to NPM registry only', 'yellow');
      log('\nExamples:', 'bright');
      log('  node scripts/publish-contracts.js build', 'cyan');
      log('  node scripts/publish-contracts.js version minor', 'cyan');
      log('  node scripts/publish-contracts.js github', 'cyan');
      log('  node scripts/publish-contracts.js all patch', 'cyan');
      break;
  }
}

main();
