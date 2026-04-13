import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BlogList = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/blogs')
            .then(res => res.json())
            .then(data => {
                setBlogs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching blogs:', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="text-center font-mono opacity-60">
                <span className="inline-block animate-pulse">Loading amazing thoughts...</span>
            </div>
        );
    }

    if (blogs.length === 0) {
        return (
            <div className="text-center font-mono opacity-60">
                No blogs found yet. Stay tuned!
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
                <div
                    key={index}
                    className="group relative bg-white/5 dark:bg-glass rounded-xl overflow-hidden border border-gray-200/50 dark:border-transparent hover:border-teal-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10"
                >
                    <Link to={`/blog/${blog.Slug}`} className="block h-full">
                        <div className="aspect-video overflow-hidden">
                            <img
                                src={blog.CoverImage}
                                alt={blog.Title}
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            />
                        </div>

                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-teal-400 transition-colors line-clamp-2">
                                {blog.Title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                {blog.Preview}
                            </p>

                            <div className="mt-4 flex items-center text-teal-600 dark:text-teal-400 text-sm font-mono">
                                <span className="mr-2">Read more</span>
                                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default BlogList;
