#!/bin/bash

# Pronttera Connect - Documentation Update Script
# This script helps maintain and update system documentation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SYSTEM]${NC} $1"
}

# Function to check if documentation exists
check_docs() {
    print_header "Checking documentation structure..."
    
    if [ ! -d "docs" ]; then
        print_error "Documentation directory not found!"
        exit 1
    fi
    
    required_files=(
        "SYSTEM_DOCUMENTATION.md"
        "CHANGELOG.md"
        "QUICK_REFERENCE.md"
        "README.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "docs/$file" ]; then
            print_status "✓ $file exists"
        else
            print_warning "✗ $file missing"
        fi
    done
}

# Function to update change log
update_changelog() {
    local version=$1
    local category=$2
    local description=$3
    local impact=$4
    
    print_header "Updating change log..."
    
    today=$(date +"%B %d, %Y")
    
    # Create new entry
    new_entry="#### **$today - Version $version**
**Category:** $category
**Description:** $description
**Impact:** $impact
**Details:** 
- [Add detailed description here]
**Breaking Changes:** No

"

    # Insert after the "Recent Changes" section
    sed -i '' "/## 🔄 Recent Changes/a\\
$new_entry" docs/CHANGELOG.md
    
    print_status "Change log updated with version $version"
}

# Function to update documentation timestamp
update_timestamp() {
    print_header "Updating documentation timestamps..."
    
    today=$(date +"%B %d, %Y")
    
    # Update main documentation
    sed -i '' "s/> \*\*Last Updated:\*\*.*$/> **Last Updated:** $today/" docs/SYSTEM_DOCUMENTATION.md
    sed -i '' "s/> \*\*Last Updated:\*\*.*$/> **Last Updated:** $today/" docs/QUICK_REFERENCE.md
    sed -i '' "s/> \*\*Last Updated:\*\*.*$/> **Last Updated:** $today/" docs/README.md
    
    print_status "Timestamps updated to $today"
}

# Function to validate documentation links
validate_links() {
    print_header "Validating documentation links..."
    
    # Check if all referenced files exist
    grep -o "\[.*\](\.\/.*\.md)" docs/*.md | while read -r link; do
        filename=$(echo "$link" | sed 's/.*(\.\/\(.*\))/\1/')
        if [ -f "docs/$filename" ]; then
            print_status "✓ Link valid: $filename"
        else
            print_warning "✗ Broken link: $filename"
        fi
    done
}

# Function to create backup
create_backup() {
    print_header "Creating documentation backup..."
    
    backup_dir="docs/backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    cp -r docs/*.md "$backup_dir/" 2>/dev/null || true
    
    print_status "Backup created at $backup_dir"
}

# Function to show help
show_help() {
    echo "Pronttera Connect - Documentation Maintenance Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  check                    Check documentation structure"
    echo "  update-changelog         Add new entry to change log"
    echo "  update-timestamps        Update all document timestamps"
    echo "  validate-links           Validate internal links"
    echo "  backup                   Create backup of documentation"
    echo "  full-check               Run all checks and updates"
    echo "  help                     Show this help message"
    echo ""
    echo "Options for update-changelog:"
    echo "  --version VERSION       Version number (e.g., 1.1.0)"
    echo "  --category CATEGORY     Category (Feature/Bug Fix/Security/etc.)"
    echo "  --description DESC      Brief description"
    echo "  --impact IMPACT          Impact description"
    echo ""
    echo "Examples:"
    echo "  $0 check"
    echo "  $0 update-changelog --version 1.1.0 --category Feature --description 'Added new dashboard' --impact 'All users'"
    echo "  $0 full-check"
}

# Main script logic
case "${1:-help}" in
    "check")
        check_docs
        ;;
    "update-changelog")
        if [ $# -lt 9 ]; then
            print_error "Missing required options for update-changelog"
            show_help
            exit 1
        fi
        
        version=""
        category=""
        description=""
        impact=""
        
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --version)
                    version="$2"
                    shift 2
                    ;;
                --category)
                    category="$2"
                    shift 2
                    ;;
                --description)
                    description="$2"
                    shift 2
                    ;;
                --impact)
                    impact="$2"
                    shift 2
                    ;;
                *)
                    print_error "Unknown option: $1"
                    show_help
                    exit 1
                    ;;
            esac
        done
        
        update_changelog "$version" "$category" "$description" "$impact"
        ;;
    "update-timestamps")
        update_timestamp
        ;;
    "validate-links")
        validate_links
        ;;
    "backup")
        create_backup
        ;;
    "full-check")
        print_header "Running full documentation check..."
        check_docs
        validate_links
        update_timestamp
        print_status "Full check completed!"
        ;;
    "help"|*)
        show_help
        ;;
esac
