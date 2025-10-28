/**
 * Test Data Fixtures
 *
 * Contains reusable test data for e2e tests
 */

export const testWorkspace = {
  name: 'Test Workspace',
  description: 'A workspace created for testing purposes',
  tags: ['test', 'e2e'],
};

export const testService = {
  name: 'Test Service',
  repoPath: process.cwd(),
  command: 'node server.js',
  port: 8080,
};

export const testEnvProfile = {
  name: 'Test Environment',
  description: 'Test environment profile',
};

export const testEnvVariables = [
  {
    key: 'DATABASE_URL',
    value: 'postgresql://localhost:5432/testdb',
    isSecret: false,
    description: 'Database connection string',
  },
  {
    key: 'API_KEY',
    value: 'super-secret-key-12345',
    isSecret: true,
    description: 'API authentication key',
  },
];

export const testNote = {
  title: 'Test Note',
  content: '# Test Note\n\nThis is a test note with some [[linked-note]] content.',
  category: 'Testing',
  tags: ['test', 'e2e', 'documentation'],
  template: 'Architecture',
};

export const testDockerImage = {
  repository: 'test-app',
  tag: 'latest',
  dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`,
};

export const testSnapshot = {
  name: 'Test Snapshot',
  description: 'Snapshot created during e2e testing',
};

// Helper to generate unique names to avoid conflicts
export const uniqueName = (base: string): string => {
  return `${base}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

// Sample git repository paths (these should exist in test environment)
// Using process.cwd() to get current working directory dynamically
export const sampleRepos = [
  process.cwd(),
  '/tmp/test-repos/repo1',
  '/tmp/test-repos/repo2',
];
