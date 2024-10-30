# PowerSync + Supabase + AWS S3 React Native Demo: Todo List

## Overview

Demo app demonstrating the use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase for authentication
and [Amazon S3](https://docs.aws.amazon.com/s3/) to store attachments.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).
Follow all the steps until, but not including, [Test Everything (Using Our Demo App)](https://docs.powersync.com/integration-guides/supabase-+-powersync#test-everything-using-our-demo-app).

## Getting Started

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

Then switch into the demo's directory:

```bash
cd demos/react-native-aws-s3-todolist
```

Set up the Environment variables: Copy the `.env` file:

```bash
cp .env .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

## AWS S3 Setup

> **_NOTE:_** This guide assumes that you have an AWS account.

To enable attachment storage using AWS S3, set up an S3 bucket by following these steps:
### Create an S3 Bucket:

- Go to the [S3 Console](https://s3.console.aws.amazon.com/s3) and click `Create bucket`.
- Enter a unique bucket name and select your preferred region.
- Under Object Ownership, set ACLs disabled and ensure the bucket is private.
- Enable Bucket Versioning if you need to track changes to files (optional).

### Configure Permissions:

Go to the Permissions tab and set up the following:
- A **bucket policy** for access control:
  - Click Bucket policy and enter a policy allowing the necessary actions 
  (e.g., s3:PutObject, s3:GetObject) for the specific users or roles.
- _**(Optional)**_ Configure CORS (Cross-Origin Resource Sharing) if your app requires it

### Create IAM User for Access

- Go to the [IAM Console](https://console.aws.amazon.com/iam) and create a new user with programmatic access.
- Attach an AmazonS3FullAccess policy to this user, or create a custom policy with specific permissions for the bucket.
- Save the Access Key ID and Secret Access Key. In your `.env.local` file, add your AWS credentials and S3 bucket name.

## Run app

Run on iOS

```sh
pnpm ios
```

Run on Android (see [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment?platform=android) to allow you to develop with Android emulators and iOS simulators).

```sh
pnpm android
```

### EAS Build configuration

General information on defining environment variables with Expo can be found here [here](https://docs.expo.dev/build-reference/variables/#can-eas-build-use-env-files).

## Learn More

Check out [the PowerSync SDK for React Native on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).

