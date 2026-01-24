import React, { useState } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Home from './components/Home';
import BlogPost from './components/BlogPost';
import ScrollToHashElement from './components/ScrollToHashElement';
import ScrollToTopButton from './components/ScrollToTopButton';
import Games from './components/Games';
import Paddles from './components/games/Paddles';
import WordGuess from './components/games/WordGuess';
import Game2048 from './components/games/Game2048';
import Breakout from './components/games/Breakout';
import CosmicLander from './components/games/CosmicLander';
import SpaceDefender from './components/games/SpaceDefender';

function App() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Projects', hash: '#projects' },
    { name: 'Blogs', hash: '#blogs' },
    { name: 'Games', path: '/games' },
    { name: 'Content', hash: '#links' },
    { name: 'Contact', hash: '#contact' },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const isGameRoute = location.pathname.startsWith('/games/');

  return (
    <div className="min-h-screen transition-colors duration-300 relative overflow-hidden font-sans">
      <ScrollToHashElement />
      <ScrollToTopButton />
      {/* Background with abstract blobs - Consistent across pages */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 dark:bg-primary/20 rounded-full blur-[120px] ${isGameRoute ? '' : 'animate-pulse'}`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[120px] ${isGameRoute ? '' : 'animate-pulse delay-1000'}`} />
      </div>

      {/* Main Content Shell */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-secondary cursor-pointer"
            onClick={() => window.location.href = '/'}
          >
            Sappy's Directory
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path || `/${link.hash}`}
                className="text-sm font-mono text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-300" />
            ) : (
              <Menu size={24} className="text-gray-300" />
            )}
          </button>
        </header>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mb-8 overflow-hidden"
            >
              <div className="glass-panel rounded-2xl p-4 space-y-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={link.path || `/${link.hash}`}
                      onClick={handleNavClick}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-primary hover:bg-white/10 transition-all font-mono text-sm"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Home />
                  </motion.div>
                }
              />
              <Route
                path="/blog/:slug"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BlogPost />
                  </motion.div>
                }
              />
              <Route
                path="/games"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Games />
                  </motion.div>
                }
              />
              <Route
                path="/games/paddles"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Paddles />
                  </motion.div>
                }
              />
              <Route
                path="/games/wordguess"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <WordGuess />
                  </motion.div>
                }
              />
              <Route
                path="/games/2048"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Game2048 />
                  </motion.div>
                }
              />
              <Route
                path="/games/breakout"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Breakout />
                  </motion.div>
                }
              />
              <Route
                path="/games/cosmic-lander"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CosmicLander />
                  </motion.div>
                }
              />
              <Route
                path="/games/space-defender"
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SpaceDefender />
                  </motion.div>
                }
              />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
