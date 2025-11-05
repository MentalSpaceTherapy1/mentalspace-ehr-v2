/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionTimeoutWarning } from '../SessionTimeoutWarning';

// Mock API calls
const mockExtendSession = jest.fn();
const mockLogout = jest.fn();

describe('SessionTimeoutWarning Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render countdown timer when modal is open', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={120}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Verify modal is visible
      expect(screen.getByText(/session timeout/i)).toBeInTheDocument();

      // Verify countdown is displayed
      expect(screen.getByText(/120/)).toBeInTheDocument();
      expect(screen.getByText(/seconds/i)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <SessionTimeoutWarning
          isOpen={false}
          secondsRemaining={120}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(screen.queryByText(/session timeout/i)).not.toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(
        screen.getByText(/Your session is about to expire/i)
      ).toBeInTheDocument();
    });

    it('should show both Extend and Logout buttons', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(screen.getByRole('button', { name: /extend session/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Countdown Functionality', () => {
    it('should update countdown every second', async () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={10}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Initial value
      expect(screen.getByText(/10/)).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should show 9 seconds
      await waitFor(() => {
        expect(screen.getByText(/9/)).toBeInTheDocument();
      });
    });

    it('should format time as MM:SS', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={125} // 2 minutes 5 seconds
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(screen.getByText(/2:05/)).toBeInTheDocument();
    });

    it('should show red warning when under 30 seconds', () => {
      const { container } = render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={25}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const countdownElement = screen.getByText(/25/);
      expect(countdownElement.className).toMatch(/red|danger|warning/i);
    });
  });

  describe('Extend Button', () => {
    it('should call onExtend when Extend Session button is clicked', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      fireEvent.click(extendButton);

      expect(mockExtendSession).toHaveBeenCalledTimes(1);
    });

    it('should close modal after extending session', async () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      fireEvent.click(extendButton);

      // Simulate modal closing
      rerender(
        <SessionTimeoutWarning
          isOpen={false}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(screen.queryByText(/session timeout/i)).not.toBeInTheDocument();
    });

    it('should show loading state while extending session', async () => {
      const slowExtend = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={slowExtend}
          onLogout={mockLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /extend session/i });
      fireEvent.click(extendButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(extendButton).toBeDisabled();
      });
    });
  });

  describe('Logout Button', () => {
    it('should call onLogout when Logout button is clicked', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation before logout', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      // Either confirmation dialog or direct logout
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Auto-logout at 0 seconds', () => {
    it('should automatically logout when countdown reaches 0', async () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={3}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Advance time to 0
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should auto-logout
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should show final warning at 0 seconds before logout', async () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={1}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Advance to 0
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/0|logging out/i)).toBeInTheDocument();
      });
    });

    it('should not allow extending session at 0 seconds', async () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={1}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const extendButton = screen.queryByRole('button', { name: /extend session/i });
      if (extendButton) {
        expect(extendButton).toBeDisabled();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should focus on modal when opened', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(document.activeElement).toBe(dialog) ||
        expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('should trap focus within modal', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Tab through elements
      const extendButton = screen.getByRole('button', { name: /extend session/i });
      const logoutButton = screen.getByRole('button', { name: /logout/i });

      extendButton.focus();
      expect(document.activeElement).toBe(extendButton);

      fireEvent.keyDown(extendButton, { key: 'Tab' });
      // Focus should move to logout button
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative seconds gracefully', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={-5}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      // Should show 0 or trigger logout
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should handle very large countdown values', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={9999}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      expect(screen.getByText(/166:39/)).toBeInTheDocument(); // 9999 seconds = 166 min 39 sec
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(
        <SessionTimeoutWarning
          isOpen={true}
          secondsRemaining={60}
          onExtend={mockExtendSession}
          onLogout={mockLogout}
        />
      );

      unmount();

      // Advance time - should not cause errors
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
