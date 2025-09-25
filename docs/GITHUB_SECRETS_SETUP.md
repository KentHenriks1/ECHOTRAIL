# 🔐 GitHub Secrets Setup Guide for EchoTrail

This document provides a comprehensive guide for setting up all required GitHub repository secrets for EchoTrail's CI/CD pipeline.

## 🎯 Overview

EchoTrail's GitHub Actions workflow requires several secrets to function properly. These secrets enable automated builds, testing, security scanning, and deployments.

## 📋 Required Secrets

### 🚀 **Expo & EAS Secrets**

#### `EXPO_TOKEN`
- **Purpose**: Authentication for EAS builds and deployments
- **How to get**: 
  1. Go to [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
  2. Create a new token with "Full access" permissions
  3. Copy the token (starts with `expo_...`)
- **Format**: `expo_xxx...xxx`

### 📱 **App Store Deployment Secrets**

#### `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Purpose**: Automated Google Play Store uploads
- **How to get**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a service account for Google Play Developer API
  3. Download the JSON key file
  4. Copy the entire JSON content
- **Format**: Complete JSON object

#### `APPLE_ID`
- **Purpose**: Apple App Store Connect authentication
- **How to get**: Your Apple Developer account email
- **Format**: `developer@example.com`

#### `APPLE_ID_PASSWORD`
- **Purpose**: App-specific password for App Store Connect
- **How to get**:
  1. Go to [appleid.apple.com](https://appleid.apple.com/)
  2. Sign in and go to "App-Specific Passwords"
  3. Generate a new password for "EAS CLI"
- **Format**: `xxxx-xxxx-xxxx-xxxx`

#### `ASC_PROVIDER`
- **Purpose**: Apple App Store Connect team ID
- **How to get**:
  1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
  2. Find your Team ID in account settings
- **Format**: `1A2B3C4D5E`

### 🛡️ **Security Scanning Secrets**

#### `SNYK_TOKEN`
- **Purpose**: Vulnerability scanning with Snyk
- **How to get**:
  1. Go to [snyk.io](https://snyk.io/)
  2. Create account and go to Account Settings
  3. Generate an API token
- **Format**: `xxx...xxx`

#### `SONARCLOUD_TOKEN`
- **Purpose**: Code quality analysis with SonarCloud
- **How to get**:
  1. Go to [sonarcloud.io](https://sonarcloud.io/)
  2. Create account and go to "My Account" > "Security"
  3. Generate a new token
- **Format**: `xxx...xxx`

### 📊 **Monitoring & Analytics Secrets**

#### `SENTRY_AUTH_TOKEN`
- **Purpose**: Error tracking integration
- **How to get**:
  1. Go to [sentry.io](https://sentry.io/)
  2. Navigate to Settings > Auth Tokens
  3. Create a new token with project:releases scope
- **Format**: `xxx...xxx`

#### `DATADOG_API_KEY`
- **Purpose**: Performance monitoring integration
- **How to get**:
  1. Go to [datadoghq.com](https://app.datadoghq.com/)
  2. Navigate to Integrations > APIs
  3. Create or copy an existing API key
- **Format**: `xxx...xxx`

#### `NEW_RELIC_API_KEY`
- **Purpose**: Application performance monitoring
- **How to get**:
  1. Go to [newrelic.com](https://one.newrelic.com/)
  2. Navigate to API keys section
  3. Create a new Ingest - License key
- **Format**: `xxx...xxx`

### 🔔 **Notification Secrets**

#### `SLACK_WEBHOOK_URL`
- **Purpose**: Build status notifications to Slack
- **How to get**:
  1. Go to your Slack workspace
  2. Create an Incoming Webhook app
  3. Copy the webhook URL
- **Format**: `https://hooks.slack.com/services/xxx/xxx/xxx`

#### `DISCORD_WEBHOOK_URL`
- **Purpose**: Build status notifications to Discord
- **How to get**:
  1. Go to Discord channel settings
  2. Create a webhook in Integrations
  3. Copy the webhook URL
- **Format**: `https://discord.com/api/webhooks/xxx/xxx`

## 🛠️ Setting Up Secrets

### Using GitHub CLI

```bash
# Set up all secrets using GitHub CLI
gh secret set EXPO_TOKEN --body "your_expo_token_here"
gh secret set GOOGLE_SERVICE_ACCOUNT_KEY --body "your_json_service_account_key"
gh secret set APPLE_ID --body "your_apple_id@example.com"
gh secret set APPLE_ID_PASSWORD --body "your_app_specific_password"
gh secret set ASC_PROVIDER --body "your_team_id"
gh secret set SNYK_TOKEN --body "your_snyk_token"
gh secret set SONARCLOUD_TOKEN --body "your_sonarcloud_token"
gh secret set SENTRY_AUTH_TOKEN --body "your_sentry_token"
gh secret set DATADOG_API_KEY --body "your_datadog_key"
gh secret set NEW_RELIC_API_KEY --body "your_newrelic_key"
gh secret set SLACK_WEBHOOK_URL --body "your_slack_webhook_url"
gh secret set DISCORD_WEBHOOK_URL --body "your_discord_webhook_url"
```

### Using GitHub Web Interface

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## 🧪 Testing Secrets

### Verify Secrets Are Set

```bash
# List all repository secrets (names only, values are hidden)
gh secret list
```

### Test CI/CD Pipeline

1. Push a commit to the `main` branch
2. Monitor the GitHub Actions workflow
3. Check that all steps pass without authentication errors

## 🔍 Troubleshooting

### Common Issues

#### **Expo Token Invalid**
- **Error**: `Authentication failed`
- **Solution**: Regenerate token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)

#### **Apple Credentials Invalid**
- **Error**: `Invalid credentials`
- **Solution**: 
  - Verify Apple ID is correct
  - Ensure app-specific password is valid
  - Check team ID matches your developer account

#### **Google Service Account Key Invalid**
- **Error**: `Invalid service account`
- **Solution**:
  - Ensure JSON is complete and valid
  - Check service account has Google Play Developer API access
  - Verify permissions are correctly set

### Debug Commands

```bash
# Test individual secrets (be careful not to expose values)
gh secret list

# Check repository settings
gh repo view --json name,owner,private

# View recent workflow runs
gh run list --limit 5
```

## 🔐 Security Best Practices

### Secret Management
- **Never commit secrets** to version control
- **Use unique tokens** for each service
- **Rotate secrets regularly** (quarterly recommended)
- **Use minimum required permissions** for each token
- **Monitor secret usage** in GitHub Actions logs

### Access Control
- **Limit repository access** to necessary team members
- **Use environment protection rules** for production deployments
- **Enable two-factor authentication** on all service accounts
- **Audit secret access** periodically

### Environment Separation
- **Use different tokens** for development/staging/production
- **Implement environment-specific secrets** where possible
- **Separate sensitive operations** into protected branches

## 📊 Secret Status Checklist

Use this checklist to track your secret setup progress:

- [ ] **EXPO_TOKEN** - EAS builds and deployments
- [ ] **GOOGLE_SERVICE_ACCOUNT_KEY** - Google Play Store uploads  
- [ ] **APPLE_ID** - Apple App Store authentication
- [ ] **APPLE_ID_PASSWORD** - App-specific password
- [ ] **ASC_PROVIDER** - Apple team ID
- [ ] **SNYK_TOKEN** - Security vulnerability scanning
- [ ] **SONARCLOUD_TOKEN** - Code quality analysis
- [ ] **SENTRY_AUTH_TOKEN** - Error tracking
- [ ] **DATADOG_API_KEY** - Performance monitoring
- [ ] **NEW_RELIC_API_KEY** - Application monitoring
- [ ] **SLACK_WEBHOOK_URL** - Slack notifications
- [ ] **DISCORD_WEBHOOK_URL** - Discord notifications

## 🚀 Next Steps

Once all secrets are configured:

1. **Test the pipeline** by pushing a commit
2. **Monitor the workflow** for successful execution
3. **Verify integrations** are working correctly
4. **Document any custom configurations** for your team

## 🆘 Getting Help

If you encounter issues:

1. **Check the GitHub Actions logs** for specific error messages
2. **Review service documentation** for authentication requirements
3. **Contact the team** via [Discord](https://discord.gg/echotrail) or email
4. **Create an issue** in the repository with detailed error information

---

**⚡ Pro Tip**: Set up a staging environment first to test all integrations before configuring production secrets.

**🔒 Security Note**: Never share secret values in plain text. Use secure channels for sharing sensitive information within your team.