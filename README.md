# Challenger Fitness

A comprehensive fitness tracking and scoring application built with Next.js. Track your workouts, calculate performance scores, and monitor your fitness progress.

## Features

- Next.js 14 with app router
- Fitness tracking and scoring algorithms
- Powerlifting and rowing standards
- Interactive data visualization with D3.js
- Responsive design with Tailwind CSS
- Dark mode support with Next Themes
- Modern UI components

## Getting Started

1. Clone the repository
2. Install dependencies `npm install`
3. Run the development server `npm run dev`

## NPM Configuration

This project uses the `@challengerco/challenger-data` package from GitHub Packages. Vercel can handle this using environment variables.

### Setting up Vercel Deployment

1. **Create a GitHub Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `read:packages` scope
   - Copy the token (you won't see it again)

2. **Configure Vercel Environment Variables:**
   - Go to your Vercel project settings
   - Navigate to Settings → Environment Variables
   - Add `NPM_TOKEN` with your GitHub Personal Access Token
   - Add `NPM_RC` with the content from `.npmrc.example` (the entire file content)
   - Set both for Production, Preview, and Development environments

3. **For Local Development:**
   ```bash
   # Copy the example file
   cp .npmrc.example .npmrc
   
   # Edit .npmrc and replace ${NPM_TOKEN} with your actual token
   # Or set it as an environment variable:
   export NPM_TOKEN=your_github_token_here
   ```

### Troubleshooting

- **"Package not found" errors:** Ensure your token has the correct permissions (`read:packages`)
- **Authentication failures:** Verify your token hasn't expired
- **CI/CD issues:** Check that both `NPM_TOKEN` and `NPM_RC` are properly configured in Vercel

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run analyze` - Analyze powerlifting data
- `npm run commit` - Create a conventional commit

## Conventional Commits

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification to maintain a clean and automated changelog.

### Commit Types

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependencies, etc.
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert previous commits

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Examples

```bash
# Feature
feat: add user authentication system

# Bug fix
fix: resolve scoring calculation error

# Documentation
docs: update API documentation

# Breaking change
feat!: change API response format

# With scope
feat(auth): add OAuth2 support
fix(ui): resolve button alignment issue
```

### Making Commits

1. **Interactive Mode (Recommended):**
   ```bash
   npm run commit
   ```
   This will guide you through creating a conventional commit interactively.

2. **Manual Mode:**
   ```bash
   git commit -m "feat: add new feature description"
   ```

### Automated Changelog

The conventional commit format enables automatic changelog generation. When you're ready to create a release:

1. Use semantic versioning for your releases
2. The changelog will be automatically generated based on your commit history
3. Breaking changes will be clearly marked

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- D3.js for data visualization
- React Hook Form with Zod validation
- Next Themes for dark mode

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/talhatahir)
