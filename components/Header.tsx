'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeSwitch from './ThemeSwitch';
import { FiMenu, FiX } from 'react-icons/fi';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-black shadow-sm dark:border-b dark:border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              CHALLENGER FITNESS
            </span>
            <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
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
            <li>
              <Link
                href="/formula"
                className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Score Calculator
              </Link>
            </li>
            <li>
              <Link
                href="/showdown"
                className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                The Showdown
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                About
              </Link>
            </li>
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
            <li>
              <Link
                href="/formula"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg text-gray-800 dark:text-white"
              >
                Score Calculator
              </Link>
            </li>
            <li>
              <Link
                href="/showdown"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg text-gray-800 dark:text-white"
              >
                The Showdown
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg text-gray-800 dark:text-white"
              >
                About
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
