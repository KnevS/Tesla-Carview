export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        tesla: {
          red:   'var(--accent)',
          dark:  '#171A20',
          gray:  '#393C41',
          light: '#F4F4F4',
        },
      },
    },
  },
  plugins: [],
};
