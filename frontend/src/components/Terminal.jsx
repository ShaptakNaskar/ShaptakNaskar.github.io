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
            <div className="bg-[#15161E] px-4 py-2 flex items-center border-b border-gray-700 relative h-10">
                <div className="flex gap-2 z-10">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="absolute inset-x-0 flex justify-center items-center text-xs text-gray-400 font-mono">
                    sappy@ai-dev:~
                </div>
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
                                .typeString('<span class="text-xl">Hey! I’m <strong class="text-primary">Sappy</strong>.</span><br/><br/>')
                                .pauseFor(500)
                                .typeString('I build <span class="text-secondary">AI-powered web experiences</span>.')
                                .pauseFor(600)
                                .deleteChars(27)
                                .typeString('<span class="text-green-400">AI-assisted MERN applications</span>.')
                                .pauseFor(600)
                                .deleteChars(30)
                                .typeString('things that are <span class="text-secondary">useful</span>, <span class="text-green-400">fast</span>, and a little <span class="text-pink-400">fun</span>.<br/>')
                                .pauseFor(500)
                                .typeString('<br/>When I’m not coding, I’m probably playing <span class="text-pink-400">video games</span> 🎮 or exploring new tools.<br/>')
                                .pauseFor(900)
                                .typeString('<br/>Welcome to my digital garden.')
                                .start();
                        }}
                    />

                </div>
            </div>
        </motion.div>
    );
};

export default Terminal;
