# AWS Credentials Setup Guide

## Current Status

Your system has AWS credential files at:
- `~/.aws/credentials` (exists but empty or invalid)
- `~/.aws/config` (exists)

But credentials are not being recognized by AWS CLI or Serverless Framework.

## How to Set Up AWS Credentials

### Option 1: Interactive Setup (Recommended)

Run this command and follow the prompts:

```bash
aws configure
```

You'll be asked for:

1. **AWS Access Key ID**: Get from AWS Console → IAM → Security Credentials
2. **AWS Secret Access Key**: Shown only once when created
3. **Default region name**: Use `us-east-1`
4. **Default output format**: Use `json`

### Option 2: Manual Setup

Edit the files directly:

#### 1. Edit `~/.aws/credentials`:

```bash
nano ~/.aws/credentials
```

Add this content (replace with your actual keys):

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

#### 2. Edit `~/.aws/config`:

```bash
nano ~/.aws/config
```

Add this content:

```ini
[default]
region = us-east-1
output = json
```

### Option 3: Environment Variables

Set environment variables in your shell:

```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_DEFAULT_REGION=us-east-1
```

To make them permanent, add to your shell profile:

```bash
# For bash
echo 'export AWS_ACCESS_KEY_ID=your_key' >> ~/.bash_profile
echo 'export AWS_SECRET_ACCESS_KEY=your_secret' >> ~/.bash_profile
echo 'export AWS_DEFAULT_REGION=us-east-1' >> ~/.bash_profile
source ~/.bash_profile

# For zsh
echo 'export AWS_ACCESS_KEY_ID=your_key' >> ~/.zshrc
echo 'export AWS_SECRET_ACCESS_KEY=your_secret' >> ~/.zshrc
echo 'export AWS_DEFAULT_REGION=us-east-1' >> ~/.zshrc
source ~/.zshrc
```

## Getting AWS Access Keys

### If You Need to Create New Keys:

1. **Go to AWS Console**: https://console.aws.amazon.com/
2. **Navigate to IAM**:
   - Click your username (top right)
   - Click "Security credentials"
3. **Create Access Key**:
   - Scroll to "Access keys"
   - Click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Click "Next" → "Create access key"
4. **Save Credentials**:
   - **IMPORTANT**: Download the CSV or copy both keys
   - You can only see the secret key once!

### Required Permissions

Your IAM user needs these permissions for Serverless deployment:

- **Lambda**: Full access (create, update, delete functions)
- **API Gateway**: Full access (create, update APIs)
- **DynamoDB**: Full access (create, manage tables)
- **CloudFormation**: Full access (deploy stacks)
- **S3**: Access to create/use deployment bucket
- **IAM**: PassRole permission (for Lambda execution role)
- **CloudWatch**: Logs access
- **Route53**: DNS management (for custom domain)
- **ACM**: Certificate management (for SSL)

**Recommended Policy**: Use the managed policy `AdministratorAccess` for simplicity, or create a custom policy with specific permissions.

## Verifying Your Setup

### Step 1: Test AWS CLI

```bash
aws sts get-caller-identity
```

**Expected output**:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/username"
}
```

**If this fails**: Your credentials are not set up correctly.

### Step 2: Test Serverless

```bash
cd auth-api
serverless info --stage dev
```

**Expected output**: Shows your service information (or "Stack not found" if not deployed yet).

**If this fails**: Either credentials are wrong or Serverless can't access them.

### Step 3: Verify Region

```bash
aws configure get region
```

**Expected output**: `us-east-1`

## Troubleshooting

### Problem: "Unable to locate credentials"

**Solutions**:
1. Run `aws configure` and enter credentials
2. Check `~/.aws/credentials` file exists and has content
3. Try environment variables instead
4. Verify file permissions: `chmod 600 ~/.aws/credentials`

### Problem: "AccessDenied" errors

**Solutions**:
1. Verify your IAM user has required permissions
2. Check if MFA is required for your account
3. Ensure access keys are active (not deleted/deactivated in AWS Console)

### Problem: "Region not found"

**Solutions**:
1. Set region: `aws configure set region us-east-1`
2. Or use environment variable: `export AWS_DEFAULT_REGION=us-east-1`

### Problem: Credentials work for AWS CLI but not Serverless

**Solutions**:
1. Ensure you're in the correct directory: `cd auth-api`
2. Check Serverless can find credentials: `serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET`
3. Try explicit profile: `serverless deploy --stage dev --aws-profile default`

## Testing Deployment After Setup

Once credentials are configured:

```bash
# Navigate to auth-api directory
cd /Users/sszettella/Documents/zsmseven/auth-api

# Build TypeScript
npm run build

# Test deployment (dry run)
serverless package --stage dev

# Deploy to development
serverless deploy --stage dev

# Or use npm script
npm run deploy:dev
```

## Alternative: Using AWS Profiles

If you have multiple AWS accounts:

### Create Named Profile

```bash
aws configure --profile myproject
```

### Use Profile with Serverless

```bash
# Deploy using specific profile
serverless deploy --stage dev --aws-profile myproject

# Or set environment variable
export AWS_PROFILE=myproject
serverless deploy --stage dev
```

### Set Default Profile

Edit `~/.aws/credentials` to have multiple profiles:

```ini
[default]
aws_access_key_id = YOUR_KEY_1
aws_secret_access_key = YOUR_SECRET_1

[myproject]
aws_access_key_id = YOUR_KEY_2
aws_secret_access_key = YOUR_SECRET_2
```

## Security Best Practices

1. **Never commit credentials**: AWS keys should never be in git
   - `.env` files are in `.gitignore`
   - `~/.aws/credentials` is not in any repo

2. **Rotate keys regularly**: Create new keys every 90 days

3. **Use least privilege**: Only grant necessary permissions

4. **Enable MFA**: Add multi-factor authentication for sensitive operations

5. **Monitor usage**: Check CloudTrail for unexpected API calls

## Quick Start Checklist

- [ ] Run `aws configure` with your credentials
- [ ] Test with `aws sts get-caller-identity`
- [ ] Verify region is set to `us-east-1`
- [ ] Navigate to `auth-api` directory
- [ ] Run `npm run build`
- [ ] Run `serverless deploy --stage dev`
- [ ] Check deployment succeeds
- [ ] Test API endpoints

## Next Steps After Setup

Once credentials are working:

1. **Deploy to dev**: `npm run deploy:dev`
2. **Create custom domain**: `serverless create_domain --stage dev`
3. **Deploy to prod**: `npm run deploy:prod`
4. **Test endpoints**: Use cURL or Postman to test API

## Need Help?

If you're still having issues:

1. Run these diagnostic commands and share output:
   ```bash
   aws configure list
   aws sts get-caller-identity
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_DEFAULT_REGION
   cat ~/.aws/config
   ```

2. Check Serverless version: `serverless --version`

3. Check AWS CLI version: `aws --version`

## Summary

The key is to ensure AWS credentials are accessible to both AWS CLI and Serverless Framework. The easiest method is:

```bash
aws configure
```

Then enter your:
- Access Key ID
- Secret Access Key
- Region: us-east-1
- Output: json

After that, deployment should work! 🚀
