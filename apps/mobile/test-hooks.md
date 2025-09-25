# Git Hooks Test

This file tests our git hooks setup.

## Hooks Configured

1. **pre-commit**: Runs lint-staged with ESLint + Prettier
2. **commit-msg**: Validates commit message format with commitlint
3. **pre-push**: Runs QA checks (basic for feature branches, full for main)
4. **post-checkout**: Notifies about dependency changes

## Status

✅ All hooks working correctly!