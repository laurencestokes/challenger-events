import {
  AiOutlineFacebook,
  AiOutlineX,
  AiOutlineGithub,
  AiOutlineLinkedin,
  AiOutlineInstagram,
} from 'react-icons/ai';

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
    <footer className="bg-white border-t border-gray-100 dark:bg-black shadow-sm text-gray-400 py-6 dark:border-t dark:border-gray-800">
      <div className="container mx-auto px-4 flex flex-wrap justify-center sm:justify-between items-center text-sm">
        <div className="flex items-center">
          <p className="ml-4">&copy; {currentYear} Challenger Co. All rights reserved.</p>
          <span className="ml-4 text-xs text-gray-500">
            v{version} • {commitHash}
          </span>
        </div>
        <div className="flex space-x-4 mt-2 mr-4 sm:mt-0">
          <a href="#" aria-label="Facebook" className="hover:text-gray-300">
            <AiOutlineFacebook className="w-5 h-5" />
          </a>
          <a href="#" aria-label="LinkedIn" className="hover:text-gray-300">
            <AiOutlineLinkedin className="w-5 h-5" />
          </a>
          <a href="#" aria-label="Instagram" className="hover:text-gray-300">
            <AiOutlineInstagram className="w-5 h-5" />
          </a>
          <a href="#" aria-label="X (formerly Twitter)" className="hover:text-gray-300">
            <AiOutlineX className="w-5 h-5" />
          </a>
          <a href="#" aria-label="GitHub" className="hover:text-gray-300">
            <AiOutlineGithub className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
