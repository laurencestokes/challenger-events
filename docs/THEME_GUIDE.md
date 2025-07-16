# Challenger Theme System Guide

## Overview

The Challenger Events platform uses a high-energy orange and black theme system designed to convey strength, athleticism, and modern fitness culture. This guide explains how to properly implement the theme across all components.

## Color System

### Primary Colors (High-Energy Orange)
- **Primary-500**: `#f97316` - Main brand color
- **Primary-600**: `#ea580c` - Hover states
- **Primary-700**: `#c2410c` - Active states

### Accent Colors (High-Energy Red)
- **Accent-500**: `#ef4444` - Warnings, errors, high-impact
- **Accent-600**: `#dc2626` - Hover states

### Usage Guidelines

#### Light Mode
- Background: White (`bg-white`)
- Text: Dark gray (`text-gray-900`)
- Borders: Light gray (`border-gray-200`)

#### Dark Mode
- Background: Black (`bg-black`)
- Text: White (`text-white`)
- Borders: Dark gray (`border-gray-700`)

## Font System

### Display Font (Orbitron)
- **Usage**: Headings, titles, brand elements, high-impact text
- **Class**: `font-display`
- **Characteristics**: Geometric, bold, futuristic, athletic
- **Best for**: 
  - Main headlines (h1, h2, h3)
  - Brand name "CHALLENGER"
  - Call-to-action buttons
  - Section titles
  - High-impact elements

### Body Font (Inter)
- **Usage**: Body text, paragraphs, navigation, general content
- **Class**: `font-sans` (default)
- **Characteristics**: Clean, highly readable, modern, optimized for screens
- **Best for**:
  - Paragraph text
  - Navigation menus
  - Form inputs
  - General content
  - Links

## Component Classes

### Button Classes
```css
.btn-primary     /* Orange primary button with display font */
.btn-secondary   /* Gray secondary button with sans font */
.btn-accent      /* Red accent button with display font */
```

### Card Classes
```css
.card            /* White/dark card with challenger shadow */
```

### Input Classes
```css
.input           /* Styled input with proper focus states */
```

### Link Classes
```css
.link-primary    /* Orange link with hover effects */
```

## Gradients

### Athletic Gradient
- **Class**: `bg-gradient-athletic`
- **Colors**: Orange to red (`#f97316` to `#ef4444`)
- **Usage**: Hero sections, high-impact elements, CTAs

### Text Gradients
- **Class**: `text-gradient-orange`
- **Usage**: Brand text, high-impact headings

## Shadows

### Challenger Shadows
- **Class**: `shadow-challenger` - Standard depth
- **Class**: `shadow-challenger-lg` - Larger depth
- **Class**: `shadow-challenger-xl` - Maximum depth

### Glow Effects
- **Class**: `shadow-glow` - Orange glow
- **Class**: `shadow-glow-red` - Red glow

## Animations

### Glow Animation
- **Class**: `animate-glow`
- **Usage**: Hero titles, high-impact elements

### Subtle Bounce
- **Class**: `animate-bounce-subtle`
- **Usage**: Interactive elements

## Best Practices

### 1. Font Usage
```jsx
// ✅ Correct - Use display font for headings
<h1 className="text-4xl font-black font-display">CHALLENGER</h1>

// ✅ Correct - Use sans font for body text
<p className="text-base font-sans">Regular paragraph text.</p>

// ❌ Incorrect - Don't mix fonts in the same element
<h1 className="font-display font-sans">Mixed fonts</h1>
```

### 2. Color Usage
```jsx
// ✅ Correct - Use primary colors for main actions
<button className="btn-primary">Primary Action</button>

// ✅ Correct - Use accent colors for warnings/errors
<div className="text-accent-500">Error message</div>

// ❌ Incorrect - Don't use old color names
<button className="bg-blue-500">Old color</button>
```

### 3. Dark Mode
```jsx
// ✅ Correct - Always include dark mode variants
<div className="bg-white dark:bg-black text-gray-900 dark:text-white">
  Content
</div>

// ✅ Correct - Use proper contrast ratios
<p className="text-gray-600 dark:text-gray-400">Secondary text</p>
```

### 4. Component Structure
```jsx
// ✅ Correct - Use semantic HTML with proper classes
<section className="bg-white dark:bg-black">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <h1 className="text-6xl font-black font-display text-gradient-orange">
      CHALLENGER
    </h1>
    <p className="text-xl text-gray-600 dark:text-gray-400 font-sans">
      Description text
    </p>
  </div>
</section>
```

## Examples

### Hero Section
```jsx
<section className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-athletic opacity-10"></div>
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div className="text-center">
      <h1 className="text-6xl font-black font-display text-gradient-orange mb-6 animate-glow">
        CHALLENGER
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 font-sans">
        Your next fitness challenge awaits...
      </p>
      <button className="btn-primary text-lg px-8 py-4">
        GET STARTED
      </button>
    </div>
  </div>
</section>
```

### Card Component
```jsx
<div className="card p-6">
  <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">
    CARD TITLE
  </h3>
  <p className="text-base text-gray-600 dark:text-gray-400 font-sans">
    Card content with readable body text.
  </p>
  <div className="mt-4 flex gap-2">
    <button className="btn-primary">Primary Action</button>
    <button className="btn-secondary">Secondary Action</button>
  </div>
</div>
```

### Form Component
```jsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-sans">
      Email
    </label>
    <input
      type="email"
      className="input"
      placeholder="Enter your email"
    />
  </div>
  <button type="submit" className="btn-primary w-full">
    Submit
  </button>
</form>
```

## Migration Guide

### From Old Theme
1. Replace `bg-primary-600` with `bg-primary-500`
2. Replace `text-primary-600` with `text-primary-500`
3. Add `font-display` to headings
4. Add `font-sans` to body text
5. Replace old shadow classes with `shadow-challenger`
6. Update error colors to use `accent-500` instead of `error-500`

### Common Patterns
```jsx
// Old
<div className="bg-gray-800 text-white shadow-sm">
  <h2 className="text-2xl font-bold">Title</h2>
  <p>Content</p>
</div>

// New
<div className="card p-6">
  <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Title</h2>
  <p className="font-sans text-gray-600 dark:text-gray-400">Content</p>
</div>
```

## Accessibility

### Color Contrast
- Ensure all text meets WCAG AA contrast requirements
- Use `text-gray-600 dark:text-gray-400` for secondary text
- Use `text-gray-900 dark:text-white` for primary text

### Focus States
- All interactive elements have visible focus rings
- Use `ring-primary-500` for focus states
- Ensure focus indicators work in both light and dark modes

### Typography
- Use appropriate font sizes for readability
- Maintain proper line heights
- Use semantic HTML structure

## Performance

### Font Loading
- Fonts are loaded with `display: swap`
- CSS variables are used for font families
- Fallback fonts are properly specified

### Animations
- Use `transform` and `opacity` for smooth animations
- Avoid animating layout properties
- Use `will-change` sparingly

This theme system ensures consistency across the entire Challenger Events platform while maintaining the high-energy, athletic brand identity. 