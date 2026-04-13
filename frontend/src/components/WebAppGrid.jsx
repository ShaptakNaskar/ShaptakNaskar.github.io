import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const WebAppGrid = () => {
    const [webApps, setWebApps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/webapps')
            .then(res => res.json())
            .then(data => {
                setWebApps(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch web apps', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webApps.map((app, index) => (
                <div
                    key={index}
                    className="glass-panel rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 group"
                >
                    <div className="h-48 overflow-hidden relative">
                        <img
                            src={app.AppImageLink}
                            alt={app.AppName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            {app.AppLink.startsWith('/') ? (
                                <Link
                                    to={app.AppLink}
                                    className="text-white hover:text-primary flex items-center gap-2 font-medium"
                                >
                                    Launch Interface <ExternalLink size={16} />
                                </Link>
                            ) : (
                                <a
                                    href={app.AppLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white hover:text-primary flex items-center gap-2 font-medium"
                                >
                                    Open Web App <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="p-5">
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-primary transition-colors">{app.AppName}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">{app.AppSummary}</p>
                        <div className="flex justify-between items-center mt-auto">
                            <div className="text-xs text-gray-500 font-mono"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WebAppGrid;
