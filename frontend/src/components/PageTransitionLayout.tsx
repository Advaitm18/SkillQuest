import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Wraps route content so each pathname change gets enter/exit motion.
 * Must sit in the route tree where a single <Outlet /> is the animated child.
 */
export default function PageTransitionLayout() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -14, filter: 'blur(2px)' }}
        transition={{
          duration: 0.38,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
