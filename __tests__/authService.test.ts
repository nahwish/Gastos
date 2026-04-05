import { register, login, logout, getCurrentUser, getCurrentUserId } from '@/database/repositories/userRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock del módulo de db
jest.mock('@/database/client', () => ({
  __esModule: true,
  default: {
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    execAsync: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();
  });

  describe('register', () => {
    it('debería registrar un nuevo usuario correctamente', async () => {
      const db = require('@/database/client').default;
      
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null); // No existe usuario
      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      });

      const result = await register('testuser', 'test@example.com', 'password123');

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        expect.arrayContaining(['testuser', 'test@example.com'])
      );
    });

    it('debería rechazar si el usuario ya existe', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'existing',
      });

      await expect(register('existing', 'existing@example.com', 'password')).rejects.toThrow(
        'El usuario o email ya existe'
      );
    });

    it('debería rechazar si email ya existe', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 1,
        email: 'existing@example.com',
      });

      await expect(register('newuser', 'existing@example.com', 'password')).rejects.toThrow(
        'El usuario o email ya existe'
      );
    });
  });

  describe('login', () => {
    it('debería loguear usuario con credenciales correctas', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'cGFzc3dvcmQ=:883', // Hash generado por hashPassword('password')
        created_at: '2024-01-01T00:00:00Z',
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await login('test@example.com', 'password');

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('currentUserId', '1');
    });

    it('debería rechazar con email incorrecto', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      await expect(login('nonexistent@example.com', 'password')).rejects.toThrow(
        'Usuario o contraseña incorrectos'
      );
    });

    it('debería rechazar con contraseña incorrecta', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        created_at: '2024-01-01T00:00:00Z',
      });

      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Usuario o contraseña incorrectos'
      );
    });
  });

  describe('logout', () => {
    it('debería eliminar la sesión correctamente', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('currentUserId');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('currentUser');
    });
  });

  describe('getCurrentUser', () => {
    it('debería retornar el usuario actual', async () => {
      const user = { id: 1, username: 'testuser', email: 'test@example.com' };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(user));

      const result = await getCurrentUser();

      expect(result).toEqual(user);
    });

    it('debería retornar null si no hay usuario', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUserId', () => {
    it('debería retornar el ID del usuario actual', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1');

      const result = await getCurrentUserId();

      expect(result).toBe(1);
    });

    it('debería retornar null si no hay usuario', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getCurrentUserId();

      expect(result).toBeNull();
    });
  });
});
