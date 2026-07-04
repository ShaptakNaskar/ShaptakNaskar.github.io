import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Layers, Sparkles, Cpu, ShieldCheck, Wrench } from 'lucide-react';

const TUX_ASCII = `      .--.
     |o_o |
     |:_/ |
    //   \\ \\
   (|     | )
  /'\\_   _/\`\\
  \\___)=(___/`;

const fetchLines = [
    ['host', 'Shaptak "Sappy" Naskar'],
    ['role', 'Full Stack & AI Developer'],
    ['os', 'Windows 11 · Linux (dual boot)'],
    ['kernel', 'NT internals · linux'],
    ['uptime', 'fixing PCs since 2015'],
    ['shell', 'bash · fish · PowerShell'],
    ['languages', 'JavaScript · Python · Dart · Bash'],
    ['stack', 'MERN · Flutter · Tailwind CSS'],
    ['ai', 'OpenAI · Groq Whisper v3 · GPT-OSS-120B'],
    ['tools', 'git · adb · vite · vercel · exiftool'],
    ['resolution', 'full stack → bare metal'],
];

const paletteColors = [
    'bg-gray-800', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
    'bg-blue-500', 'bg-purple-500', 'bg-cyan-400', 'bg-gray-200',
];

const skillCategories = [
    {
        icon: Code2,
        title: 'Languages',
        comment: '// daily drivers',
        skills: ['JavaScript', 'Python', 'Dart', 'HTML/CSS', 'Bash'],
    },
    {
        icon: Layers,
        title: 'Frameworks & Stack',
        comment: '// MERN & more',
        skills: ['React', 'Node.js', 'Express', 'MongoDB', 'Flutter', 'Tailwind CSS'],
    },
    {
        icon: Sparkles,
        title: 'AI & APIs',
        comment: '// think with AI, build with code',
        skills: ['OpenAI API', 'Groq Whisper v3', 'GPT-OSS-120B', 'REST APIs', 'AI Automation'],
    },
    {
        icon: Cpu,
        title: 'Systems & OS',
        comment: '// the family tech guy since 2015',
        skills: ['Windows internals (NT kernel)', 'Linux', 'Hardware diagnostics', 'PC building & repair', 'Dual-boot & VMs'],
    },
    {
        icon: ShieldCheck,
        title: 'Security',
        comment: '// trained & certified',
        skills: ['Threat detection', 'Encryption', 'Firewall configuration', 'Incident response', 'Ethical hacking basics'],
    },
    {
        icon: Wrench,
        title: 'Tools & Platforms',
        comment: '// the toolbox',
        skills: ['Git & GitHub', 'Vercel', 'Vite', 'ADB', 'ExifTool', 'Socket.IO'],
    },
];

function Skills() {
    return (
        <div className="space-y-10">
            {/* Neofetch panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="glass-panel rounded-xl overflow-hidden max-w-3xl mx-auto bg-[#1a1b26] border border-gray-700 shadow-2xl"
            >
                {/* Terminal header */}
                <div className="bg-[#15161E] px-4 py-2 flex items-center border-b border-gray-700 relative h-10">
                    <div className="flex gap-2 z-10">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="absolute inset-x-0 flex justify-center items-center text-xs text-gray-400 font-mono">
                        sappy@portfolio:~ $ neofetch
                    </div>
                </div>

                {/* Terminal body */}
                <div className="p-6 font-mono text-sm text-gray-300 flex flex-col sm:flex-row gap-6 sm:gap-10">
                    {/* ASCII art */}
                    <div className="hidden sm:flex flex-col items-center justify-center shrink-0">
                        <pre className="text-primary leading-tight text-xs md:text-sm">{TUX_ASCII}</pre>
                        <span className="mt-3 text-[10px] text-gray-500">
                            + NT on the other partition
                        </span>
                    </div>

                    {/* Fetch info */}
                    <div className="min-w-0">
                        <div>
                            <span className="text-green-400">sappy</span>
                            <span className="text-gray-500">@</span>
                            <span className="text-green-400">portfolio</span>
                        </div>
                        <div className="text-gray-600 mb-2">-----------------</div>
                        {fetchLines.map(([label, value]) => (
                            <div key={label} className="leading-relaxed">
                                <span className="text-primary">{label}</span>
                                <span className="text-gray-500">: </span>
                                <span className="text-gray-300">{value}</span>
                            </div>
                        ))}
                        {/* Classic neofetch color palette */}
                        <div className="flex mt-4">
                            {paletteColors.map((color) => (
                                <div key={color} className={`w-5 h-3 ${color}`}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Skill category grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skillCategories.map((category, index) => (
                    <motion.div
                        key={category.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.08 }}
                        className="glass-panel rounded-xl p-5 hover:border-primary/30 transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 mb-1">
                            <category.icon size={20} className="text-teal-600 dark:text-primary" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{category.title}</h3>
                        </div>
                        <p className="text-xs font-mono text-gray-500 mb-4">{category.comment}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {category.skills.map((skill) => (
                                <span
                                    key={skill}
                                    className="px-2 py-0.5 text-xs font-mono rounded-md bg-primary/10 text-teal-700 dark:text-primary/80 border border-primary/20"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default Skills;
