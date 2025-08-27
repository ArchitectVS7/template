import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/auth-context';
import React from 'react';

// Mock the auth service
vi.mock('../lib/auth', () => ({
  authService: {
    isAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authService } from '../lib/auth';
const mockAuthService = authService as any;

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="token">{isAuthenticated ? 'Has Token' : 'No Token'}</div>
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
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.login.mockResolvedValue({});
    mockAuthService.logout.mockResolvedValue();
  });

  it('provides initial state when not authenticated', async () => {
    render(<AuthProviderWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('token')).toHaveTextContent('No Token');
  });

  it('loads user when authenticated', async () => {
    const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
    
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    render(<AuthProviderWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('Has Token');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
    
    mockAuthService.login.mockResolvedValue(mockUser);
    
    render(<AuthProviderWrapper />);
    
    const loginButton = screen.getByText('Login');
    loginButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('Has Token');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
    
    expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('handles logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
    
    // Setup initial authenticated state
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    
    render(<AuthProviderWrapper />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('token')).toHaveTextContent('Has Token');
    });
    
    const logoutButton = screen.getByText('Logout');
    logoutButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('token')).toHaveTextContent('No Token');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
    
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});