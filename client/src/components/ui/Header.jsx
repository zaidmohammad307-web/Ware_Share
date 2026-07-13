// client/src/components/ui/Header.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks';
import { usePrefs, CURRENCIES } from '@/providers/PreferencesProvider';
import SearchBar from './SearchBar';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

const Header = () => {
  const auth = useAuth();
  const location = useLocation();

  const [showSearchBar, setShowSearchBar] = useState(true);
  const [hasShadow, setHasShadow] = useState(false);
  const { user } = auth;
  const { lang, setLang, currency, setCurrency } = usePrefs();

  const handleScroll = () => {
    const shouldHaveShadow = window.scrollY > 0;
    setHasShadow(shouldHaveShadow);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    // show/hide searchbar based on url
    setShowSearchBar(location.pathname === '/');

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location]);

  return (
    <header
      className={`fixed top-0 z-10 flex w-screen justify-center bg-white/90 py-3 backdrop-blur ${
        hasShadow ? 'shadow-md' : ''
      }`}
    >
      <div
        className={`flex items-center w-screen max-w-screen-xl ${
          showSearchBar ? 'justify-between gap-6 px-4' : 'justify-between px-6'
        }`}
      >
        {/* Logo + brand name */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-sm border border-border">
            <img
              className="h-7 w-7 object-contain"
              src="/wareshare-logo.png"
              alt="Wareshare logo"
            />
          </div>

          <div className="hidden flex-col md:flex leading-tight">
            <span className="text-xl font-bold tracking-tight text-primary">
              WareShare
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Smart storage. Anywhere.
            </span>
          </div>
        </Link>

        {/* Search bar only on home */}
        {showSearchBar && (
          <div className="hidden flex-1 justify-center md:flex">
            <div className="w-full max-w-xl">
              <SearchBar />
            </div>
          </div>
        )}

        {/* Language + currency (always visible) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLang(lang === 'AR' ? 'EN' : 'AR')}
            title={lang === 'AR' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="flex h-9 items-center gap-1 rounded-full border border-border bg-white/80 px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-accent"
          >
            🌐 {lang === 'AR' ? 'ع' : 'EN'}
          </button>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            title="Display currency"
            className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-white/80 px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-accent"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Account / Avatar */}
        <Link
          to={user ? '/account' : '/login'}
          className="flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-sm shadow-sm transition hover:bg-accent"
        >
          {/* Menu icon (desktop) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="hidden h-5 w-5 text-muted-foreground md:block"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>

          {/* Avatar */}
          <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-accent/60">
            {user ? (
              <Avatar>
                {user?.picture && (
                  <AvatarImage src={user.picture} className="h-full w-full" />
                )}
                <AvatarFallback>
                  {user?.name?.slice(0, 1)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <svg
                fill="#858080"
                version="1.1"
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox="796 796 200 200"
                enableBackground="new 796 796 200 200"
                xmlSpace="preserve"
                stroke="#858080"
                className="h-7 w-7"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M896,796c-55.14,0-99.999,44.86-99.999,100c0,55.141,44.859,100,99.999,100c55.141,0,99.999-44.859,99.999-100 C995.999,840.86,951.141,796,896,796z M896.639,827.425c20.538,0,37.189,19.66,37.189,43.921c0,24.257-16.651,43.924-37.189,43.924 s-37.187-19.667-37.187-43.924C859.452,847.085,876.101,827.425,896.639,827.425z M896,983.86 c-24.692,0-47.038-10.239-63.016-26.695c-2.266-2.335-2.984-5.775-1.84-8.82c5.47-14.556,15.718-26.762,28.817-34.761 c2.828-1.728,6.449-1.393,8.91,0.828c7.706,6.958,17.316,11.114,27.767,11.114c10.249,0,19.69-4.001,27.318-10.719 c2.488-2.191,6.128-2.479,8.932-0.711c12.697,8.004,22.618,20.005,27.967,34.253c1.144,3.047,0.425,6.482-1.842,8.817 C943.037,973.621,920.691,983.86,896,983.86z"></path>
                </g>
              </svg>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
