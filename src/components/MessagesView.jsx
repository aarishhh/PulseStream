import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import { 
  Send, 
  Search, 
  Mail, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  ArrowLeft
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const MessagesView = () => {
  const { currentUser, socket } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [allMessages, setAllMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch all messages and active contacts
  const fetchMessagesAndContacts = async () => {
    try {
      const msgRes = await fetch("/api/messages");
      let msgs = [];
      if (msgRes.ok) {
        msgs = await msgRes.json();
        setAllMessages(msgs);
      }

      // Extract unique conversation partners from messages
      const conversationPartners = msgs.reduce((acc, m) => {
        const partner = m.senderUsername === currentUser?.username ? m.receiverUsername : m.senderUsername;
        if (partner && partner !== currentUser?.username && !acc.includes(partner)) {
          acc.push(partner);
        }
        return acc;
      }, []);

      // If we passed a user from state (e.g. click Message on profile), make sure they are in the fetch list
      const selectContactFromState = location.state?.selectContact;
      if (selectContactFromState && selectContactFromState.username && !conversationPartners.includes(selectContactFromState.username)) {
        conversationPartners.push(selectContactFromState.username);
      }

      const usersToFetch = Array.from(new Set(conversationPartners))
        .filter(u => u && u.toLowerCase() !== currentUser?.username?.toLowerCase());

      let fetchedUsers = [];
      try {
        const batchRes = await fetch("/api/users/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: usersToFetch })
        });
        if (batchRes.ok) {
          fetchedUsers = await batchRes.json();
        }
      } catch (batchErr) {
        console.error("Batch fetch failed, falling back to individual fetch:", batchErr);
      }

      if (fetchedUsers.length === 0) {
        await Promise.all(
          usersToFetch.map(async (uname) => {
            try {
              const userRes = await fetch(`/api/users/${uname}`);
              if (userRes.ok) {
                const u = await userRes.json();
                fetchedUsers.push(u);
              }
            } catch (e) {
              console.error("Error fetching user info:", uname, e);
            }
          })
        );
      }

      // De-duplicate fetched users just in case
      const seen = new Set();
      const uniqueFetchedUsers = fetchedUsers.filter(u => {
        if (!u || !u.username) return false;
        const lower = u.username.toLowerCase();
        if (lower === currentUser?.username?.toLowerCase()) return false;
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });

      setContacts(uniqueFetchedUsers);

      // Handle selecting initial contact from navigation state
      if (selectContactFromState) {
        const match = uniqueFetchedUsers.find(
          (u) => u.username.toLowerCase() === selectContactFromState.username.toLowerCase()
        );
        if (match) {
          setActiveContact(match);
        } else {
          setActiveContact(selectContactFromState);
          setContacts((prev) => {
            if (prev.some((u) => u.username.toLowerCase() === selectContactFromState.username.toLowerCase())) {
              return prev;
            }
            return [...prev, selectContactFromState];
          });
        }
      } else if (uniqueFetchedUsers.length > 0 && !activeContact) {
        // Find if there is any user with unread messages, or default to first
        const unreadPartner = uniqueFetchedUsers.find(u => 
          msgs.some(m => m.senderUsername === u.username && m.receiverUsername === currentUser?.username && !m.read)
        );
        setActiveContact(unreadPartner || uniqueFetchedUsers[0]);
      }
    } catch (err) {
      console.error("Error fetching messages layout:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesAndContacts();
  }, [location.state?.selectContact, currentUser]);

  // Set up socket listener for real-time messages and read events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setAllMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // If the message is from a sender not in contacts, fetch and add them dynamically
      const sender = msg.senderUsername;
      if (sender && sender !== currentUser?.username) {
        setContacts((prev) => {
          const exists = prev.some(u => u.username.toLowerCase() === sender.toLowerCase());
          if (!exists) {
            fetch(`/api/users/${sender}`)
              .then((res) => {
                if (res.ok) return res.json();
              })
              .then((userData) => {
                if (userData) {
                  setContacts((curr) => {
                    if (curr.some((u) => u.username.toLowerCase() === userData.username.toLowerCase())) {
                      return curr;
                    }
                    return [...curr, userData];
                  });
                }
              })
              .catch((err) => console.error("Error fetching incoming message sender:", err));
          }
          return prev;
        });
      }

      // If the message is from the active contact, mark it as read immediately
      if (activeContact && msg.senderUsername === activeContact.username) {
        markAsRead(activeContact.username);
      }
    };

    const handleMessagesRead = ({ senderUsername, receiverUsername }) => {
      if (receiverUsername === currentUser?.username) {
        setAllMessages((prev) =>
          prev.map((m) =>
            m.senderUsername === senderUsername && m.receiverUsername === receiverUsername
              ? { ...m, read: true }
              : m
          )
        );
      }
    };

    socket.on("message_received", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    return () => {
      socket.off("message_received", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket, activeContact, currentUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, activeContact]);

  const markAsRead = async (contactUsername) => {
    try {
      await fetch(`/api/messages/read-all/${contactUsername}`, { method: "POST" });
      setAllMessages((prev) =>
        prev.map((m) =>
          m.senderUsername === contactUsername && m.receiverUsername === currentUser?.username
            ? { ...m, read: true }
            : m
        )
      );
    } catch (e) {
      console.error("Failed to mark messages as read:", e);
    }
  };

  // Automatically mark active contact messages as read when contact is set/changed
  useEffect(() => {
    if (activeContact && currentUser) {
      markAsRead(activeContact.username);
    }
  }, [activeContact, currentUser]);

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeContact) return;

    const textToSend = newMessageText;
    setNewMessageText("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUsername: activeContact.username,
          content: textToSend,
        }),
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setAllMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Group messages for contact sidebar preview
  const getLatestMessage = (username) => {
    const contactMsgs = allMessages.filter(
      (m) =>
        (m.senderUsername === username && m.receiverUsername === currentUser?.username) ||
        (m.senderUsername === currentUser?.username && m.receiverUsername === username)
    );
    if (contactMsgs.length === 0) return null;
    return contactMsgs[contactMsgs.length - 1];
  };

  const getUnreadCount = (username) => {
    return allMessages.filter(
      (m) =>
        m.senderUsername === username &&
        m.receiverUsername === currentUser?.username &&
        !m.read
    ).length;
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter messages between active contact and user
  const activeChatMessages = activeContact
    ? allMessages.filter(
        (m) =>
          (m.senderUsername === activeContact.username && m.receiverUsername === currentUser?.username) ||
          (m.senderUsername === currentUser?.username && m.receiverUsername === activeContact.username)
      )
    : [];

  return (
    <div className="flex h-full w-full bg-[#030712] overflow-hidden text-gray-200">
      
      {/* 1. Chats list panel */}
      <div className={`w-full md:w-80 flex-shrink-0 flex flex-col border-r border-white/10 ${activeContact ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Pulse Messages
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search chat or start new..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No contacts found</div>
          ) : (
            filteredContacts.map((contact) => {
              const latestMsg = getLatestMessage(contact.username);
              const unread = getUnreadCount(contact.username);
              const isSelected = activeContact?.username === contact.username;

              return (
                <div
                  key={contact.username}
                  onClick={() => handleSelectContact(contact)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
                    isSelected ? "bg-blue-600/10 border-l-4 border-blue-500" : "hover:bg-white/5"
                  }`}
                >
                  <img
                    src={contact.avatar}
                    alt={contact.displayName}
                    className="w-11 h-11 rounded-full object-cover border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">{contact.displayName}</span>
                      {latestMsg && (
                        <span className="text-[10px] text-gray-500">
                          {new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-white font-semibold" : "text-gray-400"}`}>
                      {latestMsg ? latestMsg.content : "Start a new conversation"}
                    </p>
                  </div>

                  {unread > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Chat Conversation Panel */}
      <div className={`flex-1 flex flex-col h-full bg-black/20 ${!activeContact ? "hidden md:flex items-center justify-center text-center p-8 text-gray-400" : "flex"}`}>
        {activeContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#030712]/50 backdrop-blur">
              <button 
                onClick={() => setActiveContact(null)} 
                className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <img
                src={activeContact.avatar}
                alt={activeContact.displayName}
                className="w-10 h-10 rounded-full object-cover border border-white/10 cursor-pointer"
                onClick={() => navigate(`/profile/${activeContact.username}`)}
              />
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-sm font-bold text-white hover:underline cursor-pointer"
                  onClick={() => navigate(`/profile/${activeContact.username}`)}
                >
                  {activeContact.displayName}
                </h3>
                <span className="text-xs text-gray-500">@{activeContact.username}</span>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {activeChatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-400">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Say Hello to {activeContact.displayName}!</span>
                  <p className="text-xs text-gray-500 max-w-xs">All conversations on PulseStream are real-time, moderated, and synced across devices.</p>
                </div>
              ) : (
                activeChatMessages.map((msg, index) => {
                  const isMe = msg.senderUsername === currentUser?.username;
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!isMe && (
                        <img
                          src={activeContact.avatar}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <div className={`flex flex-col max-w-[70%]`}>
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white/10 text-gray-200 rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className={`text-[9px] text-gray-500 mt-1 self-end flex items-center gap-1`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && (
                            msg.read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-500" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#030712]/50">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-blue-500/50 transition-all">
                <input
                  type="text"
                  placeholder={`Write a message to ${activeContact.displayName}...`}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Mail className="w-12 h-12 text-gray-600" />
            <h3 className="text-lg font-bold text-white font-display">Your Inbox</h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Select an existing contact from the chat list on the left, or search for a user to start writing.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
