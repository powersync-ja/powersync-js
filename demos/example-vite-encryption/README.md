# PowerSync Web Encryption example

This is a minimal example demonstrating web encryption. It prompts an encryption key, which is used for the database.
If the database doesn't exist yet, it will apply the encryption key when creating the database for the specified database name.
If the database does exist, it will use the encryption key to access the database - should the provided key be different to the one provided upon creation it fail to open the database.

To see it in action:

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root directory of this repo.
2. `cd` into this directory, and run `pnpm start`.
3. Open the localhost URL displayed in the terminal output in your browser.
