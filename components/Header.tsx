'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiMenu, FiX, FiGrid, FiCalendar, FiUsers, FiLogOut, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/firebase-auth';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isErgDropdownOpen, setIsErgDropdownOpen] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="shadow-challenger sticky top-0 z-50" style={{ backgroundColor: '#0F0F0F' }}>
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
                    <li className="relative">
                      <button
                        onClick={() => setIsErgDropdownOpen(!isErgDropdownOpen)}
                        className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center space-x-1 font-sans"
                      >
                        <span>🚣</span>
                        <span>Erg Live</span>
                        <FiChevronDown
                          size={14}
                          className={`transition-transform ${isErgDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isErgDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <Link
                            href="/admin/erg/head-to-head"
                            className="block px-4 py-2 text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => setIsErgDropdownOpen(false)}
                          >
                            Head-to-Head
                          </Link>
                          <Link
                            href="/admin/erg/team-session"
                            className="block px-4 py-2 text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => setIsErgDropdownOpen(false)}
                          >
                            Team Competition
                          </Link>
                        </div>
                      )}
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
                <li>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans flex items-center space-x-1"
                  >
                    <FiLogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-sm text-gray-800 dark:text-white px-4 py-2 rounded-md hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
                  >
                    Sign In
                  </Link>
                </li>
              </>
            )}
          </ul>
          <div className="flex items-center">
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
                      <div className="space-y-2">
                        <div className="text-lg text-gray-800 dark:text-white font-sans flex items-center space-x-2">
                          <span>🚣</span>
                          <span>Erg Live</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          <Link
                            href="/admin/erg/head-to-head"
                            onClick={() => setIsMenuOpen(false)}
                            className="block text-base text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
                          >
                            Head-to-Head
                          </Link>
                          <Link
                            href="/admin/erg/team-session"
                            onClick={() => setIsMenuOpen(false)}
                            className="block text-base text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors font-sans"
                          >
                            Team Competition
                          </Link>
                        </div>
                      </div>
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
                <li>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleSignOut();
                    }}
                    className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans flex items-center space-x-2"
                  >
                    <FiLogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 font-sans"
                  >
                    Sign In
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
