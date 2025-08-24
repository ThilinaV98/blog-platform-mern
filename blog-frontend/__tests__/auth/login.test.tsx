import React from 'react';
import { render, screen, waitFor } from '../utils/test-utils';
import LoginPage from '@/app/(auth)/login/page';
import { authStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('LoginPage', () => {
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

  it('renders login form correctly', () => {
    render(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });

  it('handles form submission with valid credentials', async () => {
    const { user } = render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Test123!@#');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message for invalid credentials', async () => {
    const { user } = render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      const errorElement = screen.queryByText(/invalid credentials/i);
      expect(errorElement).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    const { user } = render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Test123!@#');
    
    // Set loading state
    authStore.setState({ isLoading: true });
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/signing in/i);
    });
  });

  it('handles form field changes correctly', async () => {
    const { user } = render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email or username/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;

    await user.type(emailInput, 'testuser');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  it('navigates to register page when clicking create account link', async () => {
    render(<LoginPage />);
    
    const registerLink = screen.getByText(/create a new account/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('navigates to forgot password page when clicking forgot password link', async () => {
    render(<LoginPage />);
    
    const forgotPasswordLink = screen.getByText(/forgot your password/i);
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('displays existing error from auth store', () => {
    authStore.setState({ error: 'Session expired' });
    
    render(<LoginPage />);
    
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
  });

  it('handles remember me checkbox', async () => {
    const { user } = render(<LoginPage />);
    
    const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
    
    expect(rememberCheckbox.checked).toBe(false);
    
    await user.click(rememberCheckbox);
    
    expect(rememberCheckbox.checked).toBe(true);
  });
});