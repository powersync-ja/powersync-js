const autoprefixer = require("autoprefixer");

function stripTailwindAtRules() {
  const plugin = () => ({
    postcssPlugin: "strip-tailwind-at-rules",
    AtRule: {
      tailwind: (atRule) => atRule.remove(),
    },
  });
  plugin.postcss = true;
  return plugin;
}

module.exports = {
  plugins: (() => {
    if (process.env.TAILWIND_DISABLE) {
      return [stripTailwindAtRules(), autoprefixer()];
    }
    try {
      // Tailwind v4 postcss plugin
      const tailwindPostcss = require("@tailwindcss/postcss");
      return [tailwindPostcss(), autoprefixer()];
    } catch {
      // Tailwind v3 fallback
      try {
        const tailwindcss = require("tailwindcss");
        return [tailwindcss(), autoprefixer()];
      } catch {
        // As a last resort, strip at-rules so builds don't fail
        return [stripTailwindAtRules(), autoprefixer()];
      }
    }
  })(),
};
