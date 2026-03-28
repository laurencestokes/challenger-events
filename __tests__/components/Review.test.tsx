import React from 'react';
import { render, screen } from '@testing-library/react';
import Review from '../../components/Review';

describe('Review', () => {
  const defaultProps = {
    rating: 4,
    title: 'Great event!',
    content: 'Really enjoyed the competition.',
    author: 'Jane Smith',
    designation: 'Competitor',
  };

  it('renders title and content', () => {
    render(<Review {...defaultProps} />);
    expect(screen.getByText('Great event!')).toBeInTheDocument();
    expect(screen.getByText('Really enjoyed the competition.')).toBeInTheDocument();
  });

  it('renders author and designation', () => {
    render(<Review {...defaultProps} />);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Competitor')).toBeInTheDocument();
  });

  it('renders 5 star icons', () => {
    const { container } = render(<Review {...defaultProps} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('fills correct number of stars based on rating', () => {
    const { container } = render(<Review {...defaultProps} rating={3} />);
    const filledStars = container.querySelectorAll('.text-green-500');
    const emptyStars = container.querySelectorAll('.text-gray-300');
    expect(filledStars).toHaveLength(3);
    expect(emptyStars).toHaveLength(2);
  });

  it('fills all stars for rating 5', () => {
    const { container } = render(<Review {...defaultProps} rating={5} />);
    const filledStars = container.querySelectorAll('.text-green-500');
    expect(filledStars).toHaveLength(5);
  });

  it('fills no stars for rating 0', () => {
    const { container } = render(<Review {...defaultProps} rating={0} />);
    const emptyStars = container.querySelectorAll('.text-gray-300');
    expect(emptyStars).toHaveLength(5);
  });
});
