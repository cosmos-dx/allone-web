import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Key,
  Smartphone,
  Share2,
  Users,
  Settings,
} from 'lucide-react';

export default function RightSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', color: 'from-purple-500 to-purple-600' },
    { icon: Key, label: 'Passwords', path: '/passwords', color: 'from-blue-500 to-blue-600' },
    { icon: Smartphone, label: 'Authenticator', path: '/authenticator', color: 'from-orange-500 to-orange-600' },
    { icon: Share2, label: 'Shared', path: '/shared', color: 'from-green-500 to-green-600' },
    { icon: Users, label: 'Spaces', path: '/spaces', color: 'from-indigo-500 to-indigo-600' },
    { icon: Settings, label: 'Settings', path: '/settings', color: 'from-gray-500 to-gray-600' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (path) => {
    navigate(path);
  };

  return (
    <>
      {/* Desktop: Right Sidebar */}
      <div className="fixed right-4 top-[50%] -translate-y-1/2 z-30 hidden lg:block">
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-4 shadow-2xl backdrop-blur-xl bg-white/80 border border-gray-200/50 overflow-hidden"
          style={{ height: '50vh', minHeight: '500px', width: '80px' }}
        >
          <div className="flex flex-col items-center justify-center h-full gap-4 overflow-visible">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <div
                  key={item.path}
                  className="relative flex items-center justify-center w-full"
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <motion.button
                    onClick={() => handleClick(item.path)}
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      transition-all duration-300 ease-in-out
                      flex-shrink-0
                      ${active 
                        ? `bg-gradient-to-br ${item.color} text-white shadow-lg scale-110` 
                        : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80 hover:scale-105'
                      }
                    `}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                  </motion.button>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredItem === item.path && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none z-50"
                        style={{ left: 'auto', right: 'calc(100% + 12px)' }}
                      >
                        <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          {item.label}
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Mobile: Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-2 shadow-2xl backdrop-blur-xl bg-white/90 border border-gray-200/50 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <motion.button
                  key={item.path}
                  onClick={() => handleClick(item.path)}
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    transition-all duration-300 ease-in-out
                    flex-shrink-0
                    ${active 
                      ? `bg-gradient-to-br ${item.color} text-white shadow-lg scale-110` 
                      : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/80'
                    }
                  `}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </>
  );
}

