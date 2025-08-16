import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/auth-context';
import React from 'react';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = vi.fn();

// Test component that uses the auth context
const TestComponent = () => {
  const { user, token, login, logout, isLoading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="token">{token ? 'Has Token' : 'No Token'}</div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const AuthProviderWrapper = () => (
  <AuthProvider>
    <TestComponent />
  </AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('provides initial state', () => {
    render(<AuthProviderWrapper />);
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('token')).toHaveTextContent('No Token');
  });

  it('loads user from localStorage on mount', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockToken = 'mock-jwt-token';
    
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'auth_user') return JSON.stringify(mockUser);
      if (key === 'auth_token') return mockToken;
      return null;
    });
    
    render(<AuthProviderWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('Has Token');
    });
  });

  it('handles successful login', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'new-jwt-token',
      refreshToken: 'new-refresh-token'
    };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });
    
    render(<AuthProviderWrapper />);
    
    const loginButton = screen.getByText('Login');
    loginButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('Has Token');
    });
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'auth_user',
      JSON.stringify(mockResponse.user)
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'auth_token',
      mockResponse.token
    );
  });

  it('handles logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockToken = 'mock-jwt-token';
    
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'auth_user') return JSON.stringify(mockUser);
      if (key === 'auth_token') return mockToken;
      return null;
    });
    
    render(<AuthProviderWrapper />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
    
    const logoutButton = screen.getByText('Logout');
    logoutButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('token')).toHaveTextContent('No Token');
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
  });
});