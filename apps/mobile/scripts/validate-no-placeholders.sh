#!/bin/bash

# EchoTrail Pre-Commit Validation Script
# Prevents any placeholder functionality from being committed

echo "🔍 Validating NO placeholder functionality..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for forbidden placeholder patterns
FORBIDDEN_PATTERNS=(
    "coming soon"
    "kommer snart"
    "available soon"
    "will be available"
    "under construction"
    "placeholder"
    "TODO.*later"
    "FIXME.*later"
)

# Check Alert.alert patterns specifically  
ALERT_PATTERNS=(
    "Alert.alert.*soon"
    "Alert.alert.*coming"
    "Alert.alert.*available.*later"
    "Alert.alert.*placeholder"
)

VIOLATIONS_FOUND=0

echo "📋 Checking source code for forbidden placeholder patterns..."

# Check general patterns
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    echo "  🔍 Checking: $pattern"
    
    if grep -r -i "$pattern" src/ 2>/dev/null; then
        echo -e "${RED}❌ VIOLATION: Found '$pattern' in source code${NC}"
        VIOLATIONS_FOUND=1
    fi
done

# Check Alert.alert patterns  
for pattern in "${ALERT_PATTERNS[@]}"; do
    echo "  🔍 Checking Alert pattern: $pattern"
    
    if grep -r -i "$pattern" src/ 2>/dev/null; then
        echo -e "${RED}❌ VIOLATION: Found '$pattern' in Alert messages${NC}"
        VIOLATIONS_FOUND=1
    fi
done

# Check for disabled buttons without implementation
echo "  🔍 Checking for disabled buttons..."
if grep -r "disabled.*true" src/ | grep -v "isLoading" | grep -v "!.*valid" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Found disabled buttons - ensure they have proper implementation${NC}"
fi

# Check for empty catch blocks
echo "  🔍 Checking for empty catch blocks..."
if grep -r "catch.*{.*}" src/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Found empty catch blocks - add proper error handling${NC}"
fi

# Final verdict
if [ $VIOLATIONS_FOUND -eq 1 ]; then
    echo ""
    echo -e "${RED}🚨 COMMIT BLOCKED: Placeholder functionality detected!${NC}"
    echo ""
    echo -e "${RED}RULES VIOLATED:${NC}"
    echo "  • NO 'coming soon' or similar placeholder messages"
    echo "  • NO disabled functionality without full implementation" 
    echo "  • ALL features must work 100% before commit"
    echo ""
    echo -e "${RED}ACTION REQUIRED:${NC}"
    echo "  1. 🔧 FIX all placeholder functionality immediately"
    echo "  2. ✅ IMPLEMENT proper backend integration"
    echo "  3. 🧪 TEST all functionality end-to-end"  
    echo "  4. 🔄 TRY commit again"
    echo ""
    echo -e "${RED}REMEMBER: IF IT'S IN THE APP, IT MUST WORK 100%${NC}"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ VALIDATION PASSED: No placeholder functionality detected${NC}"
    echo -e "${GREEN}🎯 All features appear to be fully implemented${NC}"
    echo ""
    exit 0
fi