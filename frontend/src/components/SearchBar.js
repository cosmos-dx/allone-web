import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    if (isOpen && results) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, results]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInSearch = searchRef.current?.contains(event.target);
      const isClickInDropdown = dropdownRef.current?.contains(event.target);
      
      if (!isClickInSearch && !isClickInDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchDebounce = setTimeout(() => {
      if (query.length > 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API}/search`,
        { query },
        { headers }
      );
      setResults(response.data);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type) => {
    setIsOpen(false);
    setQuery('');
    navigate(type === 'password' ? '/passwords' : '/authenticator');
  };

  const totalResults = results ? (results.passwords?.length || 0) + (results.totps?.length || 0) : 0;

  return (
    <div ref={searchRef} className="relative w-full" data-testid="search-bar">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search passwords, TOTP codes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 2 && setIsOpen(true)}
          className="pl-10 pr-10 glass border-purple-200 focus:border-purple-400"
          data-testid="search-input"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bg-white rounded-xl shadow-2xl p-4 max-h-96 overflow-y-auto border border-gray-200"
            style={{ 
              zIndex: 9999,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
            data-testid="search-results"
          >
            {loading ? (
              <div className="text-center py-4 text-gray-500">Searching...</div>
            ) : totalResults === 0 ? (
              <div className="text-center py-4 text-gray-500">No results found</div>
            ) : (
              <div className="space-y-4">
                {results.passwords?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Passwords ({results.passwords.length})</h3>
                    <div className="space-y-2">
                      {results.passwords.slice(0, 5).map((pwd) => (
                        <div
                          key={pwd.passwordId}
                          onClick={() => handleResultClick('password')}
                          className="p-3 rounded-lg hover:bg-purple-50 cursor-pointer smooth-transition"
                        >
                          <div className="font-medium text-gray-800">{pwd.displayName}</div>
                          <div className="text-sm text-gray-500">{pwd.username || pwd.website}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.totps?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">TOTP Codes ({results.totps.length})</h3>
                    <div className="space-y-2">
                      {results.totps.slice(0, 5).map((totp) => (
                        <div
                          key={totp.totpId}
                          onClick={() => handleResultClick('totp')}
                          className="p-3 rounded-lg hover:bg-orange-50 cursor-pointer smooth-transition"
                        >
                          <div className="font-medium text-gray-800">{totp.serviceName}</div>
                          <div className="text-sm text-gray-500">{totp.account}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}