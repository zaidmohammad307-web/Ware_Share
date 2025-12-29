// client/src/components/ui/AccountNav.jsx
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';

const AccountNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  let subpage = pathname.split('/')?.[2];
  if (subpage === undefined) {
    subpage = 'profile';
  }

  const linkClasses = (type = null) => {
    let classes =
      'inline-flex gap-1 rounded-full px-4 py-2 text-sm font-semibold border';

    if (type === subpage) {
      classes += ' bg-primary text-white border-primary';
    } else {
      classes += ' bg-gray-200';
    }

    return classes;
  };

  const isAdmin =
    user && user.email && user.email.toLowerCase() === 'admin@123456';

  return (
    <nav className="mt-24 mb-8 flex flex-wrap justify-center gap-4">
      <Link className={linkClasses('dashboard')} to="/dashboard">
        Dashboard
      </Link>

      <Link className={linkClasses('profile')} to="/account">
        My profile
      </Link>

      <Link className={linkClasses('bookings')} to="/account/bookings">
        My bookings
      </Link>

      <Link className={linkClasses('places')} to="/account/places">
        My warehouses
      </Link>

      <Link className={linkClasses('owner')} to="/account/owner/bookings">
        Requests to my warehouses
      </Link>

      <Link className={linkClasses('chats')} to="/account/chats">
        Messages
      </Link>

      {isAdmin && (
        <Link
          className={linkClasses('admin-hosts')}
          to="/account/admin/hosts"
        >
          Admin host verification
        </Link>
      )}

      {isAdmin && (
        <Link className={linkClasses('admin-dashboard')} to="/admin/dashboard">
          Admin dashboard
        </Link>
      )}
    </nav>
  );
};

export default AccountNav;
