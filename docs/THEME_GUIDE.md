# Challenger Co. Design System

This document outlines the shared design system for Challenger Co. applications, ensuring consistency across all products.

## Brand Colors

### Primary Colors
- **Primary Gray**: `#737373` - Main brand color, used for text and backgrounds
- **Primary Gray (Dark)**: `#262626` - Dark variant for emphasis
- **Primary Gray (Light)**: `#a3a3a3` - Light variant for borders

### Secondary Colors
- **Secondary Gray**: `#64748b` - Used for secondary text and borders
- **Secondary Gray (Dark)**: `#475569` - Darker variant for emphasis
- **Secondary Gray (Light)**: `#94a3b8` - Lighter variant for backgrounds

### Accent Colors
- **Accent Blue-Gray**: `#64748b` - Used for CTAs and important actions
- **Accent Blue-Gray (Hover)**: `#475569` - Hover state for accent elements

### Semantic Colors
- **Success Green**: `#10b981` - Success states and positive feedback (emerald)
- **Warning Orange**: `#f59e0b` - Warning states and caution messages
- **Error Red**: `#ef4444` - Error states and destructive actions

## Typography

### Font Family
- **Primary**: Inter Tight - Clean, modern sans-serif
- **Monospace**: JetBrains Mono - For code and technical content

### Font Sizes
- **xs**: 0.75rem (12px) - Small labels and captions
- **sm**: 0.875rem (14px) - Body text and small content
- **base**: 1rem (16px) - Default body text
- **lg**: 1.125rem (18px) - Large body text
- **xl**: 1.25rem (20px) - Subheadings
- **2xl**: 1.5rem (24px) - Section headings
- **3xl**: 1.875rem (30px) - Page headings
- **4xl**: 2.25rem (36px) - Large page headings
- **5xl**: 3rem (48px) - Hero headings
- **6xl**: 3.75rem (60px) - Large hero headings

### Font Weights
- **normal**: 400 - Default text
- **medium**: 500 - Emphasis
- **semibold**: 600 - Strong emphasis
- **bold**: 700 - Headings and strong emphasis

## Spacing

### Base Spacing Scale
- **0**: 0px
- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **5**: 1.25rem (20px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)
- **10**: 2.5rem (40px)
- **12**: 3rem (48px)
- **16**: 4rem (64px)
- **20**: 5rem (80px)
- **24**: 6rem (96px)

## Border Radius

- **none**: 0px - No rounding
- **sm**: 0.125rem (2px) - Subtle rounding
- **DEFAULT**: 0.25rem (4px) - Default rounding
- **md**: 0.375rem (6px) - Medium rounding
- **lg**: 0.5rem (8px) - Large rounding
- **xl**: 0.75rem (12px) - Extra large rounding
- **2xl**: 1rem (16px) - Very large rounding
- **full**: 9999px - Fully rounded (circles)

## Shadows

- **sm**: Subtle shadow for cards and elevated elements
- **DEFAULT**: Standard shadow for most components
- **md**: Medium shadow for modals and overlays
- **lg**: Large shadow for prominent elements
- **xl**: Extra large shadow for hero sections
- **2xl**: Maximum shadow for special effects

## Components

### Button Variants
- **default**: Primary brand red background
- **destructive**: Error red background for dangerous actions
- **outline**: Bordered button with transparent background
- **secondary**: Gray background for secondary actions
- **ghost**: Transparent background with hover effects
- **link**: Text-only button that looks like a link

### Button Sizes
- **sm**: Small button (h-9, px-3)
- **default**: Standard button (h-10, px-4 py-2)
- **lg**: Large button (h-11, px-8)
- **icon**: Square button for icons (h-10 w-10)

### Input States
- **default**: Standard input styling
- **error**: Red border and focus ring for validation errors
- **disabled**: Reduced opacity and disabled cursor

## Dark Mode

### Background Colors
- **Primary**: `#000000` - Main background
- **Secondary**: `#0f0f0f` - Secondary background
- **Tertiary**: `#1a1a1a` - Tertiary background

### Text Colors
- **Primary**: `#ffffff` - Main text
- **Secondary**: `#a1a1aa` - Secondary text
- **Tertiary**: `#71717a` - Tertiary text

### Border Colors
- **Primary**: `#27272a` - Main borders
- **Secondary**: `#3f3f46` - Secondary borders

## Usage Guidelines

### Color Usage
1. **Primary Gray**: Use for main text, backgrounds, and structural elements
2. **Secondary Gray**: Use for secondary text, borders, and backgrounds
3. **Accent Blue-Gray**: Use for CTAs and important actions
4. **Semantic Colors**: Use appropriately for their intended purpose

### Typography Guidelines
1. **Headings**: Use bold weights (600-700) for hierarchy
2. **Body Text**: Use normal weight (400) for readability
3. **Captions**: Use smaller sizes (xs-sm) for metadata
4. **Code**: Use monospace font for technical content

### Spacing Guidelines
1. **Consistent Spacing**: Use the spacing scale consistently
2. **Component Spacing**: Use 4, 6, or 8 for component padding
3. **Section Spacing**: Use 12, 16, or 24 for section spacing
4. **Page Spacing**: Use 20 or 24 for page-level spacing

### Component Guidelines
1. **Accessibility**: Ensure proper contrast ratios and focus states
2. **Responsive**: Design components to work on all screen sizes
3. **Consistent**: Use the same patterns across similar components
4. **Progressive**: Enhance with JavaScript when available

## Implementation

### Tailwind Configuration
The theme is implemented through Tailwind CSS configuration. Key files:
- `tailwind.config.js` - Main configuration
- `lib/theme.ts` - Theme utilities and constants
- `components/ui/` - Reusable component library

### CSS Variables
For custom CSS, use the following variables:
```css
:root {
  --primary-500: #737373;
  --primary-600: #525252;
  --secondary-500: #64748b;
  --accent-500: #64748b;
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
}
```

### Component Usage
```tsx
import { Button, Input, Card } from '@/components/ui';

// Button with loading state
<Button loading>Submit</Button>

// Input with error
<Input label="Email" error="Invalid email address" />

// Card with header and content
<Card>
  <CardHeader>
    <h2>Card Title</h2>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

## Migration Guide

When migrating from the old theme:
1. Replace hardcoded colors with theme colors
2. Update component variants to use new design system
3. Ensure proper dark mode support
4. Test accessibility and responsive behavior
5. Update documentation and examples

## Future Enhancements

Planned improvements to the design system:
1. **Animation System**: Standardized animations and transitions
2. **Icon System**: Consistent icon library and usage
3. **Form Components**: Advanced form components with validation
4. **Layout Components**: Grid and layout utilities
5. **Data Visualization**: Charts and graphs styling 