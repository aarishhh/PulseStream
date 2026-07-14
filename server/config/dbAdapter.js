import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";

const UserModel = User;
const PostModel = Post;
const CommentModel = Comment;
const MessageModel = Message;
const NotificationModel = Notification;

// Keep a reference to the existing JSON DB state from server.ts so they are always synchronized
let localDbStateRef = null;
let saveLocalDbCallback = null;

export const setLocalDbState = (state, saveCallback) => {
  localDbStateRef = state;
  saveLocalDbCallback = saveCallback;
};

// Check if we are running in real MongoDB mode
const isMongo = () => {
  return mongoose.connection.readyState === 1;
};

// Map Mongoose User to App Type
const mapUser = (mUser) => {
  if (!mUser) return null;
  return {
    username: mUser.username,
    displayName: mUser.displayName,
    avatar: mUser.avatar,
    banner: mUser.banner,
    bio: mUser.bio,
    location: mUser.location,
    joinedDate: mUser.joinedDate,
    website: mUser.website,
    followers: mUser.followers || [],
    following: mUser.following || [],
  };
};

export const dbAdapter = {
  // --- USER OPERATIONS ---
  getUser: async (username) => {
    const cleanUsername = username.toLowerCase();
    if (isMongo()) {
      const u = await UserModel.findOne({ username: cleanUsername });
      return u ? mapUser(u) : null;
    }
    return localDbStateRef?.users[cleanUsername] || null;
  },

  createUser: async (userData) => {
    const cleanUsername = userData.username.toLowerCase();
    if (isMongo()) {
      const u = await UserModel.create({
        username: cleanUsername,
        displayName: userData.displayName,
        avatar: userData.avatar,
        banner: userData.banner,
        bio: userData.bio,
        location: userData.location,
        joinedDate: userData.joinedDate,
        website: userData.website,
        followers: userData.followers || [],
        following: userData.following || [],
        badges: userData.badges || ["Early Adopter"],
        analytics: userData.analytics || { impressions: 0, engagementRate: 0, profileVisits: 0 },
      });
      return mapUser(u);
    }
    if (localDbStateRef) {
      localDbStateRef.users[cleanUsername] = {
        ...userData,
        username: cleanUsername,
        followers: userData.followers || [],
        following: userData.following || [],
        badges: userData.badges || ["Early Adopter"]
      };
      saveLocalDbCallback?.();
      return localDbStateRef.users[cleanUsername];
    }
    return userData;
  },

  updateUser: async (username, updates) => {
    const cleanUsername = username.toLowerCase();
    if (isMongo()) {
      const u = await UserModel.findOneAndUpdate(
        { username: cleanUsername },
        { $set: updates },
        { new: true }
      );
      return u ? mapUser(u) : null;
    }
    if (localDbStateRef && localDbStateRef.users[cleanUsername]) {
      localDbStateRef.users[cleanUsername] = {
        ...localDbStateRef.users[cleanUsername],
        ...updates,
      };
      saveLocalDbCallback?.();
      return localDbStateRef.users[cleanUsername];
    }
    return null;
  },

  getAllUsers: async () => {
    if (isMongo()) {
      const list = await UserModel.find({});
      return list.map(mapUser);
    }
    return Object.values(localDbStateRef?.users || {});
  },

  // --- POST OPERATIONS ---
  getPosts: async (queryTab, activeUser) => {
    if (isMongo()) {
      let query = {};
      if (queryTab === "following" && activeUser) {
        query = { authorUsername: { $in: [...activeUser.following, activeUser.username] } };
      }
      
      const mPosts = await PostModel.find(query).sort({ createdAt: -1 });
      const postsWithAuthors = [];

      for (const p of mPosts) {
        const author = await UserModel.findOne({ username: p.authorUsername });
        if (!author) continue;

        // Fetch comments
        const mComments = await CommentModel.find({ postId: p._id }).sort({ createdAt: 1 });
        const commentsWithAuthors = [];
        for (const c of mComments) {
          const cAuthor = await UserModel.findOne({ username: c.authorUsername });
          if (cAuthor) {
            commentsWithAuthors.push({
              id: c._id.toString(),
              author: mapUser(cAuthor),
              content: c.content,
              createdAt: c.createdAt.toISOString()
            });
          }
        }

        postsWithAuthors.push({
          id: p._id.toString(),
          author: mapUser(author),
          content: p.content,
          image: p.image || undefined,
          likes: p.likes || [],
          reposts: p.reposts || [],
          comments: commentsWithAuthors,
          views: p.views || 0,
          category: p.category,
          tags: p.tags,
          isModerated: true,
          createdAt: p.createdAt.toISOString(),
        });
      }

      if (queryTab === "trending") {
        return postsWithAuthors.sort((a, b) => b.views - a.views);
      }
      return postsWithAuthors;
    }

    // Local JSON DB fallback logic
    let filteredPosts = [...(localDbStateRef?.posts || [])];
    if (queryTab === "following" && activeUser) {
      filteredPosts = filteredPosts.filter(p => activeUser.following.includes(p.author.username) || p.author.username === activeUser.username);
    } else if (queryTab === "trending") {
      filteredPosts = filteredPosts.sort((a, b) => b.views - a.views);
    } else {
      filteredPosts = filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return filteredPosts;
  },

  getPost: async (id) => {
    if (isMongo() && mongoose.Types.ObjectId.isValid(id)) {
      const p = await PostModel.findById(id);
      if (!p) return null;

      const author = await UserModel.findOne({ username: p.authorUsername });
      if (!author) return null;

      const mComments = await CommentModel.find({ postId: p._id }).sort({ createdAt: 1 });
      const commentsWithAuthors = [];
      for (const c of mComments) {
        const cAuthor = await UserModel.findOne({ username: c.authorUsername });
        if (cAuthor) {
          commentsWithAuthors.push({
            id: c._id.toString(),
            author: mapUser(cAuthor),
            content: c.content,
            createdAt: c.createdAt.toISOString()
          });
        }
      }

      return {
        id: p._id.toString(),
        author: mapUser(author),
        content: p.content,
        image: p.image || undefined,
        likes: p.likes || [],
        reposts: p.reposts || [],
        comments: commentsWithAuthors,
        views: p.views || 0,
        category: p.category,
        tags: p.tags,
        isModerated: true,
        createdAt: p.createdAt.toISOString(),
      };
    }
    return localDbStateRef?.posts.find((p) => p.id === id) || null;
  },

  createPost: async (postData) => {
    if (isMongo()) {
      const p = await PostModel.create({
        authorUsername: postData.authorUsername,
        content: postData.content,
        image: postData.image || "",
        likes: [],
        reposts: [],
        views: 0,
        category: postData.category || "General",
        tags: postData.tags || [],
      });
      const author = await UserModel.findOne({ username: postData.authorUsername });
      return {
        id: p._id.toString(),
        author: mapUser(author),
        content: p.content,
        image: p.image || undefined,
        likes: [],
        reposts: [],
        comments: [],
        views: 0,
        category: p.category,
        tags: p.tags,
        isModerated: true,
        createdAt: p.createdAt.toISOString(),
      };
    }

    const localAuthor = localDbStateRef?.users[postData.authorUsername];
    const newPost = {
      id: "post_" + Date.now(),
      author: localAuthor,
      content: postData.content,
      image: postData.image,
      likes: [],
      reposts: [],
      comments: [],
      views: 0,
      category: postData.category,
      tags: postData.tags,
      isModerated: true,
      createdAt: new Date().toISOString()
    };
    if (localDbStateRef) {
      localDbStateRef.posts.unshift(newPost);
      saveLocalDbCallback?.();
    }
    return newPost;
  },

  updatePost: async (id, updates) => {
    if (isMongo() && mongoose.Types.ObjectId.isValid(id)) {
      const p = await PostModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
      if (!p) return null;
      return dbAdapter.getPost(id);
    }
    if (localDbStateRef) {
      const index = localDbStateRef.posts.findIndex((p) => p.id === id);
      if (index !== -1) {
        localDbStateRef.posts[index] = {
          ...localDbStateRef.posts[index],
          ...updates,
        };
        saveLocalDbCallback?.();
        return localDbStateRef.posts[index];
      }
    }
    return null;
  },

  // --- COMMENT OPERATIONS ---
  createComment: async (postId, authorUsername, content) => {
    if (isMongo()) {
      const c = await CommentModel.create({
        postId: new mongoose.Types.ObjectId(postId),
        authorUsername,
        content,
      });
      const author = await UserModel.findOne({ username: authorUsername });
      return {
        id: c._id.toString(),
        author: mapUser(author),
        content: c.content,
        createdAt: c.createdAt.toISOString()
      };
    }

    const localAuthor = localDbStateRef?.users[authorUsername];
    const newComment = {
      id: "comment_" + Date.now(),
      author: localAuthor,
      content,
      createdAt: new Date().toISOString()
    };

    if (localDbStateRef) {
      const post = localDbStateRef.posts.find((p) => p.id === postId);
      if (post) {
        post.comments.push(newComment);
        saveLocalDbCallback?.();
      }
    }
    return newComment;
  },

  // --- MESSAGE OPERATIONS ---
  getMessages: async (username) => {
    const cleanUsername = username.toLowerCase();
    if (isMongo()) {
      const msgs = await MessageModel.find({
        $or: [{ senderUsername: cleanUsername }, { receiverUsername: cleanUsername }]
      }).sort({ createdAt: 1 });
      return msgs.map(m => ({
        id: m._id.toString(),
        senderUsername: m.senderUsername,
        receiverUsername: m.receiverUsername,
        content: m.content,
        read: m.read,
        createdAt: m.createdAt.toISOString()
      }));
    }
    return (localDbStateRef?.messages || []).filter(
      (m) => m.senderUsername === cleanUsername || m.receiverUsername === cleanUsername
    );
  },

  createMessage: async (senderUsername, receiverUsername, content) => {
    if (isMongo()) {
      const m = await MessageModel.create({
        senderUsername: senderUsername.toLowerCase(),
        receiverUsername: receiverUsername.toLowerCase(),
        content,
        read: false
      });
      return {
        id: m._id.toString(),
        senderUsername: m.senderUsername,
        receiverUsername: m.receiverUsername,
        content: m.content,
        read: m.read,
        createdAt: m.createdAt.toISOString()
      };
    }

    const newMessage = {
      id: "msg_" + Date.now(),
      senderUsername: senderUsername.toLowerCase(),
      receiverUsername: receiverUsername.toLowerCase(),
      content,
      createdAt: new Date().toISOString(),
      read: false
    };
    if (localDbStateRef) {
      localDbStateRef.messages.push(newMessage);
      saveLocalDbCallback?.();
    }
    return newMessage;
  },

  markMessagesAsRead: async (senderUsername, receiverUsername) => {
    const sender = senderUsername.toLowerCase();
    const receiver = receiverUsername.toLowerCase();
    if (isMongo()) {
      await MessageModel.updateMany(
        { senderUsername: sender, receiverUsername: receiver, read: false },
        { $set: { read: true } }
      );
      return;
    }
    if (localDbStateRef) {
      localDbStateRef.messages.forEach((m) => {
        if (m.senderUsername === sender && m.receiverUsername === receiver) {
          m.read = true;
        }
      });
      saveLocalDbCallback?.();
    }
  },

  // --- NOTIFICATION OPERATIONS ---
  getNotifications: async (username) => {
    const cleanUsername = username.toLowerCase();
    if (isMongo()) {
      const notifs = await NotificationModel.find({ receiverUsername: cleanUsername }).sort({ createdAt: -1 });
      const list = [];
      for (const n of notifs) {
        const sUser = await UserModel.findOne({ username: n.senderUsername });
        list.push({
          id: n._id.toString(),
          receiverUsername: n.receiverUsername,
          type: n.type,
          sender: sUser ? mapUser(sUser) : undefined,
          post: n.postId ? { id: n.postId, content: "" } : undefined,
          read: n.read,
          createdAt: n.createdAt.toISOString()
        });
      }
      return list;
    }
    const fallbacks = (localDbStateRef?.notifications || []).filter((n) => n.receiverUsername === cleanUsername);
    return fallbacks.map((n) => ({
      id: n.id,
      receiverUsername: n.receiverUsername,
      type: n.type,
      sender: n.sender && typeof n.sender === "object" ? n.sender : (localDbStateRef?.users[String(n.sender || "").toLowerCase()] || undefined),
      post: n.post,
      content: n.content,
      read: n.read,
      createdAt: n.createdAt
    }));
  },

  createNotification: async (notifData) => {
    if (isMongo()) {
      const n = await NotificationModel.create({
        receiverUsername: notifData.receiverUsername.toLowerCase(),
        type: notifData.type,
        senderUsername: notifData.senderUsername.toLowerCase(),
        postId: notifData.postId || "",
        read: false
      });
      const sUser = await UserModel.findOne({ username: notifData.senderUsername.toLowerCase() });
      return {
        id: n._id.toString(),
        receiverUsername: n.receiverUsername,
        type: n.type,
        sender: sUser ? mapUser(sUser) : undefined,
        post: n.postId ? { id: n.postId, content: "" } : undefined,
        read: n.read,
        createdAt: n.createdAt.toISOString()
      };
    }

    const senderProfile = localDbStateRef?.users[notifData.senderUsername.toLowerCase()];
    const newNotif = {
      id: "notif_" + Date.now(),
      receiverUsername: notifData.receiverUsername.toLowerCase(),
      type: notifData.type,
      sender: senderProfile,
      post: notifData.postId ? { id: notifData.postId, content: "" } : undefined,
      read: false,
      createdAt: new Date().toISOString()
    };
    if (localDbStateRef) {
      localDbStateRef.notifications.unshift(newNotif);
      saveLocalDbCallback?.();
    }
    return newNotif;
  },

  markNotificationsAsRead: async (username) => {
    const cleanUsername = username.toLowerCase();
    if (isMongo()) {
      await NotificationModel.updateMany({ receiverUsername: cleanUsername, read: false }, { $set: { read: true } });
      return;
    }
    if (localDbStateRef) {
      localDbStateRef.notifications.forEach((n) => {
        if (n.receiverUsername === cleanUsername) {
          n.read = true;
        }
      });
      saveLocalDbCallback?.();
    }
  }
};
