// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    withTransactionAsync: jest.fn((cb) => cb()),
  })),
}));

// Mock React Native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj) => obj.web ?? obj.default,
  },
  Share: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  },
  Alert: {
    alert: jest.fn(),
  },
}));
