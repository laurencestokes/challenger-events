import React from 'react';
import { render } from '@testing-library/react';
import {
  EventCardSkeleton,
  TeamCardSkeleton,
  LargeEventCardSkeleton,
  TeamManagementSkeleton,
  QuickActionsSkeleton,
  EventStatsSkeleton,
  PerformanceGraphSkeleton,
  ProfileInfoSkeleton,
  VerificationStatusSkeleton,
  ScoresListSkeleton,
  TeamHeaderSkeleton,
  TeamMembersListSkeleton,
  EventListSkeleton,
} from '../../components/SkeletonLoaders';

const skeletons = [
  ['EventCardSkeleton', EventCardSkeleton],
  ['TeamCardSkeleton', TeamCardSkeleton],
  ['LargeEventCardSkeleton', LargeEventCardSkeleton],
  ['TeamManagementSkeleton', TeamManagementSkeleton],
  ['QuickActionsSkeleton', QuickActionsSkeleton],
  ['EventStatsSkeleton', EventStatsSkeleton],
  ['PerformanceGraphSkeleton', PerformanceGraphSkeleton],
  ['ProfileInfoSkeleton', ProfileInfoSkeleton],
  ['VerificationStatusSkeleton', VerificationStatusSkeleton],
  ['ScoresListSkeleton', ScoresListSkeleton],
  ['TeamHeaderSkeleton', TeamHeaderSkeleton],
  ['TeamMembersListSkeleton', TeamMembersListSkeleton],
  ['EventListSkeleton', EventListSkeleton],
] as const;

describe('SkeletonLoaders', () => {
  it.each(skeletons)('%s renders with animate-pulse', (_name, Component) => {
    const { container } = render(<Component />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
