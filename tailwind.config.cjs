const inter = ['Inter Variable', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'];

module.exports = {
  content: ['./frontend/**/*.{html,js,mjs}'],
  theme: {
    extend: {
      colors: {
        'primary-navy': '#172554',
        'secondary-blue': '#3157A4',
        'accent-gold': '#8A5B00',
        'success': '#0F6A48',
        'text-primary': '#182230',
        'text-secondary': '#525C6F',
        'light-on-primary': '#FFFFFF',
        'light-on-secondary': '#FFFFFF',
        'light-surface': '#FFFFFF',
        'light-on-surface': '#182230',
        'light-surface-variant': '#F8F8F6',
        'light-outline': '#E6E8EC',
        'light-outline-variant': '#D0D5DD',
      },
      borderRadius: { sm: '6px', DEFAULT: '10px', md: '12px', lg: '14px', xl: '16px' },
      fontFamily: { headline: inter, body: inter, label: inter },
      fontSize: {
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'title-sm': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '26px' }],
        'body-md': ['14px', { lineHeight: '22px' }],
        'body-sm': ['12px', { lineHeight: '18px' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-md': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
