import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { motion } from "motion/react";
import { 
  Heart, 
  MessageSquare, 
  Repeat, 
  Bookmark, 
  ArrowLeft, 
  Eye, 
  Send,
  Loader2,
  Calendar
} from "lucide-react";

export const PostDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, likePost, commentPost, repostPost, posts, viewPost } = useApp();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Trigger explicit view tracking on mount
  useEffect(() => {
    if (id) {
      viewPost(id);
    }
  }, [id]);

  const fetchPostDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      } else {
        console.error("Failed to load post details");
      }
    } catch (err) {
      console.error("Error fetching single post details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check in-memory first for rapid response
    const existing = posts.find(p => p.id === id);
    if (existing) {
      setPost(existing);
      setLoading(false);
    } else {
      fetchPostDetails();
    }
  }, [id, posts]);

  const handleLike = async () => {
    if (!post) return;
    await likePost(post.id);
  };

  const handleRepost = async () => {
    if (!post) return;
    await repostPost(post.id);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!post || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await commentPost(post.id, commentText);
      setCommentText("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const isLikedByMe = () => {
    if (!post || !currentUser) return false;
    return post.likes.includes(currentUser.username);
  };

  const isRepostedByMe = () => {
    if (!post || !currentUser) return false;
    return post.reposts.includes(currentUser.username);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs font-medium">Loading post stream...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-3 text-gray-400">
        <ArrowLeft className="w-10 h-10 text-gray-600 cursor-pointer hover:text-white" onClick={() => navigate(-1)} />
        <span className="text-lg font-bold text-white font-display">Post Not Found</span>
        <p className="text-xs text-gray-500 max-w-xs">
          The post may have been removed, moderated, or the URL address is invalid.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="mt-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const liked = isLikedByMe();
  const reposted = isRepostedByMe();

  return (
    <div className="flex flex-col h-full bg-[#030712] text-gray-200 overflow-y-auto">
      {/* Header Back Button Row */}
      <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/10 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white font-display">Post</h2>
          <span className="text-[10px] text-gray-500">Back to feed</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Author Header */}
        <div className="flex items-center gap-3">
          <img
            src={post.author.avatar}
            alt={post.author.displayName}
            className="w-12 h-12 rounded-full object-cover border border-white/10 cursor-pointer"
            onClick={() => navigate(`/profile/${post.author.username}`)}
          />
          <div className="flex flex-col min-w-0">
            <span 
              className="text-base font-bold text-white hover:underline cursor-pointer"
              onClick={() => navigate(`/profile/${post.author.username}`)}
            >
              {post.author.displayName}
            </span>
            <span className="text-xs text-gray-500">@{post.author.username}</span>
          </div>
        </div>

        {/* Content Body */}
        <p className="text-white text-base md:text-lg leading-relaxed whitespace-pre-wrap mt-2">
          {post.content}
        </p>

        {/* Media attachment */}
        {post.image && (
          <div className="rounded-2xl overflow-hidden border border-white/5 max-h-[480px] mt-2">
            <img 
              src={post.image} 
              alt="Attachment" 
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        {/* Timestamp & Views */}
        <div className="flex items-center gap-4 border-t border-b border-white/5 py-3.5 text-xs text-gray-500 mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })} at{" "}
            {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <strong className="text-white">{post.views}</strong> views
          </span>
        </div>

        {/* Action Panel Button bar */}
        <div className="flex items-center justify-around py-2 border-b border-white/5 text-gray-500 text-sm">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 hover:text-rose-500 transition-colors ${liked ? "text-rose-500 font-bold" : ""}`}
          >
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={liked ? { scale: [1, 1.45, 0.9, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            </motion.div>
            <span>{post.likes.length} Likes</span>
          </button>

          <button 
            onClick={handleRepost}
            className={`flex items-center gap-2 hover:text-emerald-400 transition-colors ${reposted ? "text-emerald-400 font-bold" : ""}`}
          >
            <Repeat className={`w-5 h-5 ${reposted ? "rotate-180" : ""}`} />
            <span>{post.reposts.length} Reposts</span>
          </button>

          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <span>{post.comments.length} Comments</span>
          </div>

          <button className="p-2 rounded-full hover:bg-white/5 hover:text-yellow-500 transition-all">
            <Bookmark className="w-5 h-5" />
          </button>
        </div>

        {/* Comments Section */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="font-display font-semibold text-white text-base">Conversation</h3>

          {/* Write comment input */}
          <form onSubmit={handleCommentSubmit} className="flex gap-3">
            {currentUser && (
              <img
                src={currentUser.avatar}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
            )}
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 focus-within:border-blue-500/50 transition-all">
              <input
                type="text"
                placeholder="Post your reply..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-white placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Comment List */}
          <div className="flex flex-col gap-3 mt-2 divide-y divide-white/5">
            {post.comments.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No replies yet. Be the first to start the conversation!
              </div>
            ) : (
              post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 pt-3">
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-white/5 cursor-pointer"
                    onClick={() => navigate(`/profile/${comment.author.username}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-xs font-bold text-white hover:underline cursor-pointer"
                        onClick={() => navigate(`/profile/${comment.commenter || comment.author.username}`)}
                      >
                        {comment.author.displayName}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mb-1">@{comment.author.username}</span>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
