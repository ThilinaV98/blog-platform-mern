import { test, expect } from '../fixtures/test';
import { testUsers, loginUser, generateProfile } from '../helpers/test-data';
import path from 'path';

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user before each test
    await loginUser(page, testUsers.author);
  });

  test.describe('Profile Updates', () => {
    test('should update display name and bio', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      const newProfile = generateProfile();
      
      // Update display name
      await page.getByLabel(/display name/i).clear();
      await page.getByLabel(/display name/i).fill(newProfile.displayName);
      
      // Update bio
      await page.getByLabel(/bio/i).clear();
      await page.getByLabel(/bio/i).fill(newProfile.bio);
      
      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      
      // Should show success message
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      
      // Reload to verify persistence
      await page.reload();
      
      // Values should be saved
      await expect(page.getByLabel(/display name/i)).toHaveValue(newProfile.displayName);
      await expect(page.getByLabel(/bio/i)).toHaveValue(newProfile.bio);
    });

    test('should update website and location', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      const profile = generateProfile();
      
      // Update website
      await page.getByPlaceholder('example.com').clear();
      await page.getByPlaceholder('example.com').fill(profile.website.replace(/^https?:\/\//, ''));
      
      // Update location
      await page.getByLabel(/location/i).clear();
      await page.getByLabel(/location/i).fill(profile.location);
      
      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
    });

    test('should validate bio character limit', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Try to enter more than 500 characters
      const longBio = 'a'.repeat(501);
      await page.getByLabel(/bio/i).fill(longBio);
      
      // Should show character count
      await expect(page.getByText('500/500')).toBeVisible();
      
      // Should truncate to 500 characters
      const bioValue = await page.getByLabel(/bio/i).inputValue();
      expect(bioValue.length).toBe(500);
    });

    test('should update social links', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      const profile = generateProfile();
      
      // Update Twitter
      await page.getByLabel(/twitter/i).clear();
      await page.getByLabel(/twitter/i).fill(profile.socialLinks.twitter);
      
      // Update GitHub
      await page.getByLabel(/github/i).clear();
      await page.getByLabel(/github/i).fill(profile.socialLinks.github);
      
      // Update LinkedIn
      await page.getByLabel(/linkedin/i).clear();
      await page.getByLabel(/linkedin/i).fill(profile.socialLinks.linkedin);
      
      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      
      // Verify links are formatted correctly
      await page.reload();
      
      // Should show usernames without full URLs
      await expect(page.getByLabel(/twitter/i)).toHaveValue(profile.socialLinks.twitter);
      await expect(page.getByLabel(/github/i)).toHaveValue(profile.socialLinks.github);
      await expect(page.getByLabel(/linkedin/i)).toHaveValue(profile.socialLinks.linkedin);
    });

    test('should handle social links with full URLs', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Enter full URLs
      await page.getByLabel(/twitter/i).fill('https://twitter.com/testuser');
      await page.getByLabel(/github/i).fill('https://github.com/testuser');
      
      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      
      // Reload
      await page.reload();
      
      // Should extract and show just the username
      await expect(page.getByLabel(/twitter/i)).toHaveValue('testuser');
      await expect(page.getByLabel(/github/i)).toHaveValue('testuser');
    });
  });

  test.describe('Avatar Upload', () => {
    test('should upload avatar image', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Create test image path
      const imagePath = path.join(__dirname, '..', 'fixtures', 'avatar.jpg');
      
      // Upload avatar
      await page.getByLabel(/avatar/i).setInputFiles(imagePath);
      
      // Should show preview
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();
      
      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      
      await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible();
      
      // Avatar should be visible in header
      await expect(page.locator('[data-testid="user-avatar"]')).toHaveAttribute('src', /uploads\/avatars/);
    });

    test('should validate image size', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Try to upload large image (mock large file)
      const largeImagePath = path.join(__dirname, '..', 'fixtures', 'large-image.jpg');
      
      await page.getByLabel(/avatar/i).setInputFiles(largeImagePath);
      
      // Should show error
      await expect(page.getByText(/file size must be less than 5MB/i)).toBeVisible();
    });

    test('should validate image format', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Try to upload non-image file
      const textFilePath = path.join(__dirname, '..', 'fixtures', 'test.txt');
      
      await page.getByLabel(/avatar/i).setInputFiles(textFilePath);
      
      // Should show error
      await expect(page.getByText(/only image files are allowed/i)).toBeVisible();
    });

    test('should crop avatar image', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      const imagePath = path.join(__dirname, '..', 'fixtures', 'avatar.jpg');
      await page.getByLabel(/avatar/i).setInputFiles(imagePath);
      
      // Should show crop dialog
      const cropDialog = page.locator('[data-testid="crop-dialog"]');
      await expect(cropDialog).toBeVisible();
      
      // Adjust crop area
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();
      
      // Apply crop
      await cropDialog.getByRole('button', { name: /apply/i }).click();
      
      // Should show cropped preview
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();
    });

    test('should remove avatar', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Upload avatar first
      const imagePath = path.join(__dirname, '..', 'fixtures', 'avatar.jpg');
      await page.getByLabel(/avatar/i).setInputFiles(imagePath);
      await page.getByRole('button', { name: /save changes/i }).click();
      
      // Remove avatar
      await page.getByRole('button', { name: /remove avatar/i }).click();
      
      // Confirm removal
      await page.getByRole('button', { name: /confirm/i }).click();
      
      await expect(page.getByText(/avatar removed/i)).toBeVisible();
      
      // Should show default avatar
      await expect(page.locator('[data-testid="user-avatar"]')).toHaveAttribute('src', /default-avatar/);
    });
  });

  test.describe('Password Change', () => {
    test('should change password successfully', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Enter current password
      await page.getByLabel(/current password/i).fill(testUsers.author.password);
      
      // Enter new password
      const newPassword = 'NewPassword123!@#';
      await page.getByLabel(/^new password$/i).fill(newPassword);
      await page.getByLabel(/confirm new password/i).fill(newPassword);
      
      // Save changes
      await page.getByRole('button', { name: /change password/i }).click();
      
      await expect(page.getByText(/password changed successfully/i)).toBeVisible();
      
      // Logout
      await page.getByRole('button', { name: /user menu/i }).click();
      await page.getByRole('menuitem', { name: /logout/i }).click();
      
      // Try to login with new password
      await page.goto('/login');
      await page.getByLabel(/email or username/i).fill(testUsers.author.email);
      await page.getByLabel(/^password$/i).fill(newPassword);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should login successfully
      await expect(page).toHaveURL('/dashboard');
    });

    test('should validate current password', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Enter wrong current password
      await page.getByLabel(/current password/i).fill('WrongPassword123!');
      await page.getByLabel(/^new password$/i).fill('NewPassword123!@#');
      await page.getByLabel(/confirm new password/i).fill('NewPassword123!@#');
      
      await page.getByRole('button', { name: /change password/i }).click();
      
      // Should show error
      await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
    });

    test('should validate new password strength', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      await page.getByLabel(/current password/i).fill(testUsers.author.password);
      await page.getByLabel(/^new password$/i).fill('weak');
      await page.getByLabel(/confirm new password/i).fill('weak');
      
      await page.getByRole('button', { name: /change password/i }).click();
      
      // Should show password requirements
      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      await page.getByLabel(/current password/i).fill(testUsers.author.password);
      await page.getByLabel(/^new password$/i).fill('NewPassword123!@#');
      await page.getByLabel(/confirm new password/i).fill('DifferentPassword123!@#');
      
      await page.getByRole('button', { name: /change password/i }).click();
      
      // Should show error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should not allow reusing current password', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      await page.getByLabel(/current password/i).fill(testUsers.author.password);
      await page.getByLabel(/^new password$/i).fill(testUsers.author.password);
      await page.getByLabel(/confirm new password/i).fill(testUsers.author.password);
      
      await page.getByRole('button', { name: /change password/i }).click();
      
      // Should show error
      await expect(page.getByText(/new password must be different/i)).toBeVisible();
    });
  });

  test.describe('Account Settings', () => {
    test('should update email preferences', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Update email preferences
      await page.getByLabel(/newsletter/i).check();
      await page.getByLabel(/comment notifications/i).uncheck();
      await page.getByLabel(/follow notifications/i).check();
      
      // Save changes
      await page.getByRole('button', { name: /save preferences/i }).click();
      
      await expect(page.getByText(/preferences updated/i)).toBeVisible();
      
      // Reload to verify
      await page.reload();
      
      await expect(page.getByLabel(/newsletter/i)).toBeChecked();
      await expect(page.getByLabel(/comment notifications/i)).not.toBeChecked();
      await expect(page.getByLabel(/follow notifications/i)).toBeChecked();
    });

    test('should update privacy settings', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Make profile private
      await page.getByLabel(/private profile/i).check();
      
      // Hide email from public
      await page.getByLabel(/show email publicly/i).uncheck();
      
      // Save changes
      await page.getByRole('button', { name: /save privacy settings/i }).click();
      
      await expect(page.getByText(/privacy settings updated/i)).toBeVisible();
    });

    test('should export account data', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Request data export
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /export my data/i }).click();
      
      // Confirm export
      await page.getByRole('button', { name: /confirm export/i }).click();
      
      // Should download file
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('account-data');
      expect(download.suggestedFilename()).toContain('.json');
    });

    test('should delete account', async ({ page }) => {
      await page.goto('/dashboard/settings/account');
      
      // Click delete account
      await page.getByRole('button', { name: /delete account/i }).click();
      
      // Should show confirmation dialog
      const dialog = page.locator('[data-testid="delete-account-dialog"]');
      await expect(dialog).toBeVisible();
      
      // Type confirmation
      await dialog.getByPlaceholder(/type DELETE to confirm/i).fill('DELETE');
      
      // Enter password
      await dialog.getByLabel(/password/i).fill(testUsers.author.password);
      
      // Confirm deletion
      await dialog.getByRole('button', { name: /permanently delete/i }).click();
      
      // Should redirect to homepage
      await expect(page).toHaveURL('/');
      
      // Should show confirmation message
      await expect(page.getByText(/account deleted/i)).toBeVisible();
      
      // Should not be able to login
      await page.goto('/login');
      await page.getByLabel(/email or username/i).fill(testUsers.author.email);
      await page.getByLabel(/^password$/i).fill(testUsers.author.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });
  });

  test.describe('Public Profile View', () => {
    test('should view own public profile', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      
      // Click view public profile
      await page.getByRole('link', { name: /view public profile/i }).click();
      
      // Should open in new tab
      const [profilePage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.getByRole('link', { name: /view public profile/i }).click(),
      ]);
      
      // Should show public profile
      await expect(profilePage).toHaveURL(/\/profile\/.+/);
      await expect(profilePage.getByRole('heading', { level: 1 })).toHaveText(testUsers.author.displayName);
      
      // Should show posts by author
      await expect(profilePage.locator('[data-testid="author-posts"]')).toBeVisible();
      
      await profilePage.close();
    });

    test('should show correct stats on profile', async ({ page }) => {
      await page.goto(`/profile/${testUsers.author.username}`);
      
      // Should show stats
      const stats = page.locator('[data-testid="author-stats"]');
      await expect(stats).toBeVisible();
      
      // Should have post count
      await expect(stats.locator('[data-testid="post-count"]')).toBeVisible();
      
      // Should have follower count
      await expect(stats.locator('[data-testid="follower-count"]')).toBeVisible();
      
      // Should have following count
      await expect(stats.locator('[data-testid="following-count"]')).toBeVisible();
    });

    test('should respect privacy settings', async ({ page }) => {
      // First, set profile to private
      await page.goto('/dashboard/settings/account');
      await page.getByLabel(/private profile/i).check();
      await page.getByRole('button', { name: /save privacy settings/i }).click();
      
      // Logout
      await page.getByRole('button', { name: /user menu/i }).click();
      await page.getByRole('menuitem', { name: /logout/i }).click();
      
      // Try to view profile as guest
      await page.goto(`/profile/${testUsers.author.username}`);
      
      // Should show private message
      await expect(page.getByText(/this profile is private/i)).toBeVisible();
      
      // Should not show posts
      await expect(page.locator('[data-testid="author-posts"]')).not.toBeVisible();
    });
  });
});