import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('App Component', () => {
  it('renders Hello World heading', () => {
    render(<App />);
    const heading = screen.getByText('Hello World');
    expect(heading).toBeInTheDocument();
  });

  it('displays the welcome message', () => {
    render(<App />);
    const subtitle = screen.getByText('Welcome to the Web App Template');
    expect(subtitle).toBeInTheDocument();
  });
});
