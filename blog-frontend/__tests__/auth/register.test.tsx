import React from 'react';
import { render, screen, waitFor } from '../utils/test-utils';
import RegisterPage from '@/app/(auth)/register/page';
import { authStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });
    // Reset auth store
    authStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders registration form correctly', () => {
    render(<RegisterPage />);
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('handles successful registration', async () => {
    const { user } = render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/^email$/i);
    const usernameInput = screen.getByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(emailInput, 'newuser@example.com');
    await user.type(usernameInput, 'newuser');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Test123!@#');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('validates password strength requirements', async () => {
    const { user } = render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/^email$/i);
    const usernameInput = screen.getByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'weak');
    await user.type(confirmPasswordInput, 'weak');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument();
    });
  });

  it('validates passwords match', async () => {
    const { user } = render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/^email$/i);
    const usernameInput = screen.getByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Different123!@#');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('handles optional display name field', async () => {
    const { user } = render(<RegisterPage />);
    
    const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;

    await user.type(displayNameInput, 'Test User');

    expect(displayNameInput.value).toBe('Test User');
  });

  it('validates username format', () => {
    render(<RegisterPage />);
    
    const usernameInput = screen.getByLabelText(/^username$/i) as HTMLInputElement;
    
    expect(usernameInput).toHaveAttribute('pattern', '^[a-zA-Z0-9_-]+$');
    expect(usernameInput).toHaveAttribute('title', 'Username can only contain letters, numbers, underscores, and hyphens');
  });

  it('disables submit button while loading', async () => {
    const { user } = render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/^email$/i);
    const usernameInput = screen.getByLabelText(/^username$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Test123!@#');
    
    // Set loading state
    authStore.setState({ isLoading: true });
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/creating account/i);
    });
  });

  it('displays error from auth store', () => {
    authStore.setState({ error: 'Username already exists' });
    
    render(<RegisterPage />);
    
    expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
  });

  it('navigates to login page when clicking sign in link', () => {
    render(<RegisterPage />);
    
    const loginLink = screen.getByText(/sign in/i);
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('displays terms of service and privacy policy links', () => {
    render(<RegisterPage />);
    
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
  });

  it('clears validation errors when form is corrected', async () => {
    const { user } = render(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    // First submission with mismatched passwords
    await user.type(passwordInput, 'Test123!@#');
    await user.type(confirmPasswordInput, 'Different123!@#');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    // Clear and re-enter matching passwords
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, 'Test123!@#');
    
    // Fill other required fields
    const emailInput = screen.getByLabelText(/^email$/i);
    const usernameInput = screen.getByLabelText(/^username$/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(usernameInput, 'testuser');
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
  });

  it('shows password requirements hint text', () => {
    render(<RegisterPage />);
    
    expect(screen.getByText(/must be at least 8 characters with uppercase, lowercase, number, and special character/i)).toBeInTheDocument();
  });
});