import React from 'react';
import { render } from '@testing-library/react';
import SocialMediaImageGenerator from '../../components/SocialMediaImageGenerator';

jest.mock('html2canvas', () => jest.fn());

describe('SocialMediaImageGenerator', () => {
  const defaultProps = {
    user: {
      name: 'Alice',
      publicProfileShowAge: true,
      publicProfileShowBodyweight: true,
      publicProfileShowSex: true,
      bodyweight: 65,
      sex: 'F',
    },
    overallTotal: 520,
    overallVerifiedTotal: 450,
    userRank: { name: 'Gold', color: '#FFD700', image: '/gold.png' },
    strengthTotalAll: 480,
    strengthTotalVerified: 400,
    enduranceTotalAll: 550,
    enduranceTotalVerified: 500,
    userAchievements: [],
    competitorAchievement: null,
    highestScoreAchievement: null,
    specialistAchievements: [],
    bestVerifiedScoresByType: {},
    bestScoresByType: {},
  };

  it('renders without crashing', () => {
    const { container } = render(<SocialMediaImageGenerator {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('contains a generate/download button', () => {
    const { container } = render(<SocialMediaImageGenerator {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders score-related content', () => {
    const { container } = render(<SocialMediaImageGenerator {...defaultProps} />);
    expect(container.textContent).toContain('450');
  });

  it('renders rank name', () => {
    const { container } = render(<SocialMediaImageGenerator {...defaultProps} />);
    expect(container.textContent).toContain('GOLD');
  });

  it('renders strength and endurance totals', () => {
    const { container } = render(<SocialMediaImageGenerator {...defaultProps} />);
    expect(container.textContent).toContain('480');
    expect(container.textContent).toContain('550');
  });

  it('renders with achievements', () => {
    const propsWithAchievements = {
      ...defaultProps,
      competitorAchievement: {
        achievement: { id: 'competitor', name: 'Competitor', image: '/c.png' },
        earned: true,
        score: 450,
      },
      highestScoreAchievement: {
        achievement: {
          id: 'score_400',
          name: '400+ Club',
          image: '/400.png',
          requirement: { threshold: 400 },
        },
        earned: true,
        score: 450,
      },
      specialistAchievements: [
        {
          achievement: {
            id: 'strength_specialist',
            name: 'Strength Specialist',
            image: '/str.png',
          },
          earned: true,
          score: 500,
        },
      ],
    };
    const { container } = render(<SocialMediaImageGenerator {...propsWithAchievements} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with user profile details when enabled', () => {
    const propsWithProfile = {
      ...defaultProps,
      user: {
        ...defaultProps.user,
        dateOfBirth: { seconds: 820454400 },
      },
    };
    const { container } = render(<SocialMediaImageGenerator {...propsWithProfile} />);
    expect(container.textContent).toContain('65');
  });
});
