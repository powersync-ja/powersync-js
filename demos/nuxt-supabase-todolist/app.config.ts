export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      neutral: 'stone',
    },
    input: {
      variants: {
        variant: {
          subtle: 'ring-default bg-elevated/50',
        },
      },
    },
    header: {
      slots: {
        root: 'border-none',
      },
    },
  },
})
