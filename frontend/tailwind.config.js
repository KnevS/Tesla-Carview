export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // App-Hintergrund: nicht mehr stumpf #171A20, sondern leicht
        // kuehler mit minimaler Tiefenstaffelung — wirkt edler.
        tesla: {
          red:   'var(--accent)',
          dark:  '#0F1115',   // Hintergrund (war #171A20)
          deep:  '#0A0C10',   // Tiefer Hintergrund fuer Layering
          gray:  '#1B1F25',   // Card-Untergrund (war #393C41)
          line:  'rgba(255,255,255,0.06)', // Subtile Trennlinien
          light: '#F4F4F4',
        },
      },
      // Backdrop-Blur-Stufen — der Glas-Effekt lebt davon.
      backdropBlur: { xs: '2px', lg: '14px', xl: '22px' },
      // Mehrlagige Schatten: nicht ein dicker Schlagschatten, sondern
      // mehrere subtile Layer geben echte Tiefe. „glass" fuer Cards,
      // „glow" fuer Akzente, „pop" fuer Hover-Lifts.
      boxShadow: {
        glass:    '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(0,0,0,0.55), 0 24px 64px -16px rgba(0,0,0,0.5)',
        glassHi:  '0 1px 0 0 rgba(255,255,255,0.07) inset, 0 12px 32px -8px rgba(0,0,0,0.65), 0 30px 80px -20px rgba(0,0,0,0.55)',
        glow:     '0 0 0 1px rgba(227,25,55,0.4), 0 8px 32px -8px rgba(227,25,55,0.35)',
        pop:      '0 18px 40px -10px rgba(0,0,0,0.65)',
        ring:     '0 0 0 2px rgba(227,25,55,0.55)',
      },
      // Akzent-Gradienten — fuer KPI-Highlights und Buttons.
      backgroundImage: {
        'accent-grad':    'linear-gradient(135deg, #E31937 0%, #B0142B 50%, #7A0E1F 100%)',
        'card-grad':      'linear-gradient(140deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%)',
        'card-grad-red':  'linear-gradient(140deg, rgba(227,25,55,0.18) 0%, rgba(227,25,55,0.04) 60%, rgba(255,255,255,0.015) 100%)',
        'sheen':          'radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 60%)',
      },
      fontFamily: {
        // System-UI-Stack: San Francisco auf macOS/iOS, Segoe UI auf
        // Windows, Roboto auf Android — alle modern, alle hi-dpi-tauglich.
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Display-Variante mit Tighter Letter-Spacing fuer grosse Zahlen
        display: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.025em',
        tight:   '-0.015em',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease',
        'lift':      'lift 0.25s ease forwards',
        'pulse-red': 'pulseRed 2.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        lift:   { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(-2px)' } },
        pulseRed: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(227,25,55,0.5)' }, '50%': { boxShadow: '0 0 0 8px rgba(227,25,55,0)' } },
      },
    },
  },
  plugins: [],
};
