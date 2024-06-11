# Website

This website is built using [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

### Installation

In the root of the repo:

```bash
pnpm install
pnpm build:packages
```

### Local Development

In this directory:

Copy `.env.example` to `.env`.

```bash
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```bash
USE_SSH=true pnpm deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> pnpm deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
