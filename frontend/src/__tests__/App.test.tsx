import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText('Web App Template');
    expect(heading).toBeInTheDocument();
  });

  it('displays the subtitle', () => {
    render(<App />);
    const subtitle = screen.getByText(
      'A production-ready React + TypeScript + Express template'
    );
    expect(subtitle).toBeInTheDocument();
  });

  it('shows all feature checkmarks', () => {
    render(<App />);

    expect(screen.getByText('✅ TypeScript configured')).toBeInTheDocument();
    expect(screen.getByText('✅ ESLint & Prettier setup')).toBeInTheDocument();
    expect(
      screen.getByText('✅ Frontend & Backend structure')
    ).toBeInTheDocument();
    expect(screen.getByText('✅ Automated testing ready')).toBeInTheDocument();
  });
});
