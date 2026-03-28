import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/Card';

describe('Card components', () => {
  describe('Card', () => {
    it('renders children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies base classes', () => {
      render(<Card>Content</Card>);
      const card = screen.getByText('Content');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('border');
    });

    it('merges custom className', () => {
      render(<Card className="my-card">Content</Card>);
      expect(screen.getByText('Content').className).toContain('my-card');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('renders children', () => {
      render(<CardHeader>Header</CardHeader>);
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('applies padding classes', () => {
      render(<CardHeader>Header</CardHeader>);
      expect(screen.getByText('Header').className).toContain('p-6');
    });
  });

  describe('CardContent', () => {
    it('renders children', () => {
      render(<CardContent>Body</CardContent>);
      expect(screen.getByText('Body')).toBeInTheDocument();
    });

    it('applies padding classes', () => {
      render(<CardContent>Body</CardContent>);
      expect(screen.getByText('Body').className).toContain('p-6');
    });
  });

  describe('CardFooter', () => {
    it('renders children', () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('applies flex layout', () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText('Footer').className).toContain('flex');
    });
  });

  it('composes full card structure', () => {
    render(
      <Card>
        <CardHeader>Title</CardHeader>
        <CardContent>Body text</CardContent>
        <CardFooter>Actions</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
