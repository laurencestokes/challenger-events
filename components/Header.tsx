'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useKeyPress,
  useMediaQuery,
  useLocationChange,
  Button as DSButton,
} from '@challengerco/challenger-fitness-design-system/client';
import {
  Wordmark,
  Logo,
  NavigationLink,
  Tag,
} from '@challengerco/challenger-fitness-design-system/server';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/firebase-auth';

export default function Header() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useKeyPress('Escape', () => setIsMenuOpen((prev) => (prev ? false : prev)), { event: 'keyup' });
  useMediaQuery('(min-width: 1060px)', () => setIsMenuOpen(false));
  useLocationChange(() => setIsMenuOpen(false));

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = user ? (
    <>
      <NavigationLink as="a" href="/dashboard">
        Dashboard
      </NavigationLink>
      {isAdmin && (
        <>
          <NavigationLink as="a" href="/admin/events">
            Events
          </NavigationLink>
          <NavigationLink as="a" href="/admin/users">
            Users
          </NavigationLink>
          <NavigationLink as="a" href="/admin/erg/head-to-head">
            Erg H2H
          </NavigationLink>
          <NavigationLink as="a" href="/admin/erg/team-session">
            Erg Team
          </NavigationLink>
          <NavigationLink as="a" href="/admin/events/create">
            Create
          </NavigationLink>
        </>
      )}
      <NavigationLink as="a" href="/profile">
        Profile
      </NavigationLink>
      <DSButton
        as="button"
        variant="secondary"
        className="!px-3 !py-1.5 !text-[11px]"
        onPress={handleSignOut}
      >
        Logout_
      </DSButton>
    </>
  ) : (
    <>
      <NavigationLink as="a" href="/">
        Home
      </NavigationLink>
      <DSButton
        as="a"
        href="/auth/signin"
        variant="secondary"
        className="!px-3 !py-1.5 !text-[11px]"
      >
        Login_
      </DSButton>
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex flex-row flex-nowrap justify-between items-center w-full mb-16 px-6 py-3 sm:px-12 bg-background/95 backdrop-blur-sm border-b border-surface-high">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-offwhite transition-colors duration-150 hover:text-primary">
          <Wordmark height="48px" width="162px" fill="currentColor" />
        </Link>
        <Tag variant="primary" className="text-[9px] !px-2 !py-0.5 !border-0">
          Beta
        </Tag>
      </div>
      <nav className="flex items-center gap-10">
        <Link
          href="/"
          className="hidden sm:block text-offwhite transition-colors duration-150 hover:text-primary"
        >
          <Logo height="32px" width="32px" fill="currentColor" />
        </Link>
        <div className="hidden lg-nav:flex flex-row items-center justify-between gap-4">
          {navItems}
        </div>
        <DSButton
          as="button"
          variant="secondary"
          className="lg-nav:hidden! px-6"
          onPress={() => setIsMenuOpen(true)}
        >
          =
        </DSButton>
        <ModalOverlay
          isOpen={isMenuOpen}
          className="flex justify-end fixed inset-0 backdrop-blur-sm z-20 data-[entering]:animate-[nav-fade-in_0.3s_ease-in-out] data-[exiting]:animate-[nav-fade-out_0.3s_ease-in-out]"
        >
          <Modal className="block fixed max-w-[375px] w-[calc(100%-2rem)] m-4 h-[calc(100%-2rem)] overflow-hidden bg-surface-low border border-surface-high data-[entering]:animate-[nav-slide-in_0.3s_ease-in-out] data-[exiting]:animate-[nav-slide-out_0.3s_ease-in-out]">
            <Dialog className="p-8 flex flex-col gap-6 h-full outline-none">
              <DSButton
                as="button"
                variant="secondary"
                className="px-6 ml-auto"
                onPress={() => setIsMenuOpen(false)}
              >
                &#x2715;
              </DSButton>
              <div className="flex flex-col gap-4">{navItems}</div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      </nav>
    </header>
  );
}
