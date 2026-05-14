module.exports = {
  plugins: ['@firebase/security-rules'],
  overrides: [
    {
      files: ['*.rules'],
      rules: {
        '@firebase/security-rules/no-unprotected-rules': 'error',
      },
    },
  ],
};
