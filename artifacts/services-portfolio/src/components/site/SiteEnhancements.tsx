import { useEffect } from "react";
import { useLocation } from "wouter";

function ScrollToTopOnRouteChange() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return null;
}

export default function SiteEnhancements() {
  return (
    <>
      <ScrollToTopOnRouteChange />
    </>
  );
}
