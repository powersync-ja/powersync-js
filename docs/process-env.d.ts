export { };

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            [key: string]: string | undefined;
            META_LOGO_URL: string;
            ALGOLIA_APP_ID: string;
            ALGOLIA_API_KEY: string;
            GITHUB_URL: string;
            GITHUB_ORG: string;
        }
    }
}
