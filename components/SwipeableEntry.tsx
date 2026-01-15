import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableEntryProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export const SwipeableEntry: React.FC<SwipeableEntryProps> = ({ children, onDelete, className = '' }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  // Mouse/Touch Handlers
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX.current;
    // Limit drag distance visually to avoid it flying off screen too far before release
    if (Math.abs(diff) < 200) {
        setOffsetX(diff);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    const threshold = 80; // px to trigger delete

    if (Math.abs(offsetX) > threshold) {
        // Trigger delete
        // We defer the reset slightly or let the parent unmount this component
        // But if the user cancels the delete confirmation, we need to snap back.
        // Since confirm() blocks, we can just call it then reset.
        requestAnimationFrame(() => {
             onDelete();
             setOffsetX(0);
        });
    } else {
        setOffsetX(0);
    }
  };

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Mouse Events (for desktop testing)
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => isDragging && handleMove(e.clientX);
  const onMouseUp = () => isDragging && handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

  // Opacity for background icons based on drag
  const iconOpacity = Math.min(Math.abs(offsetX) / 50, 1);

  return (
    <div className={`relative select-none ${className}`}>
      {/* Background Layer (Trash Icons) */}
      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl bg-red-950/30 border border-red-900/50">
        <div style={{ opacity: offsetX > 0 ? iconOpacity : 0 }} className="flex items-center gap-2 text-red-400 transition-opacity">
            <Trash2 size={20} />
        </div>
        <div style={{ opacity: offsetX < 0 ? iconOpacity : 0 }} className="flex items-center gap-2 text-red-400 transition-opacity">
            <Trash2 size={20} />
        </div>
      </div>

      {/* Foreground Content Card */}
      <div 
        className="relative transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </div>
  );
};