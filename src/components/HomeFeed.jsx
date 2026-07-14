/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Image as ImageIcon, 
  Smile, 
  BarChart3, 
  Calendar, 
  MapPin, 
  Heart, 
  MessageSquare, 
  Repeat, 
  Bookmark, 
  Eye, 
  AlertTriangle, 
  X, 
  Send,
  Loader2,
  Flame,
  Trash2
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export const HomeFeed = () => {
  const navigate = useNavigate();
  const { 
    posts, 
    currentUser, 
    createPost, 
    voteInPoll,
    likePost, 
    commentPost, 
    repostPost, 
    activeFeedTab, 
    setActiveFeedTab,
    moderationError,
    clearModerationError,
    trendingTags,
    bookmarks,
    bookmarkPost,
    deletePost
  } = useApp();

  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Infinite Scroll States
  const [visibleCount, setVisibleCount] = useState(8);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Reset infinite scroll on tab change
  React.useEffect(() => {
    setVisibleCount(8);
  }, [activeFeedTab]);

  // Infinite Scroll Observer
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && visibleCount < posts.length) {
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
  }, [sentinelRef.current, loadingMore, visibleCount, posts.length]);

  // Rich media states
  const [postGif, setPostGif] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  
  // Poll state
  const [pollOptions, setPollOptions] = useState(["", ""]); // Start with 2 blank options
  const [isPollActive, setIsPollActive] = useState(false);

  // Picker Toggles
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [pollPickerOpen, setPollPickerOpen] = useState(false);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const EMOJI_LIST = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "🥵", "🥶", "😱", "🤔", "🤗", "🤐", "🥴", "🤢", "🤡", "💩", "👻", "💀", "👽", "👾", "🤖", "🎃", "👋", "🤚", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "👍", "👎", "✊", "👊", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🧠", "👀", "🔥", "✨", "💯"
  ];

  const POPULAR_GIFS = [
    { name: "Coding Cat", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVqdWt4b2g1bXJ5ZzVibGR6eTNwdWJmZGZnbnVxb3Q5MWYwdjJ3YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3NtY188QaxDdC/giphy.gif" },
    { name: "Developer Typing", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW83cDBzZjY2NWVxbWlkYW1wdTFkOTM3bmNxMGFxYnBzcnoyb3V2ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9Ai5dIk8xvYmLDEgCg/giphy.gif" },
    { name: "Space Rocket", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWZpcXBsbTVsdmsybmJwdWVmMTcydmoxMHc3ZHVpdWwwNGI0czh0MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXL4FHPSnVJ0A/giphy.gif" },
    { name: "Success Kid", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z5dmI5N3oxNXYyMXVhcGg4Y3o0MHk2ejJ0dDcycXRxNjh0OHR6MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l318182Y7u_S3g_Mv5/giphy.gif" },
    { name: "Let's Go", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnZ6aXlrbmhvbGsyMXozdmsxdWZreDQ0Zjd2OHo1cnRxMHp2azlpayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1SfxXOJ0Q2Xni/giphy.gif" },
    { name: "Mind Blown", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3NpaWR2bzZmaHV2Y2syMWZ4NDloOHpjcXBrNDZ0azBpaG84b3gyYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT0xeJpD8e4DYnCHq8/giphy.gif" },
    { name: "WOW Cat", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmFzbnJ2Ynkydm5pYnV1Nms3ODVhbG11NHBlMWRrdzVub3ExbHdzYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PUBxelwT57jsQ/giphy.gif" },
    { name: "Excited Minion", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTR0NGh2Z3R4cnFpZnd0azc2MnA0ejBkaDRwYWx3cnR5bXNyeGRwayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uf38M6764vIWI/giphy.gif" }
  ];
  
  // Track open comment state per post ID
  const [expandedComments, setExpandedComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});

  const fileInputRef = useRef(null);

  // Convert uploaded image to Base64 (processed via Mock Cloudinary on backend)
  const handleImageFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPostImage(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handlePostSubmit = async () => {
    if (!postContent.trim() && !postImage && !postGif && !isPollActive && !locationName) return;
    setIsSubmitting(true);
    try {
      const poll = isPollActive ? {
        options: pollOptions.filter(o => o.trim() !== "").map(text => ({ text, votes: [] }))
      } : undefined;

      await createPost(
        postContent, 
        postImage || undefined,
        postGif || undefined,
        poll,
        locationName || undefined,
        scheduledAt || undefined
      );

      // Clear inputs upon success
      setPostContent("");
      setPostImage(null);
      setPostGif(null);
      setLocationName("");
      setScheduledAt("");
      setPollOptions(["", ""]);
      setIsPollActive(false);

      // Close all pickers
      setEmojiPickerOpen(false);
      setGifPickerOpen(false);
      setPollPickerOpen(false);
      setSchedulePickerOpen(false);
      setLocationPickerOpen(false);
    } catch (err) {
      console.error("Content Creation blocked or failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (postId) => {
    const text = newCommentText[postId];
    if (!text || !text.trim()) return;

    try {
      await commentPost(postId, text);
      setNewCommentText(prev => ({ ...prev, [postId]: "" }));
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

  const isPostLiked = (post) => {
    return currentUser ? post.likes.includes(currentUser.username) : false;
  };

  const isPostReposted = (post) => {
    return currentUser ? post.reposts.includes(currentUser.username) : false;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#030712] overflow-y-auto">
      
      {/* Moderation Error Dialog */}
      <AnimatePresence>
        {moderationError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md p-6 border border-red-500/30 rounded-2xl bg-[#0b1528] shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="mx-auto p-3 bg-red-500/10 text-red-500 rounded-full w-fit">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-xl text-white">{moderationError.message}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {moderationError.reason}
              </p>
              <button
                onClick={clearModerationError}
                className="mt-2 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Understand & Revise
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Menu */}
      <div className="flex sticky top-0 bg-[#030712]/90 backdrop-blur-md z-30">
        {["for_you", "following"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFeedTab(tab)}
            className="flex-1 py-4 text-sm font-semibold relative text-center capitalize transition-colors"
          >
            <span className={activeFeedTab === tab ? "text-white" : "text-gray-400 hover:text-white"}>
              {tab === "for_you" ? "Home Feed" : "Following"}
            </span>
            {activeFeedTab === tab && (
              <motion.div
                layoutId="activeFeedTabLine"
                className="absolute bottom-0 left-1/4 right-1/4 h-1 rounded-full bg-blue-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Post Editor */}
      {currentUser && (
        <div 
          onDragEnter={handleDrag}
          className={`p-4 flex flex-col gap-4 transition-all relative ${
            dragActive ? "bg-blue-600/5 border-dashed border-blue-500" : ""
          }`}
        >
          {dragActive && (
            <div 
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className="absolute inset-0 z-40 flex items-center justify-center bg-blue-600/5"
            >
              <div className="text-blue-400 font-semibold text-sm pointer-events-none">
                Drop your image here to upload
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-11 h-11 rounded-full object-cover border border-white/10"
            />
            <div className="flex-1 flex flex-col">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's the pulse?"
                rows={3}
                className="w-full bg-transparent border-0 text-white placeholder-gray-500 focus:ring-0 focus:outline-none resize-none text-[16px] leading-relaxed"
              />

              {/* Uploaded Image Preview */}
              {postImage && (
                <div className="relative mt-2 rounded-2xl overflow-hidden max-h-80 border border-white/10">
                  <img src={postImage} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPostImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* GIF Preview */}
              {postGif && (
                <div className="relative mt-2 rounded-2xl overflow-hidden max-h-80 border border-white/10">
                  <img src={postGif} alt="GIF preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPostGif(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Poll Indicator/Builder */}
              {isPollActive && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 mt-3 flex flex-col gap-3 relative">
                  <button 
                    onClick={() => setIsPollActive(false)}
                    className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold uppercase text-gray-400 tracking-wider font-mono">Build a Poll</span>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-[#090d1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => {
                            setPollOptions(pollOptions.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-xs text-blue-400 hover:underline font-semibold w-fit self-start"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              )}

              {/* Location Badge Indicator */}
              {locationName && (
                <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-3 bg-blue-500/10 px-3 py-1.5 rounded-xl w-fit">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{locationName}</span>
                  <button onClick={() => setLocationName("")} className="hover:text-white ml-1.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Scheduled Time Indicator */}
              {scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-3 bg-amber-500/10 px-3 py-1.5 rounded-xl w-fit">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Scheduled for: {new Date(scheduledAt).toLocaleString()}</span>
                  <button onClick={() => setScheduledAt("")} className="hover:text-white ml-1.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Picker Panels Overlay Drawer */}
          <div className="flex flex-col gap-2 pl-15">
            {emojiPickerOpen && (
              <div className="p-3 bg-[#0c1222] border border-white/10 rounded-2xl max-h-48 overflow-y-auto flex flex-wrap gap-2 z-20">
                {EMOJI_LIST.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setPostContent(prev => prev + e);
                    }}
                    className="text-lg p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {gifPickerOpen && (
              <div className="p-3 bg-[#0c1222] border border-white/10 rounded-2xl flex flex-col gap-2 z-20">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono">Select standard GIF</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POPULAR_GIFS.map(g => (
                    <button
                      key={g.name}
                      onClick={() => {
                        setPostGif(g.url);
                        setGifPickerOpen(false);
                      }}
                      className="relative rounded-xl overflow-hidden group h-20 border border-white/10 hover:border-blue-500/50"
                    >
                      <img src={g.url} alt={g.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        {g.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {schedulePickerOpen && (
              <div className="p-4 bg-[#0c1222] border border-white/10 rounded-2xl flex flex-col gap-2 z-20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Schedule Post Publish</span>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setMinutes(0);
                      setScheduledAt(tomorrow.toISOString().slice(0, 16));
                    }}
                    className="text-xs px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium"
                  >
                    Set Tomorrow
                  </button>
                </div>
              </div>
            )}

            {locationPickerOpen && (
              <div className="p-4 bg-[#0c1222] border border-white/10 rounded-2xl flex flex-col gap-2 z-20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Add Location Tag</span>
                <input
                  type="text"
                  placeholder="Where are you? (e.g., Tokyo, Japan)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["San Francisco, CA", "London, UK", "Tokyo, JP", "Paris, FR", "Pune, MH", "Remote"].map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocationName(loc);
                        setLocationPickerOpen(false);
                      }}
                      className="px-2.5 py-1 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg text-[10px] font-medium text-gray-400 transition-all"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3 pl-15">
            {/* Action Bar */}
            <div className="flex items-center gap-1.5 text-blue-400">
              <button 
                onClick={triggerFileSelect}
                className="p-2 rounded-xl hover:bg-blue-500/10 transition-colors"
                title="Upload Photo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <button 
                onClick={() => {
                  setGifPickerOpen(!gifPickerOpen);
                  setEmojiPickerOpen(false);
                  setPollPickerOpen(false);
                  setSchedulePickerOpen(false);
                  setLocationPickerOpen(false);
                }}
                className={`p-2 rounded-xl hover:bg-blue-500/10 transition-colors ${gifPickerOpen ? "bg-blue-500/10" : ""}`}
                title="Add GIF"
              >
                <span className="text-xs font-bold font-mono">GIF</span>
              </button>
              <button 
                onClick={() => {
                  setIsPollActive(!isPollActive);
                  setEmojiPickerOpen(false);
                  setGifPickerOpen(false);
                  setSchedulePickerOpen(false);
                  setLocationPickerOpen(false);
                }}
                className={`p-2 rounded-xl hover:bg-blue-500/10 transition-colors ${isPollActive ? "bg-blue-500/10" : ""}`}
                title="Add Poll"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setEmojiPickerOpen(!emojiPickerOpen);
                  setGifPickerOpen(false);
                  setSchedulePickerOpen(false);
                  setLocationPickerOpen(false);
                }}
                className={`p-2 rounded-xl hover:bg-blue-500/10 transition-colors ${emojiPickerOpen ? "bg-blue-500/10" : ""}`}
                title="Add Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setSchedulePickerOpen(!schedulePickerOpen);
                  setEmojiPickerOpen(false);
                  setGifPickerOpen(false);
                  setLocationPickerOpen(false);
                }}
                className={`p-2 rounded-xl hover:bg-blue-500/10 transition-colors ${schedulePickerOpen ? "bg-blue-500/10" : ""}`}
                title="Schedule Publish"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setLocationPickerOpen(!locationPickerOpen);
                  setEmojiPickerOpen(false);
                  setGifPickerOpen(false);
                  setSchedulePickerOpen(false);
                }}
                className={`p-2 rounded-xl hover:bg-blue-500/10 transition-colors ${locationPickerOpen ? "bg-blue-500/10" : ""}`}
                title="Location Tag"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>

            {/* CTA Post button */}
            <button
              onClick={handlePostSubmit}
              disabled={isSubmitting || (!postContent.trim() && !postImage && !postGif && !isPollActive && !locationName)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-bold text-sm text-white transition-all shadow-md hover:shadow-lg hover:shadow-blue-900/30 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>{scheduledAt ? "Schedule" : "Post"}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Feed List */}
      <div className="flex flex-col">
        {/* Inline Merged Trending Section inside the Home Feed! */}
        {activeFeedTab === "for_you" && trendingTags && trendingTags.length > 0 && (
          <div className="p-4 border border-white/5 bg-[#090d1a]/50 flex flex-col gap-3 my-3 mx-4 rounded-3xl shadow-lg relative overflow-hidden group">
            {/* Ambient subtle glow inside the box to match the beautiful layout */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Flame className="w-4 h-4 text-orange-500 animate-pulse fill-orange-500" />
                Trending topics for you
              </span>
              <button 
                onClick={() => navigate("/explore")}
                className="text-xs text-blue-400 hover:underline hover:text-blue-300 font-bold flex items-center gap-1"
              >
                Explore all <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory z-10">
              {trendingTags.slice(0, 6).map((tag) => (
                <button
                  key={tag.hashtag}
                  onClick={() => {
                    navigate(`/explore`);
                  }}
                  className="snap-start flex-shrink-0 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 hover:shadow-lg transition-all text-left flex flex-col gap-0.5"
                >
                  <span className="text-xs font-bold text-white hover:text-blue-400 transition-colors">{tag.hashtag}</span>
                  <span className="text-[10px] text-gray-500">{tag.count >= 1000 ? `${(tag.count / 1000).toFixed(1)}K` : tag.count} posts</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-gray-500" />
            <span className="text-gray-400 font-medium">No posts available on this feed</span>
            <p className="text-xs text-gray-500 max-w-xs">Be the first to publish a new post, or toggle follow recommendations!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {posts.slice(0, visibleCount).map((post) => {
              const liked = isPostLiked(post);
              const reposted = isPostReposted(post);
              const commentsOpen = expandedComments[post.id] || false;

              return (
                <React.Fragment key={post.id}>
                  <motion.article
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="p-4 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors"
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            onClick={() => navigate(`/profile/${post.author.username}`)}
                            className="text-sm font-bold text-white hover:underline cursor-pointer"
                          >
                            {post.author.displayName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate flex items-center gap-1 flex-wrap">
                          @{post.author.username} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {post.location && (
                            <span className="text-blue-400 font-medium flex items-center gap-1">
                              • <MapPin className="w-3 h-3 inline" /> {post.location}
                            </span>
                          )}
                          {post.scheduledAt && (
                            <span className="text-amber-400 font-medium flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded-full text-[10px]">
                              ⏰ Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                            </span>
                          )}
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

                    {/* Poll Rendering */}
                    {post.poll && (
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 my-2 max-w-md">
                        {post.poll.options.map((option, idx) => {
                          const totalVotes = post.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                          const hasVoted = post.poll.options.some(o => o.votes?.includes(currentUser?.username));
                          const optionVotes = option.votes?.length || 0;
                          const votePct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                          const userVotedForThis = option.votes?.includes(currentUser?.username);

                          return (
                            <div key={idx} className="relative overflow-hidden rounded-xl border border-white/10 h-11 flex items-center">
                              {/* Percentage Progress Bar background */}
                              {hasVoted && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${votePct}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  className={`absolute inset-y-0 left-0 ${userVotedForThis ? "bg-blue-500/20" : "bg-white/5"}`}
                                />
                              )}

                              {hasVoted ? (
                                <div className="relative w-full px-4 py-3 flex items-center justify-between text-xs font-semibold z-10 text-white">
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
                                  className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs font-medium transition-colors text-white z-10"
                                >
                                  {option.text}
                                </button>
                              )}
                            </div>
                          );
                        })}

                        <div className="text-[10px] text-gray-500 font-mono mt-1 flex justify-between">
                          <span>{post.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)} votes</span>
                          <span>• Poll Active</span>
                        </div>
                      </div>
                    )}

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

                    {/* Shared GIF Attachment */}
                    {post.gif && (
                      <div 
                        onClick={() => navigate(`/posts/${post.id}`)}
                        className="rounded-2xl overflow-hidden border border-white/5 max-h-96 cursor-pointer hover:border-white/10 transition-colors"
                      >
                        <img 
                          src={post.gif} 
                          alt="Post GIF attachment" 
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
                          transition={{ 
                            duration: 0.45, 
                            ease: "easeInOut" 
                          }}
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
                          bookmarks.some((b) => b.id === post.id) ? "text-yellow-500 hover:text-yellow-400" : "text-gray-500 hover:text-yellow-500"
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarks.some((b) => b.id === post.id) ? "fill-yellow-500" : ""}`} />
                      </button>

                      {/* Delete action */}
                      {currentUser && post.author.username.toLowerCase() === currentUser.username.toLowerCase() && (
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

                    {/* Expandable Comments Drawer */}
                    <AnimatePresence>
                      {commentsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden flex flex-col gap-3 mt-1.5 pl-2 border-l border-white/10"
                        >
                          {/* List existing comments */}
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2.5 items-start py-2">
                              <img
                                src={comment.author.avatar}
                                alt={comment.author.displayName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <div className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/5 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-semibold text-white">{comment.author.displayName}</span>
                                  <span className="text-[10px] text-gray-500">
                                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 leading-normal">{comment.content}</p>
                              </div>
                            </div>
                          ))}

                          {/* Write a comment */}
                          <div className="flex items-center gap-2.5 pt-1.5">
                            {currentUser && (
                              <img
                                src={currentUser.avatar}
                                alt={currentUser.displayName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            )}
                            <input
                              type="text"
                              value={newCommentText[post.id] || ""}
                              onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Write a reply..."
                              onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCommentSubmit(post.id);
                              }}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
                            />
                            <button
                              onClick={() => handleCommentSubmit(post.id)}
                              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                  </motion.article>
                </React.Fragment>
              );
            })}

            {/* Infinite Scroll Sentinel element */}
            {visibleCount < posts.length && (
              <div ref={sentinelRef} className="py-8 flex justify-center items-center">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
