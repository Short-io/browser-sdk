export const preset = 'ts-jest';
export const testEnvironment = 'jsdom';
export const roots = ['<rootDir>/src'];
export const testMatch = ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'];
export const transform = {
  '^.+\\.ts$': 'ts-jest',
};
export const collectCoverageFrom = [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/index.ts'
];
export const coverageDirectory = 'coverage';
export const coverageReporters = ['text', 'lcov', 'html'];
