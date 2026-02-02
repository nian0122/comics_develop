/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 启用暗色模式
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 柔和暗色调主题
        'dark-bg': {
          primary: '#181820',
          secondary: '#1e1e2a',
          tertiary: '#252535',
        },
        'dark-text': {
          primary: '#e1e1e6',
          secondary: '#b8b8c5',
          muted: '#8a8a9e',
        },
        'dark-accent': {
          primary: '#6366f1',
          secondary: '#818cf8',
          hover: '#4f46e5',
        },
        'dark-border': '#2d2d3f',
        // 保留原有的灰色系作为后备
        gray: {
          850: '#1f2937',
          900: '#111827',
          950: '#0b0f19',
        },
      },
      // 增强可读性的字体渲染
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      // 增强对比度和可读性
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'accent': '0 2px 8px rgba(99, 102, 241, 0.3)',
        'accent-hover': '0 2px 8px rgba(79, 70, 229, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};