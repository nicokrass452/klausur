import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { useAppStore } from '../store/useAppStore';
import { Routes, Route } from 'react-router-dom';

// Mock the store
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

describe('AuthGuard', () => {
  it('renders children when user is authenticated', () => {
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: true, authReady: true };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders nothing when auth is not ready', () => {
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false, authReady: false };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to signup when user is not authenticated and authReady is true', () => {
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false, authReady: true };
      return selector(state);
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/signup" element={<div>Signup Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Signup Page')).toBeInTheDocument();
  });
});
