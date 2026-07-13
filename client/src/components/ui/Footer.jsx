// client/src/components/ui/Footer.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const LANGS = [
  { code: 'EN', label: 'English (EN)', live: true },
  { code: 'AR', label: 'العربية (AR)', live: false },
];

const CURRENCIES = [
  { code: 'JOD', label: 'JOD — Jordanian dinar', live: true },
  { code: 'USD', label: 'USD — US dollar', live: false },
];

const Footer = () => {
  const [openMenu, setOpenMenu] = useState(null); // 'lang' | 'currency' | null
  const [lang, setLang] = useState(
    () => localStorage.getItem('wareshare_lang') || 'EN'
  );
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('wareshare_currency') || 'JOD'
  );

  const pickLang = (l) => {
    setOpenMenu(null);
    if (!l.live) {
      toast.info('Arabic support is coming soon — launching with the full release.');
      return;
    }
    setLang(l.code);
    localStorage.setItem('wareshare_lang', l.code);
  };

  const pickCurrency = (c) => {
    setOpenMenu(null);
    if (!c.live) {
      toast.info('USD pricing is coming soon. All prices are shown in JOD for now.');
      return;
    }
    setCurrency(c.code);
    localStorage.setItem('wareshare_currency', c.code);
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/launch`
      : 'https://wareshare.app/launch';
  const shareText =
    'WareShare — warehouse space, booked like a hotel room. Join the waitlist:';

  const menuItemCls =
    'block w-full whitespace-nowrap px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100';

  return (
    <div className="flex w-full justify-center bg-[#222222] pb-8 text-gray-200">
      <div className="flex w-full max-w-screen-xl flex-col items-center px-6">
        {/* Top grid for links */}
        <div className="grid w-full grid-cols-1 gap-6 py-8 text-sm md:grid-cols-3">
          {/* Help & Support */}
          <div className="flex flex-col gap-1">
            <strong className="font-semibold text-white">Help &amp; support</strong>
            <p>
              <Link to="/info/help-center" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Help Center
              </Link>
            </p>
            <p>
              <Link to="/info/safety-security" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Safety &amp; security guidelines
              </Link>
            </p>
            <p>
              <Link to="/info/warehouse-access" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Warehouse access &amp; check-in
              </Link>
            </p>
            <p>
              <Link to="/info/insurance-claims" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Insurance &amp; claims
              </Link>
            </p>
            <p>
              <Link to="/support/report" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Report an issue
              </Link>
            </p>
          </div>

          {/* For warehouse owners */}
          <div className="flex flex-col gap-1">
            <strong className="font-semibold text-white">For warehouse owners</strong>
            <p>
              <Link to="/info/list-your-warehouse" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                List your warehouse
              </Link>
            </p>
            <p>
              <Link to="/info/pricing-tips" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Pricing &amp; utilization tips
              </Link>
            </p>
            <p>
              <Link to="/info/best-practices" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Operational best practices
              </Link>
            </p>
            <p>
              <Link to="/info/partners" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Partner &amp; enterprise solutions
              </Link>
            </p>
          </div>

          {/* About WareShare */}
          <div className="flex flex-col gap-1">
            <strong className="font-semibold text-white">About WareShare</strong>
            <p>
              <Link to="/info/mission" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Our mission
              </Link>
            </p>
            <p>
              <Link to="/info/how-it-works" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                How the marketplace works
              </Link>
            </p>
            <p>
              <Link to="/info/careers" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Careers
              </Link>
            </p>
            <p>
              <Link to="/info/press" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                Press &amp; media
              </Link>
            </p>
            <p>
              <Link to="/info/esg" className="font-normal text-gray-300 decoration-1 underline-offset-1 hover:underline">
                ESG &amp; sustainability
              </Link>
            </p>
          </div>
        </div>

        <div className="my-4 w-full border border-white/10"></div>

        {/* Bottom bar */}
        <div className="flex w-full flex-col items-center justify-between gap-4 md:gap-0 lg:flex-row">
          {/* Language + currency + social */}
          <div className="mt-2 flex w-full justify-between gap-10 md:order-last md:w-auto">
            <div className="flex items-center gap-4 text-sm font-semibold text-gray-200">
              {/* Language picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'lang' ? null : 'lang')}
                  className="flex items-center rounded-full px-2 py-1 hover:bg-white/10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="mr-2 h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                    />
                  </svg>
                  {LANGS.find((l) => l.code === lang)?.label || 'English (EN)'}
                  <span className="ml-1 text-xs">▾</span>
                </button>
                {openMenu === 'lang' && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 overflow-hidden rounded-xl bg-white shadow-lg">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => pickLang(l)}
                        className={menuItemCls}
                      >
                        {l.label}
                        {l.code === lang && ' ✓'}
                        {!l.live && (
                          <span className="ml-2 text-xs text-gray-400">soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === 'currency' ? null : 'currency')
                  }
                  className="flex items-center rounded-full px-2 py-1 hover:bg-white/10"
                >
                  {currency}
                  <span className="ml-1 text-xs">▾</span>
                </button>
                {openMenu === 'currency' && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 overflow-hidden rounded-xl bg-white shadow-lg">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => pickCurrency(c)}
                        className={menuItemCls}
                      >
                        {c.label}
                        {c.code === currency && ' ✓'}
                        {!c.live && (
                          <span className="ml-2 text-xs text-gray-400">soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {/* Share on Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Share WareShare on Facebook"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 cursor-pointer text-gray-300 hover:text-white"
                  viewBox="0 0 50 50"
                >
                  <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M37,19h-2c-2.14,0-3,0.5-3,2 v3h5l-1,5h-4v15h-5V29h-4v-5h4v-3c0-4,2-7,6-7c2.9,0,4,1,4,1V19z"></path>
                </svg>
              </a>

              {/* Share on X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Share WareShare on X"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 cursor-pointer text-gray-300 hover:text-white"
                  viewBox="0 0 50 50"
                >
                  <path d="M 11 4 C 7.134 4 4 7.134 4 11 L 4 39 C 4 42.866 7.134 46 11 46 L 39 46 C 42.866 46 46 42.866 46 39 L 46 11 C 46 7.134 42.866 4 39 4 L 11 4 z M 13.085938 13 L 21.023438 13 L 26.660156 21.009766 L 33.5 13 L 36 13 L 27.789062 22.613281 L 37.914062 37 L 29.978516 37 L 23.4375 27.707031 L 15.5 37 L 13 37 L 22.308594 26.103516 L 13.085938 13 z M 16.914062 15 L 31.021484 35 L 34.085938 35 L 19.978516 15 L 16.914062 15 z"></path>
                </svg>
              </a>

              {/* Share on WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Share WareShare on WhatsApp"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 cursor-pointer text-gray-300 hover:text-white"
                  viewBox="0 0 50 50"
                  fill="currentColor"
                >
                  <path d="M25,2C12.318,2,2,12.318,2,25c0,3.96,1.023,7.854,2.963,11.29L2.037,46.73c-0.096,0.343-0.003,0.711,0.245,0.966 C2.473,47.893,2.733,48,3,48c0.08,0,0.161-0.01,0.24-0.029l10.896-2.699C17.463,47.058,21.21,48,25,48c12.682,0,23-10.318,23-23 S37.682,2,25,2z M36.57,33.116c-0.492,1.362-2.852,2.605-3.986,2.772c-1.018,0.149-2.306,0.213-3.72-0.231 c-0.857-0.27-1.957-0.628-3.366-1.229c-5.923-2.526-9.791-8.415-10.087-8.804C15.116,25.235,13,22.463,13,19.594 s1.525-4.28,2.067-4.864c0.542-0.584,1.181-0.73,1.575-0.73s0.787,0.005,1.132,0.021c0.363,0.018,0.85-0.137,1.329,1.001 c0.492,1.168,1.673,4.037,1.819,4.33c0.148,0.292,0.246,0.633,0.05,1.022c-0.196,0.389-0.294,0.632-0.59,0.973 s-0.62,0.76-0.886,1.022c-0.296,0.291-0.603,0.606-0.259,1.19c0.344,0.584,1.529,2.493,3.285,4.039 c2.255,1.986,4.158,2.602,4.748,2.894c0.59,0.292,0.935,0.243,1.279-0.146c0.344-0.39,1.476-1.703,1.869-2.286 s0.787-0.487,1.329-0.292c0.542,0.194,3.445,1.604,4.035,1.896c0.59,0.292,0.984,0.438,1.132,0.681 C37.062,30.587,37.062,31.755,36.57,33.116z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Legal links */}
          <div className="flex w-full flex-col gap-2 px-1 font-normal text-gray-300 md:w-auto md:flex-row md:items-center md:gap-8">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} WareShare. All rights reserved.
            </p>
            <div>
              <ul className="flex gap-6 text-sm text-gray-300">
                <li className="decoration-1 underline-offset-1 hover:underline md:list-disc">
                  <Link to="/info/privacy">Privacy</Link>
                </li>
                <li className="list-disc decoration-1 underline-offset-1 hover:underline">
                  <Link to="/info/terms">Terms</Link>
                </li>
                <li className="list-disc decoration-1 underline-offset-1 hover:underline">
                  <Link to="/sitemap">Sitemap</Link>
                </li>
                <li className="list-disc decoration-1 underline-offset-1 hover:underline">
                  <Link to="/info/company-details">Company details</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
