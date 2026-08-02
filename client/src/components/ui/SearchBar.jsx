// client/src/components/ui/SearchBar.jsx
import { useState } from 'react';
import { usePrefs } from '@/providers/PreferencesProvider';

const STR = {
  EN: {
    placeholder: 'Search warehouses...',
    search: 'Search',
  },
  AR: {
    placeholder: 'ابحث عن المستودعات...',
    search: 'بحث',
  },
};

const SearchBar = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState('');
  const { lang } = usePrefs();
  const L = STR[lang] || STR.EN;

  // Safe handler: rawValue is always a string
  const handleSearch = (rawValue = '') => {
    const safeValue =
      typeof rawValue === 'string' ? rawValue : '';

    setInputValue(safeValue);

    const term = safeValue.trimStart();

    if (typeof onSearch === 'function') {
      onSearch(term);
    }
  };

  const handleChange = (e) => {
    // e.target.value is always a string, but we still guard
    handleSearch(e.target.value ?? '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e.target.value ?? '');
    }
  };

  const handleButtonClick = () => {
    // important: we pass the current value, not call with no args
    handleSearch(inputValue);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        className="w-full rounded-xl border px-3 py-2 text-sm"
        placeholder={L.placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
      >
        {L.search}
      </button>
    </div>
  );
};

export default SearchBar;
  