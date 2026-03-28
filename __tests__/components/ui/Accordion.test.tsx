import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Accordion from '../../../components/ui/Accordion';

const sections = [
  { id: 'sec1', title: 'Section One', content: <p>Content one</p> },
  { id: 'sec2', title: 'Section Two', content: <p>Content two</p> },
  { id: 'sec3', title: 'Section Three', content: <p>Content three</p> },
];

describe('Accordion', () => {
  it('renders all section titles', () => {
    render(<Accordion sections={sections} />);
    expect(screen.getByText('Section One')).toBeInTheDocument();
    expect(screen.getByText('Section Two')).toBeInTheDocument();
    expect(screen.getByText('Section Three')).toBeInTheDocument();
  });

  it('no content visible by default', () => {
    render(<Accordion sections={sections} />);
    expect(screen.queryByText('Content one')).not.toBeInTheDocument();
    expect(screen.queryByText('Content two')).not.toBeInTheDocument();
  });

  it('opens section when clicked', () => {
    render(<Accordion sections={sections} />);
    fireEvent.click(screen.getByText('Section One'));
    expect(screen.getByText('Content one')).toBeInTheDocument();
  });

  it('closes section when clicked again', () => {
    render(<Accordion sections={sections} />);
    fireEvent.click(screen.getByText('Section One'));
    expect(screen.getByText('Content one')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Section One'));
    expect(screen.queryByText('Content one')).not.toBeInTheDocument();
  });

  it('only one section open at a time', () => {
    render(<Accordion sections={sections} />);
    fireEvent.click(screen.getByText('Section One'));
    expect(screen.getByText('Content one')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Section Two'));
    expect(screen.queryByText('Content one')).not.toBeInTheDocument();
    expect(screen.getByText('Content two')).toBeInTheDocument();
  });

  it('respects defaultOpenId', () => {
    render(<Accordion sections={sections} defaultOpenId="sec2" />);
    expect(screen.queryByText('Content one')).not.toBeInTheDocument();
    expect(screen.getByText('Content two')).toBeInTheDocument();
  });

  it('sets aria-expanded correctly', () => {
    render(<Accordion sections={sections} />);
    const btn1 = screen.getByText('Section One').closest('button');
    expect(btn1).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(btn1!);
    expect(btn1).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles empty sections array', () => {
    render(<Accordion sections={[]} />);
    // Should render without errors
    expect(document.querySelector('.space-y-4')).toBeInTheDocument();
  });
});
