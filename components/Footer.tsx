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
    <footer className="font-body text-text-primary container mx-auto border-t border-surface-high">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
        <div className="text-text-secondary text-sm">
          {`\u00A9 ${currentYear} Challenger Co. All rights reserved. Company No. 16703228`}
        </div>
        <div className="flex items-center gap-6 text-xs font-body">
          <a href="/terms-of-service" className="text-muted hover:text-primary transition-colors">
            Terms
          </a>
          <a href="/privacy-policy" className="text-muted hover:text-primary transition-colors">
            Privacy
          </a>
          <a href="/cookie-policy" className="text-muted hover:text-primary transition-colors">
            Cookies
          </a>
        </div>
        <div className="text-text-secondary text-sm uppercase tracking-widest">
          {`Version ${version} \u2022 ${commitHash}`}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
