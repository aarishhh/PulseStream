import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { auth } from "../lib/firebase.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFeedTab, setActiveFeedTab] = useState("for_you");
  const [socket, setSocket] = useState(null);
  const [moderationError, setModerationError] = useState(null);
  const [firebaseWarning, setFirebaseWarning] = useState(null);

  // Keep references of activeFeedTab and currentUser up-to-date to avoid stale closures in socket events
  const activeFeedTabRef = React.useRef(activeFeedTab);
  const currentUserRef = React.useRef(currentUser);

  useEffect(() => {
    activeFeedTabRef.current = activeFeedTab;
  }, [activeFeedTab]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Fetch initial profile and initial data once on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const userRes = await fetch("/api/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData) {
            setCurrentUser(userData);
          } else {
            setCurrentUser(null);
          }
        }

        await Promise.all([
          fetchPosts(),
          fetchNotifications(),
          fetchTrending(),
          fetchAnalytics(),
          fetchBookmarks(),
          fetchLists()
        ]);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Listen to Firebase Auth state to restore sessions dynamically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !currentUserRef.current) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch("/api/auth/firebase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (res.ok) {
            const user = await res.json();
            setCurrentUser(user);
            if (socket) {
              socket.emit("join_user_room", user.username);
            }
            await Promise.all([
              fetchPosts(),
              fetchNotifications(),
              fetchTrending(),
              fetchAnalytics(),
              fetchBookmarks(),
              fetchLists()
            ]);
          }
        } catch (err) {
          console.error("Auto Firebase session restoration failed:", err);
        }
      }
    });
    return () => unsubscribe();
  }, [socket]);

  // Manage Socket.io lifecycle, re-connecting when currentUser changes
  useEffect(() => {
    // Connect to same host
    const socketInstance = io();
    setSocket(socketInstance);

    if (currentUser) {
      // Register user room with Socket.io
      socketInstance.emit("join_user_room", currentUser.username);
    }

    // Socket listeners for real-time updates
    socketInstance.on("post_created", (newPost) => {
      const currentTab = activeFeedTabRef.current;
      const user = currentUserRef.current;

      if (currentTab === "following") {
        const isFollowing = user ? (user.following.includes(newPost.author.username) || user.username === newPost.author.username) : false;
        if (!isFollowing) return;
      }

      setPosts((prevPosts) => {
        if (prevPosts.some(p => p.id === newPost.id)) return prevPosts;
        return [newPost, ...prevPosts];
      });
    });

    socketInstance.on("post_updated", (updatedPost) => {
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === updatedPost.id ? updatedPost : p))
      );
    });

    socketInstance.on("notification_received", (notif) => {
      const user = currentUserRef.current;
      if (user && notif.receiverUsername) {
        if (notif.receiverUsername.toLowerCase() !== user.username.toLowerCase()) {
          // Security/leakage guard: ignore notifications not intended for the active user
          return;
        }
      }
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser?.username]);

  // Fetch functions
  const fetchPosts = async () => {
    try {
      let tabParam = "all";
      if (activeFeedTab === "following") tabParam = "following";
      if (activeFeedTab === "trending") tabParam = "trending";

      const res = await fetch(`/api/posts?tab=${tabParam}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeFeedTab]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch("/api/trending");
      if (res.ok) {
        const data = await res.json();
        setTrendingTags(data);
      }
    } catch (err) {
      console.error("Error fetching trending tags:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  const searchPosts = async (query) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Error searching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Mutators
  const createPost = async (content, image, gif, poll, location, scheduledAt) => {
    setModerationError(null);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, image, gif, poll, location, scheduledAt }),
    });

    if (!res.ok) {
      const errData = await res.json();
      if (errData.flagged) {
        setModerationError({
          message: errData.error,
          reason: errData.reason,
        });
      }
      throw new Error(errData.error || "Failed to create post");
    }

    const newPost = await res.json();
    // Refresh trending tags as new hashtags could be registered
    fetchTrending();
    fetchAnalytics();
    return newPost;
  };

  const voteInPoll = async (postId, optionIndex) => {
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updatedPost : p))
        );
      }
    } catch (err) {
      console.error("Error voting in poll:", err);
    }
  };

  const deletePost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setBookmarks((prev) => prev.filter((p) => p.id !== postId));
        fetchAnalytics();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete post");
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      throw err;
    }
  };

  const likePost = async (postId) => {
    if (!currentUser) return;
    const username = currentUser.username;

    // Optimistically update likes in local state immediately
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.likes.includes(username);
          const newLikes = isLiked
            ? p.likes.filter((u) => u !== username)
            : [...p.likes, username];
          return { ...p, likes: newLikes };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) {
        // Rollback to keep server truth if server reports failure
        fetchPosts();
      }
      fetchAnalytics();
    } catch (err) {
      console.error("Error liking post:", err);
      fetchPosts();
    }
  };

  const viewPost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/view`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, views: data.views } : p
          )
        );
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Error viewing post:", err);
    }
  };

  const commentPost = async (postId, content) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
          )
        );
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Error commenting on post:", err);
    }
  };

  const repostPost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/repost`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, reposts: data.reposts } : p
          )
        );
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Error reposting:", err);
    }
  };

  const toggleFollow = async (username) => {
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Update current user's following list safely using functional state update
        setCurrentUser((prev) => prev ? {
          ...prev,
          following: data.following,
        } : null);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const updateProfile = async (data) => {
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const clearModerationError = () => {
    setModerationError(null);
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data);
      }
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
    }
  };

  const bookmarkPost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchBookmarks(); // Reload bookmarks
        return data.bookmarked;
      }
    } catch (err) {
      console.error("Error bookmarking post:", err);
    }
    return false;
  };

  const clearBookmarks = async () => {
    try {
      const res = await fetch("/api/bookmarks", { method: "DELETE" });
      if (res.ok) {
        setBookmarks([]);
      }
    } catch (err) {
      console.error("Error clearing bookmarks:", err);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (err) {
      console.error("Error fetching lists:", err);
    }
  };

  const createList = async (name, description, members, isPrivate) => {
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, members, isPrivate }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create list");
    }
    const newList = await res.json();
    await fetchLists(); // Reload lists
    return newList;
  };

  const deleteList = async (listId) => {
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete list");
    }
    await fetchLists(); // Reload lists
  };

  const fetchListPosts = async (listId) => {
    const res = await fetch(`/api/lists/${listId}/posts`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch list posts");
    }
    return await res.json();
  };

  const login = async (username, password) => {
    const cleanUsername = username.trim().toLowerCase();
    const isSeedUser = cleanUsername === "aarish_master" || cleanUsername.startsWith("aarish_");

    if (isSeedUser) {
      console.log("🔑 Seed user detected. Authenticating directly via local MongoDB server...");
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password }),
      });
      if (!res.ok) {
        const apiErr = await res.json();
        throw new Error(apiErr.error || "MongoDB login failed");
      }
      const user = await res.json();
      setCurrentUser(user);
      if (socket) {
        socket.emit("join_user_room", user.username);
      }
      await Promise.all([
        fetchPosts(),
        fetchNotifications(),
        fetchTrending(),
        fetchAnalytics()
      ]);
      return;
    }

    // 1. Authenticate with Firebase Auth first
    const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@pulsestream.com`;
    let idToken;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      idToken = await userCredential.user.getIdToken();
    } catch (err) {
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("⚠️ Firebase Email/Password Auth is disabled in Firebase console. Falling back to direct MongoDB auth...");
        setFirebaseWarning("Email/Password provider is not enabled in your Firebase console. We have gracefully fallen back to direct MongoDB authentication so you can sign in!");
        
        // Direct MongoDB fallback
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername, password }),
        });
        if (!res.ok) {
          const apiErr = await res.json();
          throw new Error(apiErr.error || "MongoDB login failed");
        }
        const user = await res.json();
        setCurrentUser(user);
        if (socket) {
          socket.emit("join_user_room", user.username);
        }
        await Promise.all([
          fetchPosts(),
          fetchNotifications(),
          fetchTrending(),
          fetchAnalytics()
        ]);
        return;
      }
      console.error("Firebase auth login failed:", err);
      throw new Error(err.message || "Invalid credentials in Firebase Auth");
    }

    // 2. Exchange Firebase ID Token with Express/MongoDB session
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, username: cleanUsername }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Express server authentication failed");
    }

    const user = await res.json();
    setCurrentUser(user);
    if (socket) {
      socket.emit("join_user_room", user.username);
    }
    await Promise.all([
      fetchPosts(),
      fetchNotifications(),
      fetchTrending(),
      fetchAnalytics()
    ]);
  };

  const register = async (username, displayName, password) => {
    const cleanUsername = username.trim().toLowerCase();

    // 1. Create user in Firebase Auth first
    const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@pulsestream.com`;
    let idToken;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      idToken = await userCredential.user.getIdToken();
    } catch (err) {
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("⚠️ Firebase Email/Password Auth is disabled in Firebase console. Falling back to direct MongoDB registration...");
        setFirebaseWarning("Email/Password provider is not enabled in your Firebase console. We have gracefully fallen back to direct MongoDB authentication so you can register!");

        // Direct MongoDB registration fallback
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername, displayName, password }),
        });
        if (!res.ok) {
          const apiErr = await res.json();
          throw new Error(apiErr.error || "MongoDB registration failed");
        }
        const user = await res.json();
        setCurrentUser(user);
        if (socket) {
          socket.emit("join_user_room", user.username);
        }
        await Promise.all([
          fetchPosts(),
          fetchNotifications(),
          fetchTrending(),
          fetchAnalytics()
        ]);
        return;
      }
      console.error("Firebase auth registration failed:", err);
      throw new Error(err.message || "Failed to create account in Firebase Auth");
    }

    // 2. Exchange Firebase ID Token and save profile to MongoDB backend
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, username: cleanUsername, displayName }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to synchronize profile on Express server");
    }

    const user = await res.json();
    setCurrentUser(user);
    if (socket) {
      socket.emit("join_user_room", user.username);
    }
    await Promise.all([
      fetchPosts(),
      fetchNotifications(),
      fetchTrending(),
      fetchAnalytics()
    ]);
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      // Exchange Firebase ID Token and save/retrieve profile from MongoDB
      const res = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to synchronize Google profile with Express server");
      }

      const user = await res.json();
      setCurrentUser(user);
      if (socket) {
        socket.emit("join_user_room", user.username);
      }
      await Promise.all([
        fetchPosts(),
        fetchNotifications(),
        fetchTrending(),
        fetchAnalytics()
      ]);
      return user;
    } catch (err) {
      console.error("Google Sign-In failed:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Error signing out from Firebase Auth:", err);
    }
    const res = await fetch("/api/logout", { method: "POST" });
    if (res.ok) {
      setCurrentUser(null);
    } else {
      throw new Error("Logout failed");
    }
  };

  const deleteAccount = async () => {
    const res = await fetch("/api/users/account", { method: "DELETE" });
    if (res.ok) {
      setCurrentUser(null);
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete account");
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        posts,
        notifications,
        trendingTags,
        analytics,
        loading,
        activeFeedTab,
        setActiveFeedTab,
        createPost,
        voteInPoll,
        deletePost,
        likePost,
        viewPost,
        commentPost,
        repostPost,
        toggleFollow,
        updateProfile,
        deleteAccount,
        markNotificationsAsRead,
        fetchPosts,
        fetchTrending,
        fetchAnalytics,
        searchPosts,
        login,
        register,
        loginWithGoogle,
        logout,
        socket,
        moderationError,
        clearModerationError,
        firebaseWarning,
        setFirebaseWarning,
        bookmarks,
        lists,
        bookmarkPost,
        fetchBookmarks,
        clearBookmarks,
        fetchLists,
        createList,
        deleteList,
        fetchListPosts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
