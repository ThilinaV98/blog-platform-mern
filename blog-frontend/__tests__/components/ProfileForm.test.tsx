import React from 'react';
import { render, screen, waitFor } from '../utils/test-utils';
import ProfileForm from '@/components/profile/ProfileForm';
import { UpdateProfileDto } from '@/lib/api/users';

describe('ProfileForm', () => {
  const mockOnSubmit = jest.fn();
  
  const initialData: UpdateProfileDto = {
    displayName: 'John Doe',
    bio: 'Software developer',
    website: 'https://example.com',
    location: 'San Francisco, CA',
    socialLinks: {
      twitter: 'https://twitter.com/johndoe',
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields with initial data', () => {
    render(<ProfileForm initialData={initialData} onSubmit={mockOnSubmit} />);
    
    // Personal Information
    expect(screen.getByLabelText(/display name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Software developer');
    expect(screen.getByDisplayValue('example.com')).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toHaveValue('San Francisco, CA');
    
    // Social Links (should show usernames, not full URLs)
    expect(screen.getByLabelText(/twitter/i)).toHaveValue('johndoe');
    expect(screen.getByLabelText(/github/i)).toHaveValue('johndoe');
    expect(screen.getByLabelText(/linkedin/i)).toHaveValue('johndoe');
  });

  it('handles form submission with updated data', async () => {
    const { user } = render(<ProfileForm initialData={initialData} onSubmit={mockOnSubmit} />);
    
    const displayNameInput = screen.getByLabelText(/display name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const submitButton = screen.getByRole('button', { name: /save changes/i });

    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Jane Smith');
    
    await user.clear(bioInput);
    await user.type(bioInput, 'Full-stack developer');
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        displayName: 'Jane Smith',
        bio: 'Full-stack developer',
        website: 'https://example.com',
        location: 'San Francisco, CA',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
          linkedin: 'https://linkedin.com/in/johndoe',
        },
      });
    });
  });

  it('handles social links as usernames and converts to full URLs', async () => {
    const { user } = render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const twitterInput = screen.getByLabelText(/twitter/i);
    const githubInput = screen.getByLabelText(/github/i);
    const linkedinInput = screen.getByLabelText(/linkedin/i);
    const submitButton = screen.getByRole('button', { name: /save changes/i });

    await user.type(twitterInput, 'newuser');
    await user.type(githubInput, 'devuser');
    await user.type(linkedinInput, 'prouser');
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          socialLinks: {
            twitter: 'https://twitter.com/newuser',
            github: 'https://github.com/devuser',
            linkedin: 'https://linkedin.com/in/prouser',
          },
        })
      );
    });
  });

  it('handles website URL formatting', async () => {
    const { user } = render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const websiteInput = screen.getByPlaceholderText('example.com');
    const submitButton = screen.getByRole('button', { name: /save changes/i });

    await user.type(websiteInput, 'mysite.com');
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          website: 'https://mysite.com',
        })
      );
    });
  });

  it('displays character count for bio field', async () => {
    const { user } = render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const bioInput = screen.getByLabelText(/bio/i);
    
    expect(screen.getByText('0/500')).toBeInTheDocument();
    
    await user.type(bioInput, 'This is my bio');
    
    expect(screen.getByText('14/500')).toBeInTheDocument();
  });

  it('disables form fields and shows loading state when loading prop is true', () => {
    render(<ProfileForm initialData={initialData} onSubmit={mockOnSubmit} loading={true} />);
    
    const displayNameInput = screen.getByLabelText(/display name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const submitButton = screen.getByRole('button', { name: /saving/i });

    expect(displayNameInput).toBeDisabled();
    expect(bioInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Saving...');
  });

  it('extracts username from full social media URLs', () => {
    const dataWithFullUrls: UpdateProfileDto = {
      socialLinks: {
        twitter: 'https://twitter.com/twitteruser',
        github: 'https://github.com/githubuser',
        linkedin: 'https://linkedin.com/in/linkedinuser',
      },
    };
    
    render(<ProfileForm initialData={dataWithFullUrls} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/twitter/i)).toHaveValue('twitteruser');
    expect(screen.getByLabelText(/github/i)).toHaveValue('githubuser');
    expect(screen.getByLabelText(/linkedin/i)).toHaveValue('linkedinuser');
  });

  it('handles empty initial data gracefully', () => {
    render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/display name/i)).toHaveValue('');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('');
    expect(screen.getByPlaceholderText('example.com')).toHaveValue('');
    expect(screen.getByLabelText(/location/i)).toHaveValue('');
    expect(screen.getByLabelText(/twitter/i)).toHaveValue('');
    expect(screen.getByLabelText(/github/i)).toHaveValue('');
    expect(screen.getByLabelText(/linkedin/i)).toHaveValue('');
  });

  it('respects maxLength attributes on input fields', () => {
    render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const displayNameInput = screen.getByLabelText(/display name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const locationInput = screen.getByLabelText(/location/i);

    expect(displayNameInput).toHaveAttribute('maxLength', '50');
    expect(bioInput).toHaveAttribute('maxLength', '500');
    expect(locationInput).toHaveAttribute('maxLength', '100');
  });

  it('displays helpful placeholder texts', () => {
    render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tell us about yourself/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('San Francisco, CA')).toBeInTheDocument();
  });

  it('displays helper text for fields', () => {
    render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText(/this is how your name will appear across the platform/i)).toBeInTheDocument();
    expect(screen.getByText(/share your city and country to connect with local readers/i)).toBeInTheDocument();
  });

  it('handles null social links gracefully', () => {
    const dataWithNullSocial: UpdateProfileDto = {
      displayName: 'Test User',
      socialLinks: null as any,
    };
    
    render(<ProfileForm initialData={dataWithNullSocial} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/twitter/i)).toHaveValue('');
    expect(screen.getByLabelText(/github/i)).toHaveValue('');
    expect(screen.getByLabelText(/linkedin/i)).toHaveValue('');
  });

  it('handles form field changes correctly', async () => {
    const { user } = render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const displayNameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    const bioInput = screen.getByLabelText(/bio/i) as HTMLTextAreaElement;
    const locationInput = screen.getByLabelText(/location/i) as HTMLInputElement;

    await user.type(displayNameInput, 'New Name');
    await user.type(bioInput, 'New bio text');
    await user.type(locationInput, 'New York, NY');

    expect(displayNameInput.value).toBe('New Name');
    expect(bioInput.value).toBe('New bio text');
    expect(locationInput.value).toBe('New York, NY');
  });

  it('preserves full URLs if already provided in social links', async () => {
    const { user } = render(<ProfileForm initialData={{}} onSubmit={mockOnSubmit} />);
    
    const twitterInput = screen.getByLabelText(/twitter/i);
    const submitButton = screen.getByRole('button', { name: /save changes/i });

    // Type a full URL
    await user.type(twitterInput, 'https://twitter.com/fullurl');
    
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          socialLinks: expect.objectContaining({
            twitter: 'https://twitter.com/fullurl',
          }),
        })
      );
    });
  });
});