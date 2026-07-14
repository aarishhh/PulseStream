/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  Repeat, 
  Heart, 
  Eye, 
  Bookmark, 
  Loader2, 
  CircleCheck, 
  Users, 
  Sparkles,
  ChevronRight,
  Flame
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { motion, AnimatePresence } from "motion/react";

export const SearchView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  
  const { 
    currentUser, 
    likePost, 
    repostPost, 
    bookmarkPost, 
    bookmarks,
    toggleFollow,
    commentPost
  } = useApp();

  const [postsResults, setPostsResults] = useState([]);
  const [usersResults, setUsersResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Local comment drawer/dialog state for posts
  const [expandedComments, setExpandedComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});

  const isPostLiked = (post) => {
    return currentUser ? post.likes.includes(currentUser.username) : false;
  };

  const isPostReposted = (post) => {
    return currentUser ? post.reposts.includes(currentUser.username) : false;
  };

  const isPostBookmarked = (postId) => {
    return bookmarks.some(b => b.id === postId);
  };

  const isFollowingUser = (username) => {
    return currentUser?.following.includes(username) || false;
  };

  const fetchResults = async () => {
    if (!query.trim()) {
      setPostsResults([]);
      setUsersResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPostsResults(data.posts || []);
        setUsersResults(data.users || []);
      }
    } catch (err) {
      console.error("Error searching:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query]);

  // Synchronize dynamic actions with local search results state
  const handleLike = async (postId) => {
    try {
      await likePost(postId);
      // Optimistic/Instant local update
      setPostsResults(prev => 
        prev.map(p => {
          if (p.id === postId) {
            const hasLiked = p.likes.includes(currentUser?.username || "");
            const newLikes = hasLiked 
              ? p.likes.filter(u => u !== currentUser?.username)
              : [...p.likes, currentUser?.username || ""];
            return { ...p, likes: newLikes };
          }
          return p;
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepost = async (postId) => {
    try {
      await repostPost(postId);
      setPostsResults(prev => 
        prev.map(p => {
          if (p.id === postId) {
            const hasReposted = p.reposts.includes(currentUser?.username || "");
            const newReposts = hasReposted 
              ? p.reposts.filter(u => u !== currentUser?.username)
              : [...p.reposts, currentUser?.username || ""];
            return { ...p, reposts: newReposts };
          }
          return p;
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookmark = async (postId) => {
    await bookmarkPost(postId);
  };

  const handleFollowToggleLocal = async (targetUsername) => {
    try {
      await toggleFollow(targetUsername);
      // Refresh current user or update users list dynamically
      setUsersResults(prev => 
        prev.map(u => {
          if (u.username === targetUsername) {
            const isFollower = u.followers.includes(currentUser?.username || "");
            const newFollowers = isFollower
              ? u.followers.filter(un => un !== currentUser?.username)
              : [...u.followers, currentUser?.username || ""];
            return { ...u, followers: newFollowers };
          }
          return u;
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommentSubmit = async (postId) => {
    const text = newCommentText[postId];
    if (!text || !text.trim()) return;

    try {
      const updatedPost = await commentPost(postId, text);
      setNewCommentText(prev => ({ ...prev, [postId]: "" }));
      // Update locally
      setPostsResults(prev => 
        prev.map(p => p.id === postId ? updatedPost : p)
      );
    } catch (err) {
      console.error("Error creating comment:", err);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] overflow-y-auto scrollbar-none">
      
      {/* Header Row */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 sticky top-0 bg-[#030712]/95 backdrop-blur-md z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg text-white">Search</h1>
          <p className="text-xs text-gray-400 font-mono">Results for "{query}"</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-[#030712]/50">
        {["all", "posts", "users"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-4 text-center text-sm font-bold relative transition-colors duration-200 capitalize focus:outline-none cursor-pointer"
            style={{ color: activeTab === tab ? "#ffffff" : "#9ca3af" }}
          >
            <span>{tab === "all" ? "Top Matches" : tab}</span>
            {activeTab === tab && (
              <motion.div 
                layoutId="searchTabUnderline"
                className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-[#1D9BF0] rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Section */}
      <div className="flex flex-col p-4 gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-[#1D9BF0] animate-spin" />
            <p className="text-xs text-gray-500 font-mono tracking-wider">SEARCHING platform...</p>
          </div>
        ) : !query.trim() ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
            <Search className="w-12 h-12 text-gray-600" />
            <span className="text-sm text-gray-400 font-medium">Type to explore PulseStream</span>
            <p className="text-xs text-gray-500 max-w-xs leading-normal">
              Type keywords, user handles, hashtags or names in the header search bar above.
            </p>
          </div>
        ) : postsResults.length === 0 && usersResults.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/10 rounded-3xl bg-[#090d1a]/25 px-4">
            <Sparkles className="w-10 h-10 text-gray-600" />
            <span className="text-sm text-gray-400 font-medium">No matches found for "{query}"</span>
            <p className="text-xs text-gray-500 max-w-sm leading-normal">
              Try checking your spelling, looking up hashtags, or searching for alternative handles.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* USERS / PEOPLE SECTION */}
            {(activeTab === "all" || activeTab === "users") && (
              <div className="flex flex-col gap-3">
                {usersResults.length > 0 && (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <h2 className="font-display font-bold text-md text-white tracking-tight flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-blue-400" />
                        <span>People</span>
                      </h2>
                      {activeTab === "all" && usersResults.length > 3 && (
                        <button 
                          onClick={() => setActiveTab("users")}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 bg-white/[0.01] border border-white/5 rounded-2xl p-2.5">
                      {usersResults
                        .slice(0, activeTab === "all" ? 3 : undefined)
                        .map((user) => {
                          const followed = isFollowingUser(user.username);
                          const isSelf = user.username === currentUser?.username;
                          return (
                            <motion.div
                              key={user.username}
                              layout
                              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] border border-white/0 hover:border-white/5 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <img
                                  src={user.avatar}
                                  alt={user.displayName}
                                  onClick={() => navigate(`/profile/${user.username}`)}
                                  className="w-11 h-11 rounded-full object-cover border border-white/5 cursor-pointer hover:border-[#1D9BF0]/50 transition-colors"
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span 
                                      onClick={() => navigate(`/profile/${user.username}`)}
                                      className="text-sm font-bold text-white hover:underline cursor-pointer flex items-center gap-1.5 truncate"
                                    >
                                      {user.displayName}
                                    </span>
                                    {user.verified && (
                                      <CircleCheck className="w-4 h-4 text-[#1D9BF0] fill-[#1D9BF0] flex-shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500 font-mono truncate">@{user.username}</span>
                                  {user.bio && (
                                    <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                                      {user.bio}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {!isSelf && (
                                <button
                                  onClick={() => handleFollowToggleLocal(user.username)}
                                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 focus:outline-none ${
                                    followed
                                      ? "bg-white/10 text-white hover:bg-red-500/15 hover:text-red-400 border border-white/5"
                                      : "bg-white text-black hover:bg-gray-200"
                                  }`}
                                >
                                  {followed ? "Following" : "Follow"}
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  </>
                )}
                {activeTab === "users" && usersResults.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-xs font-mono">
                    NO USERS MATCHED YOUR SEARCH.
                  </div>
                )}
              </div>
            )}

            {/* POSTS SECTION */}
            {(activeTab === "all" || activeTab === "posts") && (
              <div className="flex flex-col gap-3">
                <div className="px-1">
                  <h2 className="font-display font-bold text-md text-white tracking-tight flex items-center gap-2">
                    <Flame className="w-4.5 h-4.5 text-blue-400" />
                    <span>Pulses</span>
                  </h2>
                </div>

                <div className="flex flex-col divide-y divide-white/5">
                  {postsResults.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs font-mono">
                      NO PULSES MATCHED YOUR SEARCH.
                    </div>
                  ) : (
                    postsResults
                      .slice(0, activeTab === "all" ? 10 : undefined)
                      .map((post) => {
                        const liked = isPostLiked(post);
                        const reposted = isPostReposted(post);
                        const bookmarked = isPostBookmarked(post.id);
                        const commentsOpen = expandedComments[post.id] || false;

                        return (
                          <motion.article
                            key={post.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-5 flex flex-col gap-3 hover:bg-white/[0.005] transition-colors"
                          >
                            {/* Profile Info */}
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
                                      className="text-sm font-bold text-white hover:underline cursor-pointer truncate"
                                    >
                                      {post.author.displayName}
                                    </span>
                                    {post.author.verified && (
                                      <CircleCheck className="w-4 h-4 text-[#1D9BF0] fill-[#1D9BF0] flex-shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500 truncate">
                                    @{post.author.username} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Post content text */}
                            <div className="pl-13 flex flex-col gap-3">
                              <p 
                                onClick={() => navigate(`/posts/${post.id}`)}
                                className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap hover:text-white cursor-pointer transition-colors"
                              >
                                {post.content}
                              </p>

                              {/* Attachment Image */}
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

                              {/* Interactive Actions Panel */}
                              <div className="flex items-center justify-between text-gray-500 max-w-md mt-1 border-t border-b border-white/5 py-2">
                                {/* Comment count / Toggle comments */}
                                <button 
                                  onClick={() => toggleComments(post.id)}
                                  className={`flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors ${
                                    commentsOpen ? "text-blue-400" : ""
                                  }`}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>{post.comments.length}</span>
                                </button>

                                {/* Repost count */}
                                <button 
                                  onClick={() => handleRepost(post.id)}
                                  className={`flex items-center gap-1.5 text-xs hover:text-emerald-400 transition-colors ${
                                    reposted ? "text-emerald-400" : ""
                                  }`}
                                >
                                  <Repeat className={`w-4 h-4 transition-transform duration-200 ${reposted ? "rotate-180" : ""}`} />
                                  <span>{post.reposts.length}</span>
                                </button>

                                {/* Like count */}
                                <button 
                                  onClick={() => handleLike(post.id)}
                                  className={`flex items-center gap-1.5 text-xs hover:text-rose-500 transition-colors ${
                                    liked ? "text-rose-500" : ""
                                  }`}
                                >
                                  <motion.div
                                    whileTap={{ scale: 0.8 }}
                                    animate={liked ? { scale: [1, 1.45, 0.9, 1.15, 1] } : { scale: 1 }}
                                    className="flex items-center justify-center"
                                  >
                                    <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                                  </motion.div>
                                  <span>{post.likes.length}</span>
                                </button>

                                {/* Views count */}
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Eye className="w-4 h-4" />
                                  <span>{post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}K` : post.views}</span>
                                </div>

                                {/* Bookmark toggler */}
                                <button 
                                  onClick={() => handleBookmark(post.id)}
                                  className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                                    bookmarked ? "text-yellow-500" : "hover:text-yellow-500"
                                  }`}
                                  title={bookmarked ? "Unbookmark" : "Bookmark"}
                                >
                                  <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-yellow-500" : ""}`} />
                                </button>
                              </div>

                              {/* Comment expanded section */}
                              <AnimatePresence>
                                {commentsOpen && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden flex flex-col gap-3 mt-1.5 border-l-2 border-white/5 pl-4"
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        placeholder="Add comment..."
                                        value={newCommentText[post.id] || ""}
                                        onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleCommentSubmit(post.id);
                                        }}
                                        className="flex-1 text-xs py-1.5 px-3 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                                      />
                                      <button 
                                        onClick={() => handleCommentSubmit(post.id)}
                                        className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2"
                                      >
                                        Reply
                                      </button>
                                    </div>

                                    {post.comments.length > 0 && (
                                      <div className="flex flex-col gap-2 mt-1">
                                        {post.comments.map((comment, idx) => (
                                          <div key={idx} className="bg-white/[0.01] border border-white/5 p-2 rounded-xl flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-bold text-white">@{comment.username}</span>
                                              <span className="text-[9px] text-gray-500">
                                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-300">{comment.content}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Original conversation thread CTA */}
                              <button 
                                onClick={() => navigate(`/posts/${post.id}`)}
                                className="flex items-center gap-1 text-xs text-blue-400 font-semibold self-start hover:text-blue-300 transition-colors"
                              >
                                <span>Go to thread</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.article>
                        );
                      })
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
};
