// client/src/pages/SitemapPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks';

const SECTIONS = [
  {
    heading: 'Marketplace',
    links: [
      { label: 'Find storage (home)', to: '/' },
      { label: 'Coming soon / waitlist', to: '/launch' },
      { label: 'Login', to: '/login' },
      { label: 'Create an account', to: '/register' },
    ],
  },
  {
    heading: 'Your account',
    links: [
      { label: 'My profile', to: '/account' },
      { label: 'My bookings', to: '/account/bookings' },
      { label: 'My warehouses', to: '/account/places' },
      { label: 'Requests to my warehouses', to: '/account/owner/bookings' },
      { label: 'Messages', to: '/account/chats' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    heading: 'Help & support',
    links: [
      { label: 'Help Center', to: '/info/help-center' },
      { label: 'Safety & security guidelines', to: '/info/safety-security' },
      { label: 'Warehouse access & check-in', to: '/info/warehouse-access' },
      { label: 'Insurance & claims', to: '/info/insurance-claims' },
      { label: 'Report an issue', to: '/support/report' },
    ],
  },
  {
    heading: 'For warehouse owners',
    links: [
      { label: 'List your warehouse', to: '/info/list-your-warehouse' },
      { label: 'Pricing & utilization tips', to: '/info/pricing-tips' },
      { label: 'Operational best practices', to: '/info/best-practices' },
      { label: 'Partner & enterprise solutions', to: '/info/partners' },
      { label: 'Create a listing', to: '/account/places/new' },
    ],
  },
  {
    heading: 'About WareShare',
    links: [
      { label: 'Our mission', to: '/info/mission' },
      { label: 'How the marketplace works', to: '/info/how-it-works' },
      { label: 'Careers', to: '/info/careers' },
      { label: 'Press & media', to: '/info/press' },
      { label: 'ESG & sustainability', to: '/info/esg' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', to: '/info/privacy' },
      { label: 'Terms of service', to: '/info/terms' },
      { label: 'Company details', to: '/info/company-details' },
    ],
  },
];

const SitemapPage = () => {
  usePageTitle('Sitemap');

  return (
    <div className="mt-24 px-4 pb-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-gray-900">Sitemap</h1>
        <p className="mt-2 text-gray-600">Every page on WareShare.</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                {s.heading}
              </h2>
              <ul className="space-y-1.5">
                {s.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SitemapPage;
