/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Bell, 
  Mail, 
  Moon, 
  Sun, 
  CheckCheck, 
  Heart, 
  MessageSquare, 
  Repeat, 
  UserPlus,
  Flame,
  Loader2
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const Header = () => {
  const { 
    currentUser,
    notifications, 
    markNotificationsAsRead, 
    socket,
    trendingTags
  } = useApp();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(qParam);

  // Recommendations and Autocomplete dropdown states
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState({ posts: [], users: [] });
  const [isSearchingRecs, setIsSearchingRecs] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);

  // Handle fetching auto-complete recommendations as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setRecommendations({ posts: [], users: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingRecs(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data);
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setIsSearchingRecs(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside search container to close recommendations dropdown
  useEffect(() => {
    function handleSearchClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowRecommendations(false);
      }
    }
    document.addEventListener("mousedown", handleSearchClickOutside);
    return () => document.removeEventListener("mousedown", handleSearchClickOutside);
  }, []);

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUnreadMsgDropdown, setShowUnreadMsgDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [messages, setMessages] = useState([]);

  const notifRef = useRef(null);

  // Fetch real messages to display unread ones
  const fetchHeaderMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to load header messages:", e);
    }
  };

  useEffect(() => {
    fetchHeaderMessages();
    const interval = setInterval(fetchHeaderMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to socket for new incoming messages and read events
  useEffect(() => {
    if (!socket) return;
    const handleIncomingMessage = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    const handleMessagesRead = ({ senderUsername, receiverUsername }) => {
      setMessages(prev =>
        prev.map(m =>
          m.senderUsername === senderUsername && m.receiverUsername === receiverUsername
            ? { ...m, read: true }
            : m
        )
      );
    };

    socket.on("message_received", handleIncomingMessage);
    socket.on("messages_read", handleMessagesRead);
    return () => {
      socket.off("message_received", handleIncomingMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket]);

  // Click outside notification dropdown to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/home");
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter messages that are from others and unread
  const unreadMessages = messages.filter(
    m => m.receiverUsername === currentUser?.username && m.senderUsername !== currentUser?.username && !m.read
  );

  const getNotifIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "repost":
        return <Repeat className="w-4 h-4 text-emerald-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-violet-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between w-full p-4 bg-[#030712]/85 backdrop-blur-md border-b border-white/10 h-18 flex-shrink-0">
      {/* Search Bar */}
      <form 
        ref={searchContainerRef}
        onSubmit={handleSearchSubmit} 
        className="relative w-full max-w-sm md:max-w-md"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setShowRecommendations(true)}
          placeholder="Search PulseStream..."
          className="w-full pl-10 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-white placeholder-gray-400 text-xs focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
        />

        {/* Autocomplete & Search Recommendations Dropdown */}
        <AnimatePresence>
          {showRecommendations && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 6, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full glass-card border border-white/10 rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-3 max-h-96 overflow-y-auto"
            >
              {isSearchingRecs ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Searching Stream...</span>
                </div>
              ) : (
                <>
                  {/* Matching Users Category */}
                  {recommendations.users && recommendations.users.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider pl-1">Matching Creators</span>
                      <div className="flex flex-col gap-1">
                        {recommendations.users.slice(0, 3).map((user) => (
                          <div 
                            key={user.username}
                            onClick={() => {
                              navigate(`/profile/${user.username}`);
                              setShowRecommendations(false);
                            }}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <img src={user.avatar} alt={user.displayName} className="w-7 h-7 rounded-full object-cover" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">{user.displayName}</span>
                              <span className="text-[10px] text-gray-400">@{user.username}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Hashtags / Trends */}
                  {(() => {
                    const matchedTags = (trendingTags || []).filter(t => 
                      t.hashtag.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    if (matchedTags.length > 0) {
                      return (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider pl-1">Trending Topics</span>
                          <div className="flex flex-col gap-1">
                            {matchedTags.slice(0, 3).map((tag) => (
                              <div 
                                key={tag.hashtag}
                                onClick={() => {
                                  setSearchQuery(tag.hashtag);
                                  navigate(`/search?q=${encodeURIComponent(tag.hashtag)}`);
                                  setShowRecommendations(false);
                                }}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                              >
                                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/25 transition-colors">
                                  <Flame className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white">{tag.hashtag}</span>
                                  <span className="text-[9px] text-gray-400">{tag.count} engagements</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Fallback item */}
                  {(!recommendations.users || recommendations.users.length === 0) && (
                    <div className="text-center py-3 text-xs text-gray-500">
                      No exact creator matches. Press Enter to search all posts.
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px] text-gray-500 pl-1">
                    <span>Press Enter to search for "{searchQuery}"</span>
                    <Search className="w-3 h-3 text-gray-500" />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isDarkMode ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications Icon with Click Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowUnreadMsgDropdown(false);
            }}
            className="relative p-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 8, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 w-80 glass-card rounded-2xl shadow-2xl p-4 z-50 max-h-110 overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
                  <h3 className="font-display font-semibold text-white text-xs">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markNotificationsAsRead()}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                          notif.read ? "bg-transparent" : "bg-blue-500/5 border-l-2 border-blue-500"
                        }`}
                      >
                        <div className="mt-1">{getNotifIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 leading-normal">
                            <span className="font-semibold text-white">
                              {notif.sender?.displayName || "Someone"}
                            </span>{" "}
                            {notif.type === "like" && "liked your post"}
                            {notif.type === "repost" && "reposted your post"}
                            {notif.type === "comment" && "commented: " + notif.content}
                            {notif.type === "follow" && "started following you"}
                          </p>
                          <span className="text-[9px] text-gray-500 block mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message Envelope Icon with HOVER Dropdown */}
        <div 
          className="relative"
          onMouseEnter={() => setShowUnreadMsgDropdown(true)}
          onMouseLeave={() => setShowUnreadMsgDropdown(false)}
        >
          <button
            onClick={() => {
              navigate("/messages");
              setShowUnreadMsgDropdown(false);
            }}
            className="relative p-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Mail className="w-4.5 h-4.5" />
            {unreadMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold animate-pulse">
                {unreadMessages.length}
              </span>
            )}
          </button>

          {/* Unread message hovering dropdown */}
          <AnimatePresence>
            {showUnreadMsgDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 8, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 w-80 bg-[#0b121e] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 pointer-events-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                  <h3 className="font-display font-semibold text-white text-xs">Unread Messages</h3>
                  <span 
                    onClick={() => {
                      navigate("/messages");
                      setShowUnreadMsgDropdown(false);
                    }}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Go to Inbox
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {unreadMessages.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs flex flex-col gap-1 items-center">
                      <Mail className="w-6 h-6 text-gray-600 mb-1" />
                      <span>All caught up!</span>
                      <p className="text-[10px] text-gray-500">No unread direct messages.</p>
                    </div>
                  ) : (
                    unreadMessages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => {
                          navigate("/messages", { state: { selectContact: { username: msg.senderUsername } } });
                          setShowUnreadMsgDropdown(false);
                        }}
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-white/5 text-blue-400 flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0">
                          {msg.senderUsername.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">@{msg.senderUsername}</span>
                            <span className="text-[9px] text-gray-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 truncate mt-0.5 font-medium">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Logo / Avatar */}
        {currentUser && (
          <img
            src={currentUser.avatar}
            alt="My Profile"
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full object-cover border border-white/10 hover:border-blue-500 cursor-pointer transition-all"
            title="My Profile"
          />
        )}
      </div>
    </header>
  );
};
