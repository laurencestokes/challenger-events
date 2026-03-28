const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@constants/(.*)$': '<rootDir>/constants/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/contexts/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/utils.ts',
    'lib/api-client.ts',
    'lib/score-totals.ts',
    'utils/**/*.{js,jsx,ts,tsx}',
    'constants/**/*.{js,jsx,ts,tsx}',
    '!constants/liftingStandards.ts',
    '!components/ErgSpeedometer.tsx',
    '!components/ScoreCalculator.tsx',
    '!components/ui/index.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 65,
      lines: 72,
      statements: 72,
    },
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/__tests__/helpers/',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
