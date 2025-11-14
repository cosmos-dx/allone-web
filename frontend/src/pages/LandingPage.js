import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Smartphone, Brain, Users, Zap, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function LandingPage() {
  const { loginWithGoogle } = useAuth();
  const [typewriterText, setTypewriterText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  
  const phrases = [
    'Secure Your Digital Life',
    'One Password. All Accounts.',
    'Protected by AI'
  ];

  useEffect(() => {
    let timeout;
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (typewriterText.length < currentPhrase.length) {
      timeout = setTimeout(() => {
        setTypewriterText(currentPhrase.slice(0, typewriterText.length + 1));
      }, 100);
    } else {
      timeout = setTimeout(() => {
        setTypewriterText('');
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 3000);
    }
    
    return () => clearTimeout(timeout);
  }, [typewriterText, currentPhraseIndex]);

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      toast.success('Welcome to AllOne!');
    } catch (error) {
      toast.error('Failed to sign in. Please try again.');
    }
  };

  const features = [
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Password Management',
      description: 'Store and manage all your passwords securely with end-to-end encryption'
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'TOTP Authenticator',
      description: 'Generate 2FA codes with QR scanning and cloud backup'
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'AI Assistant',
      description: 'Get smart security suggestions and password analysis powered by AI'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Family Sharing',
      description: 'Create spaces to securely share passwords with family and teams'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50 overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="logo-lockup">
              <img 
                src="https://customer-assets.emergentagent.com/job_b2b6fbf0-c50c-4972-b29b-b2e5d9c1eec1/artifacts/snhi19yn_Alloneicon.png" 
                alt="AllOne" 
                className="w-10 h-10"
              />
              <h1 className="text-2xl font-bold gradient-text">AllOne</h1>
            </div>
            <Button 
              onClick={handleGoogleSignIn}
              className="bg-white/80 backdrop-blur-sm text-purple-700 hover:bg-white border-2 border-purple-200"
              data-testid="nav-signin-btn"
            >
              Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="gradient-text">{typewriterText}</span>
                <span className="animate-pulse">|</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl">
                AllOne is your all-in-one password manager with TOTP authenticator, 
                AI-powered security, and seamless family sharing. Keep your digital life secure.
              </p>
              <Button 
                onClick={handleGoogleSignIn}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-8 py-6 text-lg rounded-full hover:shadow-2xl hover:scale-105 smooth-transition"
                data-testid="hero-signin-btn"
              >
                Get Started Free
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="glass rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-center mb-6">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_b2b6fbf0-c50c-4972-b29b-b2e5d9c1eec1/artifacts/snhi19yn_Alloneicon.png" 
                    alt="AllOne Icon" 
                    className="w-32 h-32"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-purple-700">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Bank-level encryption</span>
                  </div>
                  <div className="flex items-center gap-3 text-orange-600">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium">Instant password generation</span>
                  </div>
                  <div className="flex items-center gap-3 text-purple-700">
                    <Brain className="w-5 h-5" />
                    <span className="font-medium">AI security insights</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 gradient-text">Everything You Need</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Powerful features designed to keep your digital life secure and organized
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="glass rounded-2xl p-6 shadow-lg hover:shadow-2xl smooth-transition"
              >
                <div className="text-purple-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 shadow-2xl"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 gradient-text">
              Ready to Secure Your Life?
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust AllOne to protect their digital identity
            </p>
            <Button 
              onClick={handleGoogleSignIn}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-10 py-6 text-lg rounded-full hover:shadow-2xl hover:scale-105 smooth-transition"
              data-testid="cta-signin-btn"
            >
              Start Free Today
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-600 bg-white/20 backdrop-blur-sm">
        <p>&copy; 2025 AllOne. All rights reserved.</p>
      </footer>
    </div>
  );
}