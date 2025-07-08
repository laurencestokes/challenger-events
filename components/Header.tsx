'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';
import { FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="bg-white dark:bg-black shadow-sm dark:border-b dark:border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              CHALLENGER FITNESS
            </span>
            <span className="px-2 py-1 text-xs font-semibold bg-primary-600 text-white rounded-full">
              BETA
            </span>
          </Link>
        </div>
        <nav className="flex items-center">
          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center space-x-2">
            <li>
              <Link
                href="/"
                className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Home
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Events
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
          <div className="flex items-center">
            <ThemeSwitch />
            {/* Mobile Menu Button */}
            <div className="md:hidden ml-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-800 dark:text-white p-2"
              >
                {isMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
            </div>
          </div>
        </nav>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-black">
          <ul className="flex flex-col items-center space-y-4 py-4">
            <li>
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg text-gray-800 dark:text-white"
              >
                Home
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg text-gray-800 dark:text-white"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg text-gray-800 dark:text-white"
                  >
                    Events
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg text-gray-800 dark:text-white"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
