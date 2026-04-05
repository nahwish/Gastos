import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '@/database/client';

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

// Simple hash function para desarrollo (en producción usar bcrypt)
const hashPassword = async (password: string): Promise<string> => {
  // Para desarrollo, usamos una versión consistente del hash
  // Basado en base64 + checksum simple
  // btoa() es compatible con navegadores y React Native (a diferencia de Buffer, que es exclusivo de Node.js)
  const encoded = btoa(unescape(encodeURIComponent(password)));
  let checksum = 0;
  for (let i = 0; i < password.length; i++) {
    checksum += password.charCodeAt(i);
  }
  return `${encoded}:${checksum}`;
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const [encoded, originalChecksum] = hash.split(':');
    const newHash = await hashPassword(password);
    const [newEncoded, newChecksum] = newHash.split(':');
    return encoded === newEncoded && originalChecksum === newChecksum;
  } catch (error) {
    return false;
  }
};

export const register = async (
  username: string,
  email: string,
  password: string,
): Promise<User | null> => {
  try {
    // Validar que no exista usuario
    const existingUser = await db.getFirstAsync(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email],
    );

    if (existingUser) {
      throw new Error('El usuario o email ya existe');
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.runAsync(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
    );

    const newUser = await db.getFirstAsync(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [result.lastInsertRowId],
    );

    return newUser;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    const user = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Guardar sesión
    await AsyncStorage.setItem('currentUserId', user.id.toString());
    await AsyncStorage.setItem(
      'currentUser',
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      }),
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('currentUserId');
    await AsyncStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (currentUser) {
      return JSON.parse(currentUser);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getCurrentUserId = async (): Promise<number | null> => {
  try {
    const userId = await AsyncStorage.getItem('currentUserId');
    return userId ? parseInt(userId) : null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};
