module.exports = {
  extends: ["universe", "universe/shared/typescript-analysis"],
  overrides: [
    {
      files: ["*.ts", "*.tsx", "*.d.ts"],
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  ],
  ignorePatterns: ["*.typegen.ts", "database.types.ts"],
  env: {
    node: true,
  },
};
