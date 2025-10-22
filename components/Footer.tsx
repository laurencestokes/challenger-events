import { AiOutlineFacebook, AiOutlineInstagram } from 'react-icons/ai';

// Get version from package.json
const getVersion = () => {
  try {
    // This will be replaced at build time
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
    <footer className="shadow-challenger text-gray-400 py-6" style={{ backgroundColor: '#0F0F0F' }}>
      <div className="container mx-auto px-4 flex flex-wrap justify-center sm:justify-between items-center text-sm">
        <div className="flex flex-col sm:flex-row items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <p className="ml-4 font-sans text-gray-900 dark:text-white">
              &copy; {currentYear} Challenger Co. All rights reserved. Company No. 16703228
            </p>
            <span className="ml-4 text-xs text-gray-500 font-sans">
              v{version} • {commitHash}
            </span>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 text-xs mt-2 sm:mt-0 sm:ml-4">
            <a
              href="/terms-of-service"
              className="text-gray-500 hover:text-primary-500 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/privacy-policy"
              className="text-gray-500 hover:text-primary-500 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/cookie-policy"
              className="text-gray-500 hover:text-primary-500 transition-colors"
            >
              Cookie Policy
            </a>
          </div>
        </div>
        <div className="flex space-x-4 mt-2 mr-4 sm:mt-0">
          <a
            href="https://www.facebook.com/profile.php?id=61581981370287"
            aria-label="Facebook"
            className="text-primary-500 hover:text-primary-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AiOutlineFacebook className="w-5 h-5" />
          </a>
          {/* <a
            href="#"
            aria-label="LinkedIn"
            className="text-primary-500 hover:text-primary-600 transition-colors"
          >
            <AiOutlineLinkedin className="w-5 h-5" />
          </a> */}
          <a
            href="https://www.instagram.com/thechallengerco/"
            aria-label="Instagram"
            className="text-primary-500 hover:text-primary-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AiOutlineInstagram className="w-5 h-5" />
          </a>
          {/* <a
            href="#"
            aria-label="X (formerly Twitter)"
            className="text-primary-500 hover:text-primary-600 transition-colors"
          >
            <AiOutlineX className="w-5 h-5" />
          </a>
          <a
            href="#"
            aria-label="GitHub"
            className="text-primary-500 hover:text-primary-600 transition-colors"
          >
            <AiOutlineGithub className="w-5 h-5" />
          </a> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
