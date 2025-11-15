import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Search,
  MessageSquare,
} from 'lucide-react';
import { Button } from './ui/button';
import SearchBar from './SearchBar';
import AIAssistant from './AIAssistant';
import NotificationDropdown from './NotificationDropdown';
import RightSidebar from './RightSidebar';
import { toast } from 'sonner';

export default function Layout({ children }) {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);


  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50">
      {/* Top Bar */}
      <div className="glass sticky top-0 z-40 px-3 sm:px-4 py-3 shadow-sm w-full overflow-x-hidden" style={{ overflowY: 'visible' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="logo-lockup cursor-pointer flex items-center gap-2" onClick={() => navigate('/dashboard')}>
              <img 
                src="/Alloneicon.svg" 
                alt="AllOne" 
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-xl font-bold gradient-text hidden sm:block">AllOne</h1>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl relative">
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
            
            <NotificationDropdown />
            
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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600"
              data-testid="top-logout-btn"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
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

      <div className="flex relative">
        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 min-h-[calc(100vh-57px)] pb-20 lg:pb-8 w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* AI Assistant Sidebar */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* Right Sidebar Navigation - Icons Only */}
      <RightSidebar />
    </div>
  );
}