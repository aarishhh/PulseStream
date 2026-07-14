/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Flame,
  Volume2,
  Zap,
  Bookmark,
  Trash2,
  UserPlus,
  UserCheck,
  Loader2,
  MessageSquare,
  Repeat,
  Heart,
  Eye,
  MapPin,
  Calendar
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const ExploreView = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    posts, 
    trendingTags, 
    likePost, 
    repostPost, 
    bookmarkPost, 
    bookmarks, 
    deletePost,
    toggleFollow,
    voteInPoll
  } = useApp();
  
  const [activeTab, setActiveTab] = useState("for_you");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Dynamic What's Happening State
  const [whatsHappening, setWhatsHappening] = useState([]);
  const [loadingWhatsHappening, setLoadingWhatsHappening] = useState(false);

  // Infinite Scroll States
  const [visibleCount, setVisibleCount] = useState(8);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef(null);

  const subTabs = ["for_you", "trending", "news", "people", "videos"];

  // Dynamic filter logic for posts
  const getFilteredPosts = () => {
    switch (activeTab) {
      case "for_you":
        // Sort by engagement popularity
        return [...posts]
          .sort((a, b) => (b.views + b.likes.length * 5) - (a.views + a.likes.length * 5));
      case "trending":
        // Posts containing any hashtags
        return posts.filter(p => p.content.includes("#"));
      case "news":
        // Posts containing tech/news keywords
        const newsKeywords = ["news", "launch", "ai", "model", "science", "sports", "tech", "starship", "gpt", "world", "beat"];
        return posts.filter(p => 
          newsKeywords.some(kw => p.content.toLowerCase().includes(kw))
        );
      case "videos":
        // Posts that have attachments (images or gifs serving as media)
        return posts.filter(p => p.image || p.gif);
      default:
        return posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  // Fetch follow suggestions when on "people" tab
  useEffect(() => {
    if (activeTab === "people") {
      setLoadingSuggestions(true);
      fetch("/api/suggestions")
        .then(res => res.json())
        .then(data => {
          setSuggestions(data);
          setLoadingSuggestions(false);
        })
        .catch(err => {
          console.error("Failed to load suggestions:", err);
          setLoadingSuggestions(false);
        });
    }
  }, [activeTab, currentUser]);

  // Fetch Real-time trends / what's happening based on database posts
  useEffect(() => {
    setLoadingWhatsHappening(true);
    fetch("/api/whatshappening")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setWhatsHappening(data);
        setLoadingWhatsHappening(false);
      })
      .catch(err => {
        console.warn("Failed to load What's Happening, using resilient fallback stories:", err);
        setWhatsHappening([
          {
            category: "PulseStream • Community",
            title: "Creators and developers share their dynamic setups and build in public updates",
            image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=350&h=200&q=80"
          },
          {
            category: "Technology • Trending",
            title: "Generative AI systems reach new milestones with ultra-fast offline agents",
            image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=350&h=200&q=80"
          },
          {
            category: "Sports • LIVE",
            title: "Championship league matches draw record-breaking views and stadium attendance",
            image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=350&h=200&q=80"
          }
        ]);
        setLoadingWhatsHappening(false);
      });
  }, [posts]);

  // Reset infinite scroll on sub-tab change
  useEffect(() => {
    setVisibleCount(8);
  }, [activeTab]);

  // Set up Infinite Scroll Intersector effect
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && visibleCount < filteredPosts.length) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => prev + 6);
            setLoadingMore(false);
          }, 600);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef.current, loadingMore, visibleCount, filteredPosts.length]);

  const featuredNews = {
    tag: "Tech • LIVE",
    headline: "SpaceX launches Starship on successful test flight",
    stats: "12.3K posts",
    banner: "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=1000&q=80"
  };

  const defaultTrendingTopics = [
    { rank: 1, tag: "#TechInnovation", posts: "12.4K posts" },
    { rank: 2, tag: "#MondayMotivation", posts: "8.7K posts" },
    { rank: 3, tag: "#WorldPhotographyDay", posts: "6.3K posts" },
    { rank: 4, tag: "#AIRevolution", posts: "5.2K posts" },
    { rank: 5, tag: "#TravelDiaries", posts: "4.8K posts" }
  ];

  // Map real trending hashtags if they exist
  const topicsToDisplay = trendingTags && trendingTags.length > 0
    ? trendingTags.map((t, idx) => ({
        rank: idx + 1,
        tag: t.hashtag,
        posts: `${t.count} engagements`
      }))
    : defaultTrendingTopics;

  const sidebarNews = whatsHappening && whatsHappening.length > 0
    ? whatsHappening
    : [
        {
          category: "Sports • 2h",
          title: "Mumbai Indians win a thriller against CSK",
          image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=150&q=80",
        },
        {
          category: "Technology • 4h",
          title: "New AI model beats benchmarks",
          image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=150&q=80",
        },
        {
          category: "Entertainment • 5h",
          title: "Coldplay announces world tour 2025",
          image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=150&q=80",
        }
      ];



  const handleTopicClick = (tag) => {
    navigate(`/search?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] overflow-y-auto">
      
      {/* Tab bar header */}
      <div className="flex border-b border-white/10 sticky top-0 bg-[#030712]/90 backdrop-blur-md z-30">
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-4 text-sm font-semibold relative text-center capitalize transition-colors"
          >
            <span className={activeTab === tab ? "text-white" : "text-gray-400 hover:text-white"}>
              {tab.replace("_", " ")}
            </span>
            {activeTab === tab && (
              <motion.div
                layoutId="exploreSubTabLine"
                className="absolute bottom-0 left-1/4 right-1/4 h-1 rounded-full bg-blue-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {activeTab !== "people" && (
          <>
            {/* Featured News Layout (SpaceX launches Starship) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Headline Banner Card */}
              <div 
                onClick={() => handleTopicClick("Starship")}
                className="lg:col-span-2 relative rounded-2xl overflow-hidden glass-card h-80 flex flex-col justify-end p-6 border border-white/10 group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                <img 
                  src={featuredNews.banner} 
                  alt="SpaceX Rocket Launch" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                <div className="relative z-20 flex flex-col gap-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                    {featuredNews.tag}
                  </span>
                  <h2 className="font-display font-bold text-2xl lg:text-3xl text-white tracking-tight leading-snug group-hover:text-blue-300 transition-colors">
                    {featuredNews.headline}
                  </h2>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>{featuredNews.stats}</span>
                    <span>• Live Stream active</span>
                  </div>
                  <button className="glow-button mt-4 px-5 py-2.5 rounded-xl font-semibold text-xs text-white w-fit">
                    View Stream details
                  </button>
                </div>
              </div>

              {/* Quick Sidebar News Cards */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-400 px-1">What's happening</h3>
                {sidebarNews.map((news) => (
                  <div 
                    key={news.title}
                    onClick={() => handleTopicClick(news.title.split(" ").slice(0, 2).join(" "))}
                    className="flex gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all min-w-0"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <span className="text-[10px] text-gray-500 font-semibold">{news.category}</span>
                      <p className="text-xs font-bold text-gray-200 hover:text-blue-400 transition-colors line-clamp-2 leading-snug mt-1">
                        {news.title}
                      </p>
                    </div>
                    <img 
                      src={news.image} 
                      alt={news.title} 
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* Trending Topics Row */}
            <div className="flex flex-col gap-3">
              <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Trending topics</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {topicsToDisplay.map((topic) => (
                  <div 
                    key={topic.tag} 
                    onClick={() => handleTopicClick(topic.tag)}
                    className="glass-card rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/30 cursor-pointer transition-all hover:-translate-y-0.5 group"
                  >
                    <span className="text-[10px] text-gray-500 font-medium">{topic.rank} • Trending</span>
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate mt-2">{topic.tag}</span>
                    <span className="text-[11px] text-gray-400 mt-1">{topic.posts}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Dynamic content tab renderer */}
        <div className="flex flex-col gap-4 mt-2">
          {activeTab === "people" ? (
            <div className="flex flex-col gap-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="font-display font-bold text-lg text-white">Recommended for You</h3>
                <p className="text-xs text-gray-400 mt-0.5">Connect with trending creators across the stream network</p>
              </div>

              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  <span>Curating creator list...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No new follow recommendations at this moment. You are caught up!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((user) => {
                    const isFollowing = currentUser?.following.includes(user.username);
                    return (
                      <div 
                        key={user.username}
                        className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <img 
                            src={user.avatar} 
                            alt={user.displayName} 
                            onClick={() => navigate(`/profile/${user.username}`)}
                            className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                          />
                          <div className="flex-1 min-w-0">
                            <h4 
                              onClick={() => navigate(`/profile/${user.username}`)}
                              className="text-sm font-bold text-white hover:text-blue-400 cursor-pointer transition-colors truncate"
                            >
                              {user.displayName}
                            </h4>
                            <p className="text-xs text-gray-400">@{user.username}</p>
                            {user.bio && (
                              <p className="text-xs text-gray-300 mt-2 line-clamp-2 leading-relaxed">{user.bio}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
                          <span className="text-[11px] text-gray-500 font-medium">
                            {user.followers?.length || 0} followers
                          </span>
                          <button
                            onClick={() => toggleFollow(user.username)}
                            className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 ${
                              isFollowing 
                                ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" 
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-blue-900/30"
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-semibold text-lg text-white">
                {activeTab === "for_you" && "Popular stream posts"}
                {activeTab === "trending" && "Trending hashtags & discussions"}
                {activeTab === "news" && "Tech & World News Stream"}
                {activeTab === "videos" && "Media & Video attachments"}
              </h3>

              {filteredPosts.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-400 border border-dashed border-white/10 rounded-2xl">
                  No active posts match this filter. Share something first!
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-white/10">
                  {filteredPosts.slice(0, visibleCount).map((post) => (
                    <div key={post.id} className="py-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.author.avatar}
                            alt={post.author.displayName}
                            onClick={() => navigate(`/profile/${post.author.username}`)}
                            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          />
                          <div className="flex flex-col min-w-0">
                            <span 
                              onClick={() => navigate(`/profile/${post.author.username}`)}
                              className="text-sm font-semibold text-white hover:text-blue-400 cursor-pointer transition-colors"
                            >
                              {post.author.displayName}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                              @{post.author.username}
                              {post.location && (
                                <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                                  • <MapPin className="w-3 h-3 inline" /> {post.location}
                                </span>
                              )}
                              {post.scheduledAt && (
                                <span className="text-amber-400 font-semibold flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded-full text-[9px]">
                                  ⏰ Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Follow Button if not self */}
                        {currentUser && post.author.username.toLowerCase() !== currentUser.username.toLowerCase() && (
                          <button
                            onClick={() => toggleFollow(post.author.username)}
                            className={`px-3 py-1 rounded-full font-bold text-[10px] transition-all ${
                              currentUser.following.includes(post.author.username)
                                ? "bg-white/5 text-gray-300 hover:bg-white/10"
                                : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
                            }`}
                          >
                            {currentUser.following.includes(post.author.username) ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>

                      <p className="text-sm text-gray-200 leading-relaxed">{post.content}</p>

                      {/* Poll Rendering */}
                      {post.poll && (
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 my-1 max-w-md">
                          {post.poll.options.map((option, idx) => {
                            const totalVotes = post.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                            const hasVoted = post.poll.options.some(o => o.votes?.includes(currentUser?.username));
                            const optionVotes = option.votes?.length || 0;
                            const votePct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            const userVotedForThis = option.votes?.includes(currentUser?.username);

                            return (
                              <div key={idx} className="relative overflow-hidden rounded-xl border border-white/10 h-10 flex items-center">
                                {/* Progress background */}
                                {hasVoted && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${votePct}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className={`absolute inset-y-0 left-0 ${userVotedForThis ? "bg-blue-500/20" : "bg-white/5"}`}
                                  />
                                )}

                                {hasVoted ? (
                                  <div className="relative w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold z-10 text-white">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="truncate">{option.text}</span>
                                      {userVotedForThis && (
                                        <span className="text-blue-400 text-[10px] font-bold shrink-0">(Your Vote)</span>
                                      )}
                                    </div>
                                    <span className="text-gray-400 shrink-0">{votePct}%</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => voteInPoll(post.id, idx)}
                                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 text-xs font-medium transition-colors text-white z-10"
                                  >
                                    {option.text}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {post.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)} votes • Poll Active
                          </div>
                        </div>
                      )}
                      
                      {post.image && (
                        <div 
                          onClick={() => navigate(`/posts/${post.id}`)}
                          className="rounded-2xl overflow-hidden max-h-72 mt-1 cursor-pointer border border-white/5 relative group"
                        >
                          <img src={post.image} alt="Attached" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                          {activeTab === "videos" && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="p-3.5 bg-blue-600/90 text-white rounded-full shadow-lg">
                                <Volume2 className="w-5 h-5 animate-pulse" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {post.gif && (
                        <div 
                          onClick={() => navigate(`/posts/${post.id}`)}
                          className="rounded-2xl overflow-hidden max-h-72 mt-1 cursor-pointer border border-white/5 relative group"
                        >
                          <img src={post.gif} alt="Attached GIF" className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300" />
                        </div>
                      )}

                      {/* Fully interactive actions bar */}
                      {(() => {
                        const liked = currentUser ? post.likes.includes(currentUser.username) : false;
                        const reposted = currentUser ? post.reposts.includes(currentUser.username) : false;
                        const isBookmarked = bookmarks.some((b) => b.id === post.id);
                        const isOwnPost = currentUser ? post.author.username.toLowerCase() === currentUser.username.toLowerCase() : false;
                        return (
                          <div className="flex items-center justify-between text-gray-500 mt-2 max-w-md">
                            {/* Comment action */}
                            <button 
                              onClick={() => navigate(`/posts/${post.id}`)}
                              className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors"
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

                            {/* Bookmark action */}
                            <button 
                              onClick={() => bookmarkPost(post.id)}
                              className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                                isBookmarked ? "text-yellow-500 hover:text-yellow-400" : "text-gray-500 hover:text-yellow-500"
                              }`}
                            >
                              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-yellow-500" : ""}`} />
                            </button>

                            {/* Delete action */}
                            {isOwnPost && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm("Are you sure you want to delete this post?")) {
                                    try {
                                      await deletePost(post.id);
                                    } catch (err) {
                                      alert(err.message || "Failed to delete post");
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/5 transition-colors"
                                title="Delete Post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Infinite Scroll Sentinel element */}
              {visibleCount < filteredPosts.length && (
                <div ref={sentinelRef} className="py-8 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
