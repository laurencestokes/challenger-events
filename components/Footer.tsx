import { PageBreak } from '@challengerco/challenger-fitness-design-system/server';

// Get version from package.json
const getVersion = () => {
  try {
    return process.env.npm_package_version || '0.1.0';
  } catch {
    return '0.1.0';
  }
};

// Get commit hash from environment
const getCommitHash = () => {
  if (process.env.NEXT_PUBLIC_COMMIT_HASH) {
    return process.env.NEXT_PUBLIC_COMMIT_HASH.substring(0, 7);
  }
  return 'dev';
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const version = getVersion();
  const commitHash = getCommitHash();

  return (
    <div className="container mx-auto px-4">
      <PageBreak />
      <footer className="font-body text-text-primary border-t border-surface-high py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Company info */}
          <p className="text-muted text-sm text-center sm:text-left">
            &copy; {currentYear} Challenger Co. All rights reserved. Company No. 16703228
          </p>

          {/* Links + social */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs">
            <a
              href="/terms-of-service"
              className="text-muted transition-colors hover:text-offwhite"
            >
              Terms of Service
            </a>
            <a href="/privacy-policy" className="text-muted transition-colors hover:text-offwhite">
              Privacy Policy
            </a>
            <a href="/cookie-policy" className="text-muted transition-colors hover:text-offwhite">
              Cookie Policy
            </a>
            <a
              href="https://www.instagram.com/thechallengerco/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-offwhite"
              aria-label="Instagram"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>

          {/* Version */}
          <div className="text-text-secondary text-sm uppercase tracking-widest font-body text-center sm:text-right">
            {`Version ${version} \u2022 ${commitHash}`}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
