import React from 'react';
import Terminal from './components/Terminal';
import ProjectGrid from './components/ProjectGrid';
import { motion } from 'framer-motion';
import { Github, Mail, Send, Linkedin, Youtube } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen transition-colors duration-300 relative overflow-hidden font-sans">
      {/* Background with abstract blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 dark:bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-secondary"
          >
            Sappy's Directory
          </motion.div>
          <div className="flex gap-4 items-center">
            <a
              href="/api/download-cv"
              className="hidden sm:inline-flex items-center px-4 py-2 bg-teal-50 dark:bg-primary/10 hover:bg-teal-100 dark:hover:bg-primary/20 text-teal-700 dark:text-primary border border-teal-200 dark:border-primary/50 rounded-lg hover:scale-105 transition-all duration-300 font-mono text-sm"
            >
              Download CV
            </a>
          </div>
        </header>

        <main className="space-y-32">
          {/* Hero Section */}
          <section id="home" className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="mb-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-purple-400 dark:from-primary dark:to-secondary rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <img
                src="https://avatars.githubusercontent.com/u/103425166?v=4"
                alt="Profile"
                className="relative w-32 h-32 rounded-full border-2 border-white/10 object-cover"
              />
            </div>
            <Terminal />
          </section>

          {/* Projects Section */}
          <section id="projects">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-3xl font-bold mb-12 text-center"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-white">Featured Projects</span>
            </motion.h2>
            <ProjectGrid />
          </section>


          {/* My Links Section */}
          <section id="links" className="text-center">
            <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Content & Code</h2>
            <div className="flex justify-center gap-6 flex-wrap">
              <a
                href="https://youtube.com/@BigSmokeYt"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3 bg-white/10 dark:bg-glass rounded-xl hover:bg-red-500/10 dark:hover:bg-red-500/20 text-gray-800 dark:text-white transition-all hover:scale-105 border border-gray-200/50 dark:border-transparent hover:border-red-400"
              >
                <Youtube size={24} className="text-red-500 group-hover:text-red-600 transition-colors" />
                <span className="font-mono font-bold">YouTube</span>
              </a>
              <a
                href="https://github.com/ShaptakNaskar"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3 bg-white/10 dark:bg-glass rounded-xl hover:bg-gray-500/10 dark:hover:bg-gray-500/20 text-gray-800 dark:text-white transition-all hover:scale-105 border border-gray-200/50 dark:border-transparent hover:border-gray-400"
              >
                <Github size={24} className="text-gray-700 dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors" />
                <span className="font-mono font-bold">GitHub</span>
              </a>
            </div>
          </section>

          {/* Contact / Footer */}
          <section id="contact" className="pb-20 text-center">
            <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Let's Connect</h2>
            <div className="flex justify-center gap-6">
              <a href="https://linkedin.com/in/shaptak" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-blue-600/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-blue-500 border border-gray-200/50 dark:border-transparent"><Linkedin size={24} /></a>
              <a href="mailto:ddtectiv.ddip2017@gmail.com" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-primary/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-primary border border-gray-200/50 dark:border-transparent"><Mail size={24} /></a>
              <a href="https://t.me/ProllySappy" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-blue-400/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-blue-400 border border-gray-200/50 dark:border-transparent"><Send size={24} /></a>
            </div>
            <p className="mt-12 text-gray-500 text-sm font-mono">
              © {new Date().getFullYear()} Shaptak Naskar. Built with React & Tailwind.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
