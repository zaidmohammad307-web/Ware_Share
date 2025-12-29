import React from 'react';
import { Link } from 'react-router-dom';

const PlaceCard = ({ place }) => {
  const {
    _id: placeId,
    photos,
    address,
    title,
    price,
    pricePerDay,
    negotiablePrice,
  } = place;

  const displayPrice =
    pricePerDay !== undefined && pricePerDay !== null && String(pricePerDay) !== ''
      ? pricePerDay
      : price;

  return (
    <Link to={`/place/${placeId}`} className="m-4 flex flex-col md:m-2 xl:m-0">
      <div className="card">
        {photos?.[0] && (
          <div className="relative">
            <img
              src={`${photos?.[0]}`}
              className="h-4/5 w-full rounded-xl object-cover"
              alt={title || 'Warehouse'}
            />

            {negotiablePrice && (
              <span className="absolute left-2 top-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                Negotiable
              </span>
            )}
          </div>
        )}

        <h2 className="truncate font-bold">{address}</h2>
        <h3 className="truncate text-sm text-gray-500">{title}</h3>

        <div className="mt-1 flex items-center gap-2">
          <div>
            <span className="font-semibold">JOD{displayPrice} </span>
            <span className="text-sm text-gray-700">per day</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PlaceCard;
