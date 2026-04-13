import React from 'react';
import Terminal from './Terminal';
import ProjectGrid from './ProjectGrid';
import WebAppGrid from './WebAppGrid';
import BlogList from './BlogList';
import MilestonePopup from './MilestonePopup';
import { motion } from 'framer-motion';
import { Github, Mail, Send, Linkedin, Youtube, FileText, Download, Gamepad2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

function Home() {
    const [hitCount, setHitCount] = React.useState(null);
    const [showMilestone, setShowMilestone] = React.useState(false);

    React.useEffect(() => {
        fetch('/api/hits')
            .then(res => res.json())
            .then(data => {
                setHitCount(data.count);
                checkMilestone(data.count);
            })
            .catch(err => console.error('Error fetching hits:', err));
    }, []);

    const checkMilestone = (count) => {
        if (!count) return;

        // Powers of 10 check: 100, 1000, 10000, etc.
        const log10 = Math.log10(count);
        const isPowerOf10 = Number.isInteger(log10) && log10 >= 2; // Starts from 100

        if (isPowerOf10) {
            setShowMilestone(true);
        }
    };

    return (
        <div className="space-y-32">
            <MilestonePopup
                isOpen={showMilestone}
                onClose={() => setShowMilestone(false)}
                hitCount={hitCount}
            />
            {/* Hero Section */}
            <section id="home" className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mb-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-purple-400 dark:from-primary dark:to-secondary rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <img
                        src="/api/pfp"
                        alt="Profile"
                        className="relative w-32 h-32 rounded-full border-2 border-white/10 object-cover"
                    />
                </div>

                {/* Role Title + Open to Work */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 flex flex-col items-center gap-3"
                >
                    <h1 className="text-lg md:text-xl font-mono text-gray-600 dark:text-gray-400 tracking-wide">
                        AI-Assisted Full Stack Developer
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium font-mono rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Open to Opportunities
                    </span>
                </motion.div>

                <Terminal />

                {/* Hero CTA - View CV */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 flex gap-4"
                >
                    <a
                        href="/api/download-cv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-secondary text-white font-medium hover:scale-105 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40"
                    >
                        <FileText size={18} />
                        <span>View my CV</span>
                    </a>
                    <a
                        href="https://github.com/ShaptakNaskar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 dark:bg-glass text-gray-800 dark:text-white font-medium hover:scale-105 transition-all border border-gray-200/50 dark:border-glass-border hover:border-primary/30"
                    >
                        <Github size={18} />
                        <span>GitHub</span>
                    </a>
                </motion.div>
            </section>

            {/* Web Apps Section */}
            <section id="webapps">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-3xl font-bold mb-12 text-center"
                >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-white">Featured Web Apps</span>
                </motion.h2>
                <WebAppGrid />
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

            {/* Blog Section */}
            <section id="blogs">
                <motion.h2
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-3xl font-bold mb-12 text-center"
                >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-purple-600 dark:from-primary dark:to-white">My Blogs</span>
                </motion.h2>
                <BlogList />
            </section>

            {/* Games Teaser */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
            >
                <Link
                    to="/games"
                    className="group flex items-center justify-center gap-3 mx-auto max-w-lg px-6 py-4 rounded-2xl bg-white/5 dark:bg-glass border border-gray-200/30 dark:border-glass-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                >
                    <Gamepad2 size={20} className="text-gray-500 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-mono text-gray-500 group-hover:text-gray-300 transition-colors">
                        Got 5 minutes? Take a break in the
                    </span>
                    <span className="text-sm font-mono font-bold text-teal-600 dark:text-primary group-hover:translate-x-1 transition-transform">
                        Arcade →
                    </span>
                </Link>
            </motion.section>

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
                    <a href="https://linkedin.com/in/shaptak" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-blue-600/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-blue-500 border border-gray-200/50 dark:border-transparent" title="LinkedIn"><Linkedin size={24} /></a>
                    <a href="mailto:ddtectiv.ddip2017@gmail.com" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-primary/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-primary border border-gray-200/50 dark:border-transparent" title="Email"><Mail size={24} /></a>
                    <a href="https://t.me/ProllySappy" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-glass rounded-full hover:bg-blue-400/20 text-gray-800 dark:text-white transition-all hover:scale-110 hover:text-blue-400 border border-gray-200/50 dark:border-transparent" title="Telegram"><Send size={24} /></a>
                </div>
                <div className="mt-12 text-gray-500 text-sm font-mono flex flex-col items-center gap-2">
                    <p>© {new Date().getFullYear()} Shaptak Naskar. Built with React & Tailwind.</p>
                    <p>Page hits since inception : {hitCount !== null ? hitCount : '...'}</p>
                </div>
            </section>
        </div>
    );
}

export default Home;
