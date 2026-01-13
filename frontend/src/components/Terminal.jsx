import React from 'react';
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';

const Terminal = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass-panel rounded-xl overflow-hidden w-full max-w-3xl backdrop-blur-md bg-[#1a1b26] border border-gray-700 shadow-2xl"
        >
            {/* Terminal Header */}
            <div className="bg-[#15161E] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1 text-center text-xs text-gray-400 font-mono">sappy@dev-environment:~</div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 font-mono text-lg text-gray-300 min-h-[300px]">
                <div className="flex gap-2">
                    <span className="text-primary">➜</span>
                    <span className="text-secondary">~</span>
                    <span className="text-green-400">whoami</span>
                </div>
                <div className="mt-4 leading-relaxed">
                    <Typewriter
                        onInit={(typewriter) => {
                            typewriter
                                .changeDelay(40)
                                .typeString('<span class="text-xl">Hello! I am <strong class="text-primary">Sappy</strong>.</span><br/><br/>')
                                .pauseFor(500)
                                .typeString('I am a <span class="text-secondary">Python Developer</span>.')
                                .pauseFor(500)
                                .deleteChars(18)
                                .typeString('<span class="text-secondary"> AI Developer</span>.')
                                .pauseFor(500)
                                .deleteChars(14)
                                .typeString(' Passionate tech enthusiast who loves building cool stuff.<br/>')
                                .pauseFor(500)
                                .typeString('And yes, I love playing <span class="text-pink-400">video games</span>! 🎮<br/>')
                                .pauseFor(1000)
                                .typeString('<br/>Welcome to my digital garden. 🌿')
                                .start();
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default Terminal;
