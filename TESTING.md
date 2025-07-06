# Testing Guide

This document outlines the testing setup and guidelines for the Challenger Events project.

## 🧪 Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation

## 📁 Test Structure

```
__tests__/
├── components/          # Component tests
│   └── LoadingSpinner.test.tsx
├── utils/              # Utility function tests
│   └── scoring.test.ts
└── lib/                # Library tests (future)
```

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test File
```bash
npm test -- --testPathPattern=scoring
```

## 📝 Writing Tests

### Component Tests

```typescript
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### Utility Function Tests

```typescript
import { myFunction } from '../utils/myFunction'

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })

  it('should handle edge cases', () => {
    expect(() => myFunction('')).toThrow('Invalid input')
  })
})
```

### API Route Tests

```typescript
import { NextRequest } from 'next/server'
import { POST } from '../app/api/my-route/route'

describe('POST /api/my-route', () => {
  it('should return success response', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-route', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
  })
})
```

## 🎯 Testing Guidelines

### 1. Test Coverage Goals
- **Components**: 80% coverage
- **Utilities**: 90% coverage
- **API Routes**: 85% coverage

### 2. Test Naming
- Use descriptive test names
- Follow the pattern: `should [expected behavior] when [condition]`
- Example: `should display error message when form is invalid`

### 3. Test Organization
- Group related tests using `describe` blocks
- Use `beforeEach` for common setup
- Use `afterEach` for cleanup

### 4. Mocking Guidelines
- Mock external dependencies (Firebase, API calls)
- Mock Next.js router and navigation
- Use realistic mock data

### 5. Accessibility Testing
- Test keyboard navigation
- Verify ARIA attributes
- Test screen reader compatibility

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
- Next.js integration
- TypeScript support
- Coverage collection
- Test environment setup

### Test Setup (`jest.setup.js`)
- Custom matchers
- Mock configurations
- Environment variables

## 📊 Coverage Reports

Coverage reports are generated automatically and include:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## 🚨 Common Issues

### 1. Firebase Mocking
```typescript
// Mock Firebase in your tests
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}))
```

### 2. Next.js Router
```typescript
// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))
```

### 3. Environment Variables
```typescript
// Set test environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key'
```

## 🔄 CI/CD Integration

Tests are automatically run in the CI pipeline:
1. **Validate**: Code quality checks
2. **Test**: Unit and integration tests
3. **Build**: Production build verification
4. **Security**: Dependency audit

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro/)
- [Next.js Testing](https://nextjs.org/docs/testing)

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain good coverage
4. Update this documentation if needed 