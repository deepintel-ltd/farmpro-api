#!/bin/bash

# FarmPro API Contracts Publisher
# Usage: ./scripts/publish-contracts.sh [command] [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to run commands
run_command() {
    print_color $BLUE "Running: $1"
    eval $1
}

# Function to check git status
check_git_status() {
    print_color $CYAN "Checking git status..."
    if [ -n "$(git status --porcelain)" ]; then
        print_color $YELLOW "Warning: You have uncommitted changes:"
        git status --short
        print_color $YELLOW "Consider committing your changes before publishing contracts."
    else
        print_color $GREEN "Git working directory is clean ✓"
    fi
}

# Function to update version
update_version() {
    local version_type=${1:-patch}
    print_color $CYAN "Updating contracts package version ($version_type)..."
    
    cd contracts
    local current_version=$(node -p "require('./package.json').version")
    print_color $BLUE "Current version: $current_version"
    
    npm version $version_type --no-git-tag-version
    local new_version=$(node -p "require('./package.json').version")
    print_color $GREEN "New version: $new_version"
    
    cd ..
    echo $new_version
}

# Function to build contracts
build_contracts() {
    print_color $CYAN "Building contracts package..."
    run_command "npm run contracts:build"
    print_color $GREEN "Contracts built successfully ✓"
}

# Function to validate contracts
validate_contracts() {
    print_color $CYAN "Validating contracts package..."
    run_command "npm run contracts:validate"
    print_color $GREEN "Contracts validation passed ✓"
}

# Function to publish to GitHub
publish_to_github() {
    print_color $CYAN "Publishing to GitHub..."
    
    # Get version from contracts package.json
    local version=$(node -p "require('./contracts/package.json').version")
    
    # Commit version changes
    print_color $BLUE "Committing version changes..."
    git add contracts/package.json contracts/package-lock.json
    git commit -m "chore: bump contracts package version to v$version"
    
    # Create and push git tag
    print_color $BLUE "Creating git tag: contracts-v$version"
    git tag -a "contracts-v$version" -m "Release contracts package v$version"
    
    print_color $BLUE "Pushing changes and tags to GitHub..."
    git push origin main
    git push origin "contracts-v$version"
    
    print_color $GREEN "Published to GitHub successfully ✓"
    print_color $GREEN "Tag: contracts-v$version"
}

# Function to publish to NPM
publish_to_npm() {
    print_color $CYAN "Publishing to NPM..."
    
    local package_name=$(node -p "require('./contracts/package.json').name")
    print_color $BLUE "Publishing $package_name to NPM..."
    
    run_command "npm run contracts:publish"
    
    print_color $GREEN "Published to NPM successfully ✓"
    print_color $GREEN "Package: $package_name"
}

# Main function
main() {
    local command=${1:-help}
    
    print_color $MAGENTA "🚀 FarmPro API Contracts Publisher"
    print_color $MAGENTA "====================================="
    
    case $command in
        "build")
            print_color $CYAN "Building contracts only..."
            build_contracts
            ;;
        "validate")
            print_color $CYAN "Validating contracts only..."
            validate_contracts
            ;;
        "version")
            local version_type=${2:-patch}
            update_version $version_type
            ;;
        "github")
            print_color $CYAN "Publishing to GitHub only..."
            check_git_status
            build_contracts
            validate_contracts
            publish_to_github
            ;;
        "npm")
            print_color $CYAN "Publishing to NPM only..."
            build_contracts
            validate_contracts
            publish_to_npm
            ;;
        "all")
            print_color $CYAN "Publishing to both GitHub and NPM..."
            check_git_status
            local new_version=$(update_version ${2:-patch})
            build_contracts
            validate_contracts
            publish_to_github
            publish_to_npm
            print_color $GREEN "🎉 Successfully published contracts v$new_version!"
            ;;
        "help"|*)
            print_color $MAGENTA "Available commands:"
            print_color $BLUE "  build     - Build contracts package only"
            print_color $BLUE "  validate  - Validate contracts package only"
            print_color $BLUE "  version   - Update version (patch|minor|major)"
            print_color $BLUE "  github    - Publish to GitHub (create tag and push)"
            print_color $BLUE "  npm       - Publish to NPM registry"
            print_color $BLUE "  all       - Full publish (version + build + validate + github + npm)"
            print_color $BLUE "  help      - Show this help message"
            print_color $MAGENTA "Examples:"
            print_color $CYAN "  ./scripts/publish-contracts.sh build"
            print_color $CYAN "  ./scripts/publish-contracts.sh version minor"
            print_color $CYAN "  ./scripts/publish-contracts.sh github"
            print_color $CYAN "  ./scripts/publish-contracts.sh all patch"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
