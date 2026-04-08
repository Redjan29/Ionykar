// src/pages/CarDetails.jsx
import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

export default function CarDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paramsString = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    // no-op; keeps React strict mode consistent
  }, []);

  // Deep-link support: redirect to /cars?car=:id&<existing search params>
  return (
    <Navigate
      to={`/cars?${paramsString ? `${paramsString}&` : ""}car=${encodeURIComponent(id)}`}
      replace
    />
  );
}
