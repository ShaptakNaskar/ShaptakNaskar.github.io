import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToHashElement = () => {
    const location = useLocation();

    useEffect(() => {
        const hash = location.hash;
        if (hash) {
            // Wait for AnimatePresence exit (300ms) + mounting time
            const scrollToElement = () => {
                const element = document.getElementById(hash.replace("#", ""));
                if (element) {
                    const headerOffset = 100;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                    return true;
                }
                return false;
            };

            // Try immediately (for direct load)
            if (!scrollToElement()) {
                // Retry after transition
                setTimeout(() => {
                    if (!scrollToElement()) {
                        // One last try
                        setTimeout(scrollToElement, 300);
                    }
                }, 400);
            }
        } else {
            // Standard behavior is usually scroll top on route change.
            window.scrollTo(0, 0);
        }
    }, [location]);

    return null;
};

export default ScrollToHashElement;
