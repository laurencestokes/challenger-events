'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeSwitch from './ThemeSwitch';
import { FiMenu, FiX, FiGrid, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <header className="bg-white dark:bg-black shadow-challenger sticky top-0 z-50 border-b-2 border-primary-500">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/challengerco-logo-text-only.png"
              alt="The Challenger Co."
              width={120}
              height={48}
              className="h-8 w-auto"
              priority
            />
            <span className="px-3 py-1 text-xs font-bold bg-gradient-athletic text-white rounded-full shadow-challenger font-display">
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
                className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
              >
                Home
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center space-x-1 font-sans"
                  >
                    <FiGrid size={16} />
                    <span>Dashboard</span>
                  </Link>
                </li>
                {isAdmin && (
                  <>
                    <li>
                      <Link
                        href="/admin/events"
                        className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center space-x-1 font-sans"
                      >
                        <FiCalendar size={16} />
                        <span>Manage Events</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/users"
                        className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center space-x-1 font-sans"
                      >
                        <FiUsers size={16} />
                        <span>Manage Users</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/erg/head-to-head"
                        className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center space-x-1 font-sans"
                      >
                        <span>🚣</span>
                        <span>Erg Live</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/events/create"
                        className="text-sm text-primary-500 dark:text-primary-400 px-4 py-2 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-sans"
                      >
                        Create Event
                      </Link>
                    </li>
                  </>
                )}

                <li>
                  <Link
                    href="/profile"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
                  >
                    Profile
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
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
                className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans"
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
                    className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 flex items-center space-x-2 font-sans"
                  >
                    <FiGrid size={18} />
                    <span>Dashboard</span>
                  </Link>
                </li>
                {isAdmin && (
                  <>
                    <li>
                      <Link
                        href="/admin/events"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 flex items-center space-x-2 font-sans"
                      >
                        <FiCalendar size={18} />
                        <span>Manage Events</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/users"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 flex items-center space-x-2 font-sans"
                      >
                        <FiUsers size={18} />
                        <span>Manage Users</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/erg/head-to-head"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 flex items-center space-x-2 font-sans"
                      >
                        <span>🚣</span>
                        <span>Erg Live</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/admin/events/create"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-lg text-primary-500 dark:text-primary-400 font-sans"
                      >
                        Create Event
                      </Link>
                    </li>
                  </>
                )}

                <li>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans"
                  >
                    Profile
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans"
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
