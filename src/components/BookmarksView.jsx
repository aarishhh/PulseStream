/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Bookmark, Trash2, MessageSquare, Repeat, Heart, Eye, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export const BookmarksView = () => {
  const navigate = useNavigate();
  const { 
    bookmarks, 
    bookmarkPost, 
    clearBookmarks, 
    likePost, 
    repostPost, 
    currentUser 
  } = useApp();

  const [expandedComments, setExpandedComments] = useState({});

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const isPostLiked = (post) => {
    return currentUser ? post.likes.includes(currentUser.username) : false;
  };

  const isPostReposted = (post) => {
    return currentUser ? post.reposts.includes(currentUser.username) : false;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] p-6 overflow-y-auto gap-6 scrollbar-thin">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Bookmarks</h1>
            <p className="text-xs text-gray-400 mt-0.5">Your private collection of saved content</p>
          </div>
        </div>
        {bookmarks.length > 0 && (
          <button 
            onClick={clearBookmarks}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors font-semibold bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {bookmarks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-3xl bg-[#090d1a]/20">
            <Bookmark className="w-10 h-10 text-gray-600 animate-pulse" />
            <span className="text-sm text-gray-400 font-medium">Your Bookmarks list is empty</span>
            <p className="text-xs text-gray-500 max-w-xs leading-normal">
              Bookmark posts from your home or explore feed to keep them in this directory.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/10">
            {bookmarks.map((post) => {
              const liked = isPostLiked(post);
              const reposted = isPostReposted(post);
              const commentsOpen = expandedComments[post.id] || false;

              return (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-5 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors"
                >
                  {/* Post Author Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.author.avatar}
                        alt={post.author.displayName}
                        onClick={() => navigate(`/profile/${post.author.username}`)}
                        className="w-10 h-10 rounded-full object-cover border border-white/5 cursor-pointer hover:border-blue-500/50 transition-colors"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={() => navigate(`/profile/${post.author.username}`)}
                            className="text-sm font-bold text-white hover:underline cursor-pointer"
                          >
                            {post.author.displayName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate">
                          @{post.author.username} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pl-13 flex flex-col gap-3">
                    <p 
                      onClick={() => navigate(`/posts/${post.id}`)}
                      className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap hover:text-white cursor-pointer transition-colors"
                    >
                      {post.content}
                    </p>

                    {/* Shared Image Attachment */}
                    {post.image && (
                      <div 
                        onClick={() => navigate(`/posts/${post.id}`)}
                        className="rounded-2xl overflow-hidden border border-white/5 max-h-96 cursor-pointer hover:border-white/10 transition-colors"
                      >
                        <img 
                          src={post.image} 
                          alt="Post media attachment" 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Actions Panel */}
                    <div className="flex items-center justify-between text-gray-500 max-w-md mt-1 border-t border-b border-white/5 py-2">
                      {/* Comments action */}
                      <button 
                        onClick={() => toggleComments(post.id)}
                        className={`flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors ${
                          commentsOpen ? "text-blue-400" : ""
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments.length}</span>
                      </button>

                      {/* Repost action */}
                      <button 
                        onClick={() => repostPost(post.id)}
                        className={`flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors ${
                          reposted ? "text-emerald-400" : ""
                        }`}
                      >
                        <Repeat className={`w-4 h-4 transition-transform duration-200 ${reposted ? "rotate-180" : ""}`} />
                        <span>{post.reposts.length}</span>
                      </button>

                      {/* Like action */}
                      <button 
                        onClick={() => likePost(post.id)}
                        className={`flex items-center gap-1.5 text-xs hover:text-rose-500 transition-colors ${
                          liked ? "text-rose-500" : ""
                        }`}
                      >
                        <motion.div
                          whileTap={{ scale: 0.8 }}
                          animate={liked ? { scale: [1, 1.45, 0.9, 1.15, 1] } : { scale: 1 }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          className="flex items-center justify-center"
                        >
                          <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                        </motion.div>
                        <span>{post.likes.length}</span>
                      </button>

                      {/* Views action */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <Eye className="w-4 h-4" />
                        <span>{post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}K` : post.views}</span>
                      </div>

                      {/* Bookmark action (Unbookmark) */}
                      <button 
                        onClick={() => bookmarkPost(post.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-yellow-500 hover:text-gray-400 transition-colors"
                        title="Remove from Bookmarks"
                      >
                        <Bookmark className="w-4 h-4 fill-yellow-500" />
                      </button>
                    </div>

                    {/* View original thread link */}
                    <button 
                      onClick={() => navigate(`/posts/${post.id}`)}
                      className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold mt-1 self-start hover:text-blue-300 transition-colors"
                    >
                      <span>View comments & conversation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
