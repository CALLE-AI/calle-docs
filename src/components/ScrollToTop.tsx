import { useEffect, useState } from "react";
import { ArrowUpIcon } from "zudoku/icons";
import { Button } from "zudoku/ui/Button.js";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > window.innerHeight);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="scroll-to-top"
      aria-label="Scroll to top"
      aria-hidden={!isVisible}
      title="Scroll to top"
      tabIndex={isVisible ? 0 : -1}
      data-testid="scroll-to-top"
      data-visible={isVisible}
      onClick={scrollToTop}
    >
      <ArrowUpIcon aria-hidden="true" />
    </Button>
  );
};
