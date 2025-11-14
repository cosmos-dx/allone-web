import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Key, 
  Smartphone, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import SearchBar from './SearchBar';
import AIAssistant from './AIAssistant';
import { toast } from 'sonner';

export default function Layout({ children }) {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Key className="w-5 h-5" />, label: 'Passwords', path: '/passwords' },
    { icon: <Smartphone className="w-5 h-5" />, label: 'Authenticator', path: '/authenticator' },
    { icon: <Users className="w-5 h-5" />, label: 'Spaces', path: '/spaces' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50">
      {/* Top Bar */}
      <div className="glass sticky top-0 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo and Menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="lg:hidden"
              data-testid="menu-toggle-btn"
            >
              {isNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="logo-lockup cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img 
                src="https://customer-assets.emergentagent.com/job_b2b6fbf0-c50c-4972-b29b-b2e5d9c1eec1/artifacts/snhi19yn_Alloneicon.png" 
                alt="AllOne" 
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold gradient-text hidden sm:block">AllOne</h1>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden"
              data-testid="search-toggle-btn"
            >
              <Search className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIOpen(!isAIOpen)}
              className="relative"
              data-testid="ai-toggle-btn"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
            </Button>

            {currentUser?.photoURL && (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full border-2 border-purple-200"
              />
            )}
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 md:hidden"
          >
            <SearchBar />
          </motion.div>
        )}
      </div>

      <div className="flex">
        {/* Curved Navigation Sidebar */}
        <AnimatePresence>
          {(isNavOpen || window.innerWidth >= 1024) && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] w-64 z-30"
            >
              <div className="glass-dark h-full rounded-r-3xl shadow-2xl p-6 flex flex-col">
                <nav className="flex-1 space-y-2">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl smooth-transition ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white shadow-lg'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                        data-testid={`nav-${item.label.toLowerCase()}`}
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/20 smooth-transition"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-57px)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* AI Assistant Sidebar */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* Overlay for mobile nav */}
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsNavOpen(false)}
        ></div>
      )}
    </div>
  );
}