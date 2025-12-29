// src/components/Logo.jsx
import { Link } from 'react-router-dom';

const Logo = ({ size = 32, showText = true }) => {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src="/brand/wareshare-logo.png"
        alt="WareShare"
        className="block"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-neutral-700">
          WareShare
        </span>
      )}
    </Link>
  );
};

export default Logo;
