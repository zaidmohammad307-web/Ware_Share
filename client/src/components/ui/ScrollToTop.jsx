import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls the window back to the top whenever the route changes,
// so navigating from a scrolled list to a detail page starts at the top.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
