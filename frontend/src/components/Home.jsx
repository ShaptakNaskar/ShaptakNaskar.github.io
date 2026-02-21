import React from 'react';
import Terminal from './Terminal';
import ProjectGrid from './ProjectGrid';
import WebAppGrid from './WebAppGrid';
import BlogList from './BlogList';
import MilestonePopup from './MilestonePopup';
import { motion } from 'framer-motion';
import { Github, Mail, Send, Linkedin, Youtube, FileText } from 'lucide-react';

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
                <Terminal />
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
                    <a href="/api/download-cv" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white/10 dark:bg-glass rounded-full hover:bg-purple-500/20 text-gray-800 dark:text-white transition-all hover:scale-105 hover:text-purple-500 border border-gray-200/50 dark:border-transparent font-medium" title="Download CV">
                        <FileText size={20} />
                        <span>Get my CV</span>
                    </a>
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
