# Event Scoping Architecture

## Overview

This document outlines the architecture for event scoping in the Challenger Events platform. Event scoping allows events to be restricted to specific groups of users (e.g., public events, organization-specific events, gym-specific events).

## Current Implementation

### Event Scope Types

1. **PUBLIC** (Default)
   - Anyone can join
   - No restrictions
   - Default scope for all events

2. **ORGANIZATION** (Future)
   - Only users from specific organizations can join
   - Requires `organizationId` field on events
   - Requires `organizationId` field on users

3. **GYM** (Future)
   - Only users from specific gyms can join
   - Requires `gymId` field on events
   - Requires `gymId` field on users

4. **INVITE_ONLY** (Future)
   - Only users with explicit invites can join
   - Requires invitation system

## Database Schema Changes Needed

### Events Collection
```typescript
interface Event {
  // ... existing fields
  scope?: 'PUBLIC' | 'ORGANIZATION' | 'GYM' | 'INVITE_ONLY';
  organizationId?: string; // For ORGANIZATION scope
  gymId?: string; // For GYM scope
  invitedUserIds?: string[]; // For INVITE_ONLY scope
}
```

### Users Collection
```typescript
interface User {
  // ... existing fields
  organizationId?: string; // For organization membership
  gymId?: string; // For gym membership
}
```

## API Implementation

### `/api/events/available` Endpoint

The endpoint currently filters events based on:
1. **Status**: Only ACTIVE events
2. **Scope**: Only PUBLIC events (for now)
3. **Participation**: Excludes events user is already in

Future filtering logic:
```typescript
const scopedEvents = allEvents.filter(event => {
  switch (event.scope) {
    case 'PUBLIC':
      return true;
    case 'ORGANIZATION':
      return user.organizationId === event.organizationId;
    case 'GYM':
      return user.gymId === event.gymId;
    case 'INVITE_ONLY':
      return event.invitedUserIds?.includes(user.id);
    default:
      return true; // Default to PUBLIC
  }
});
```

## Migration Strategy

### Phase 1: Current (Implemented)
- All events are PUBLIC by default
- No scoping restrictions
- Filter out events user is already participating in

### Phase 2: Organization Scoping
- Add `scope` and `organizationId` fields to events
- Add `organizationId` field to users
- Update event creation to support organization scoping
- Update filtering logic

### Phase 3: Gym Scoping
- Add `gymId` field to events and users
- Update filtering logic
- Add gym management interface

### Phase 4: Invite-Only Events
- Add invitation system
- Add `invitedUserIds` field to events
- Create invitation management interface

## Frontend Considerations

### Event Creation
- Add scope selection in event creation form
- Show organization/gym selection based on scope
- Validate user permissions for creating scoped events

### Event Discovery
- Show scope indicator on event cards
- Filter events by scope in event browser
- Show appropriate join buttons based on scope

### User Management
- Add organization/gym selection in user profiles
- Show user's organization/gym in profile
- Allow admins to manage user memberships

## Security Considerations

1. **Authorization**: Ensure users can only create events for their organization/gym
2. **Data Isolation**: Prevent cross-organization data access
3. **Invitation Validation**: Validate invitations before allowing joins
4. **Admin Permissions**: Define who can manage scoped events

## Future Enhancements

1. **Multi-Scope Events**: Events that span multiple organizations/gyms
2. **Hierarchical Scoping**: Organization → Gym → User hierarchy
3. **Temporary Access**: Time-limited access to scoped events
4. **Cross-Organization Events**: Special events that allow cross-organization participation

## Implementation Notes

- The current implementation is designed to be backward compatible
- All existing events will default to PUBLIC scope
- The filtering logic is extensible and can be easily updated
- Database migrations will be needed when adding new scope types
