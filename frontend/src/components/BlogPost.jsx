import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';

const BlogPost = () => {
    const { slug } = useParams();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/blogs/${slug}`)
            .then(res => {
                if (!res.ok) throw new Error('Blog post not found');
                return res.text();
            })
            .then(data => {
                setContent(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching blog:', err);
                setError(err.message);
                setLoading(false);
            });
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center font-mono opacity-60">
                <span className="animate-pulse">Loading content...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                <div className="text-red-400 text-xl font-bold mb-4">Oops! {error}</div>
                <Link
                    to="/"
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Go Home
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 animate-fade-in pb-20">
            <Link
                to="/"
                className="inline-flex items-center gap-2 mb-8 text-gray-500 hover:text-teal-400 transition-colors group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-mono">Back to Home</span>
            </Link>

            <article className="prose prose-base md:prose-lg dark:prose-invert prose-headings:font-bold prose-a:text-teal-400 hover:prose-a:text-teal-300 prose-img:rounded-xl max-w-none bg-white/5 dark:bg-glass p-8 md:p-12 rounded-2xl border border-gray-200/50 dark:border-transparent">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </article>

            <div className="mt-12 text-center">
                <div className="inline-block p-[1px] bg-gradient-to-r from-teal-400 to-purple-400 rounded-full">
                    <Link
                        to="/#blogs"
                        className="block px-8 py-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors font-mono font-bold text-sm"
                    >
                        Read more articles
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;
