import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for unified game input handling
 * Supports keyboard, mouse, and touch inputs
 */
export function useGameInput({
    onKeyDown,
    onKeyUp,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onSwipe,
    targetRef,
    enabled = true
}) {
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
    const swipeThreshold = 30;

    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
        onTouchStart?.(e, touch);
    }, [onTouchStart]);

    const handleTouchMove = useCallback((e) => {
        if (!onTouchMove) return;
        const touch = e.touches[0];
        onTouchMove(e, touch);
    }, [onTouchMove]);

    const handleTouchEnd = useCallback((e) => {
        const touch = e.changedTouches[0];
        const start = touchStartRef.current;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const deltaTime = Date.now() - start.time;

        // Detect swipe if fast enough and long enough
        if (deltaTime < 300) {
            if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    onSwipe?.(deltaX > 0 ? 'right' : 'left');
                } else {
                    onSwipe?.(deltaY > 0 ? 'down' : 'up');
                }
            }
        }

        onTouchEnd?.(e, touch);
    }, [onSwipe, onTouchEnd]);

    useEffect(() => {
        if (!enabled) return;

        const target = targetRef?.current || window;

        // Keyboard events always on window
        if (onKeyDown) window.addEventListener('keydown', onKeyDown);
        if (onKeyUp) window.addEventListener('keyup', onKeyUp);

        // Mouse events
        if (onMouseMove) target.addEventListener('mousemove', onMouseMove);
        if (onMouseDown) target.addEventListener('mousedown', onMouseDown);
        if (onMouseUp) target.addEventListener('mouseup', onMouseUp);

        // Touch events
        target.addEventListener('touchstart', handleTouchStart, { passive: false });
        target.addEventListener('touchmove', handleTouchMove, { passive: false });
        target.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
            if (onKeyUp) window.removeEventListener('keyup', onKeyUp);
            if (onMouseMove) target.removeEventListener('mousemove', onMouseMove);
            if (onMouseDown) target.removeEventListener('mousedown', onMouseDown);
            if (onMouseUp) target.removeEventListener('mouseup', onMouseUp);
            target.removeEventListener('touchstart', handleTouchStart);
            target.removeEventListener('touchmove', handleTouchMove);
            target.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, targetRef, onKeyDown, onKeyUp, onMouseMove, onMouseDown, onMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

/**
 * Helper hook to get relative position within a canvas/element
 */
export function useRelativePosition(canvasRef) {
    const getPosition = useCallback((clientX, clientY) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }, [canvasRef]);

    return getPosition;
}

export default useGameInput;
