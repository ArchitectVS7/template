import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from '../components/auth/login-form';
import { AuthProvider } from '../contexts/auth-context';

// Mock the auth context
const mockLogin = vi.fn();
const mockAuthContext = {
  user: null,
  token: null,
  login: mockLogin,
  logout: vi.fn(),
  isLoading: false,
};

vi.mock('../contexts/auth-context', async () => {
  const actual = await vi.importActual('../contexts/auth-context');
  return {
    ...actual,
    useAuth: () => mockAuthContext,
  };
});

const LoginFormWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <LoginForm onSubmit={mockLogin} isLoading={mockAuthContext.isLoading} />
    </AuthProvider>
  </BrowserRouter>
);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form fields', () => {
    render(<LoginFormWrapper />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submits with empty fields (HTML5 validation)', async () => {
    const user = userEvent.setup();
    render(<LoginFormWrapper />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    // The HTML5 required attribute should prevent submission
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    render(<LoginFormWrapper />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows loading state during submission', () => {
    
    const LoadingWrapper = () => (
      <BrowserRouter>
        <AuthProvider>
          <LoginForm onSubmit={mockLogin} isLoading={true} />
        </AuthProvider>
      </BrowserRouter>
    );
    
    render(<LoadingWrapper />);
    
    const submitButton = screen.getByRole('button', { name: /signing in/i });
    
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});