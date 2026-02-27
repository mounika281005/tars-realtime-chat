"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  Pin,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { formatMessageTime } from "@/lib/formatMessageTime";

const EMOJIS = [
  "\u{1F44D}",
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F62E}",
  "\u{1F622}",
];
export default function ChatPage() {
  const { user } = useUser();

  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<Id<"conversations"> | null>(null);
  const [message, setMessage] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewBtn, setShowNewBtn] = useState(false);
  const [showCreateGroup, setShowCreateGroup] =
    useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] =
    useState<Id<"users">[]>([]);
  const [now, setNow] = useState(Date.now());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const prevMessageCountRef = useRef(0);

  /* ============================
     QUERIES
  ============================ */

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const users = useQuery(
    api.users.getAllUsers,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const conversations = useQuery(
    api.conversations.getUserConversations,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const messages = useQuery(
    api.messages.getMessages,
    selectedConversation
      ? { conversationId: selectedConversation }
      : "skip"
  );

  const typingUsers = useQuery(
    api.presence.getTypingUsers,
    selectedConversation
      ? { conversationId: selectedConversation }
      : "skip"
  );

  /* ============================
     MUTATIONS
  ============================ */

  const sendMessage =
    useMutation(api.messages.sendMessage);
  const createOrUpdateUser =
    useMutation(api.users.createOrUpdateUser);
  const deleteMessage =
    useMutation(api.messages.deleteMessage);
  const toggleReaction =
    useMutation(api.messages.toggleReaction);
  const markAsRead =
    useMutation(api.messages.markAsRead);
  const createOrGetConversation =
    useMutation(
      api.conversations.createOrGetConversation
    );
  const createGroupConversation = useMutation(
    api.conversations.createGroupConversation
  );
  const updatePresence =
    useMutation(api.presence.updatePresence);

  /* ============================
     ONLINE HEARTBEAT
  ============================ */

  useEffect(() => {
    if (!user?.id) return;

    createOrUpdateUser({
      clerkId: user.id,
      name:
        user.fullName ||
        user.username ||
        "User",
      email:
        user.primaryEmailAddress
          ?.emailAddress || "",
      imageUrl: user.imageUrl || "",
    });
  }, [user, createOrUpdateUser]);

  useEffect(() => {
    if (!currentUser) return;

    updatePresence({
      userId: currentUser._id,
      isOnline: true,
      isTyping: false,
    });

    const interval = setInterval(() => {
      updatePresence({
        userId: currentUser._id,
        isOnline: true,
        isTyping: false,
      });
    }, 15000);

    return () => {
      clearInterval(interval);
      updatePresence({
        userId: currentUser._id,
        isOnline: false,
        isTyping: false,
      });
    };
  }, [currentUser]);

  /* ============================
     SMART SCROLL
  ============================ */

  useEffect(() => {
    const currentCount = messages?.length ?? 0;
    const previousCount = prevMessageCountRef.current;
    const hasNewMessage =
      currentCount > previousCount;

    if (hasNewMessage) {
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
        setShowNewBtn(false);
      } else {
        setShowNewBtn(true);
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages?.length, isNearBottom]);

  useEffect(() => {
    prevMessageCountRef.current =
      messages?.length ?? 0;
    setShowNewBtn(false);
    setIsNearBottom(true);
    bottomRef.current?.scrollIntoView({
      behavior: "auto",
    });
  }, [selectedConversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 100;
      const near =
        el.scrollHeight -
          el.scrollTop -
          el.clientHeight <
        threshold;

      setIsNearBottom(near);
      if (near) setShowNewBtn(false);
    };

    el.addEventListener("scroll", onScroll);
    return () =>
      el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        Loading...
      </div>
    );
  }

  /* ============================
     TYPING USERS
  ============================ */

  const activeTypers =
    typingUsers?.filter(
      (p) => p.userId !== currentUser._id
    ) ?? [];

  const typingNames = activeTypers
    .map((p) =>
      users?.find((u) => u._id === p.userId)?.name
    )
    .filter(Boolean);

  /* ============================
     SEND MESSAGE
  ============================ */

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation)
      return;

    await sendMessage({
      conversationId: selectedConversation,
      senderId: currentUser._id,
      body: message,
    });

    setMessage("");
  };

  const handleSelectUser = async (
    otherUserId: Id<"users">
  ) => {
    const conversationId =
      await createOrGetConversation({
        currentUserId: currentUser._id,
        otherUserId,
      });

    setSelectedConversation(conversationId);

    await markAsRead({
      conversationId,
      userId: currentUser._id,
    });
  };

  const handleToggleGroupMember = (
    userId: Id<"users">
  ) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    if (selectedGroupMembers.length < 2) return;

    const conversationId =
      await createGroupConversation({
        currentUserId: currentUser._id,
        participants: selectedGroupMembers,
        groupName: groupName.trim(),
      });

    setSelectedConversation(conversationId);
    setShowCreateGroup(false);
    setGroupName("");
    setSelectedGroupMembers([]);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  };

  const getUserMeta = (userId: Id<"users">) => {
    if (currentUser._id === userId) return currentUser;
    return users?.find((u) => u._id === userId);
  };

  const isUserOnline = (userInfo?: {
    isOnline?: boolean;
    lastSeen?: number;
  }) => {
    if (!userInfo?.isOnline) return false;
    if (!userInfo.lastSeen) return false;
    return now - userInfo.lastSeen < 30000;
  };

  const handleTyping = (value: string) => {
    setMessage(value);

    if (!selectedConversation) return;

    updatePresence({
      userId: currentUser._id,
      isOnline: true,
      isTyping: true,
      conversationId: selectedConversation,
    });

    if (typingTimeout.current)
      clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      updatePresence({
        userId: currentUser._id,
        isOnline: true,
        isTyping: false,
        conversationId: selectedConversation,
      });
    }, 2000);
  };

  const handleDeleteMessage = async (
    messageId: Id<"messages">
  ) => {
    await deleteMessage({
      messageId,
      userId: currentUser._id,
    });
  };

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string
  ) => {
    await toggleReaction({
      messageId,
      userId: currentUser._id,
      emoji,
    });
  };

  /* ============================
     FILTER + PIN SORT
  ============================ */

  const filteredConversations =
    conversations
      ?.filter((convo) => {
        const term = search.toLowerCase();
        if (!term) return true;

        if (convo.isGroup) {
          return convo.groupName
            ?.toLowerCase()
            .includes(term);
        }

        const otherId =
          convo.participants.find(
            (id) => id !== currentUser._id
          );

        const otherUser = users?.find(
          (u) => u._id === otherId
        );

        return otherUser?.name
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.lastMessageAt - a.lastMessageAt;
      });

  const filteredUsers =
    users?.filter((u) => {
      if (!search.trim()) return true;

      return u.name
        .toLowerCase()
      .includes(search.toLowerCase());
    }) ?? [];

  const selectedConversationData =
    conversations?.find(
      (convo) => convo._id === selectedConversation
    ) ?? null;

  const selectedConversationTitle =
    selectedConversationData?.isGroup
      ? selectedConversationData.groupName
      : users?.find((u) =>
          selectedConversationData?.participants.includes(
            u._id
          )
        )?.name || "Chat";

  /* ============================
     UI
  ============================ */

  return (
    <div className="flex h-screen text-white bg-zinc-950">

      {/* SIDEBAR */}
      <div
        className={`${
          selectedConversation
            ? "hidden md:flex"
            : "flex"
        } w-full md:w-80 bg-zinc-900 border-r border-white/10 flex-col`}
      >
        <div className="p-4 flex justify-between border-b border-white/10">
          <div>
            <h2>Chats</h2>
            <p className="text-xs text-zinc-400">
              {currentUser.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (showCreateGroup) {
                  setShowCreateGroup(false);
                  setGroupName("");
                  setSelectedGroupMembers([]);
                  return;
                }

                setShowCreateGroup(true);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg"
              title="Create group"
            >
              <Plus size={16} />
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center bg-zinc-800 rounded-lg px-3 py-2">
            <Search size={16} />
            <input
              className="bg-transparent ml-2 w-full outline-none"
              placeholder="Search..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          {showCreateGroup && (
            <div className="mt-3 p-3 bg-zinc-800/60 rounded-lg border border-white/10 space-y-3">
              <input
                value={groupName}
                onChange={(e) =>
                  setGroupName(e.target.value)
                }
                placeholder="Group name"
                className="w-full bg-zinc-900 rounded-lg px-3 py-2 outline-none"
              />

              <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 space-y-2">
                {users?.map((u) => (
                  <label
                    key={u._id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-zinc-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupMembers.includes(
                        u._id
                      )}
                      onChange={() =>
                        handleToggleGroupMember(
                          u._id
                        )
                      }
                    />
                    {u.imageUrl ? (
                      <img
                        src={u.imageUrl}
                        alt={u.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-600 text-[10px] font-medium flex items-center justify-center">
                        {getInitials(u.name)}
                      </div>
                    )}
                    <span className="text-sm">
                      {u.name}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateGroup}
                  disabled={
                    !groupName.trim() ||
                    selectedGroupMembers.length < 2
                  }
                  className="flex-1 bg-indigo-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg py-2 text-sm"
                >
                  Create Group
                </button>
                <button
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName("");
                    setSelectedGroupMembers([]);
                  }}
                  className="px-3 py-2 rounded-lg bg-zinc-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-2">
          {search.trim() &&
            filteredConversations?.length === 0 &&
            filteredUsers.length === 0 && (
            <p className="text-center text-zinc-500 mt-6">
              No results found
            </p>
          )}

          {!search.trim() &&
            filteredConversations?.length === 0 &&
            filteredUsers.length === 0 && (
            <p className="text-center text-zinc-500 mt-6">
              No conversations yet
            </p>
          )}

          {filteredConversations?.map((convo) => {
            const otherId =
              convo.participants.find(
                (id) => id !== currentUser._id
              );

            const otherUser = users?.find(
              (u) => u._id === otherId
            );

            const title = convo.isGroup
              ? convo.groupName
              : otherUser?.name;

            return (
              <div
                key={convo._id}
                onClick={() => {
                  setSelectedConversation(convo._id);
                  markAsRead({
                    conversationId: convo._id,
                    userId: currentUser._id,
                  });
                }}
                className="p-3 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <div className="flex justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {convo.isGroup && (
                      <div className="flex -space-x-2">
                        {convo.participants
                          .slice(0, 3)
                          .map((id) => {
                            const member =
                              getUserMeta(id);
                            return (
                              member?.imageUrl ? (
                                <img
                                  key={id}
                                  src={
                                    member.imageUrl
                                  }
                                  alt={
                                    member.name ||
                                    "member"
                                  }
                                  className="w-5 h-5 rounded-full border border-zinc-900 object-cover bg-zinc-700"
                                />
                              ) : (
                                <div
                                  key={id}
                                  className="w-5 h-5 rounded-full border border-zinc-900 bg-zinc-600 text-[9px] font-medium flex items-center justify-center"
                                  title={
                                    member?.name ||
                                    "member"
                                  }
                                >
                                  {getInitials(
                                    member?.name
                                  )}
                                </div>
                              )
                            );
                          })}
                      </div>
                    )}
                    {!convo.isGroup &&
                      isUserOnline(otherUser) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    <p className="truncate">
                      {title}
                    </p>
                  </div>
                  {convo.isPinned && (
                    <Pin size={14} />
                  )}
                </div>

                <p className="text-xs text-zinc-400 truncate">
                  {convo.isGroup
                    ? `${convo.participants.length} members`
                    : convo.lastMessage}
                </p>

                {convo.isGroup && convo.lastMessage && (
                  <p className="text-xs text-zinc-500 truncate">
                    {convo.lastMessage}
                  </p>
                )}

                {convo.unreadCount > 0 && (
                  <span className="bg-indigo-600 text-xs px-2 py-1 rounded-full">
                    {convo.unreadCount}
                  </span>
                )}
              </div>
            );
          })}

          {filteredUsers.length > 0 && (
            <p className="px-2 pt-2 text-xs uppercase tracking-wide text-zinc-500">
              People
            </p>
          )}

          {filteredUsers.map((sidebarUser) => {
            const hasExistingDirect =
              conversations?.some(
                (convo) =>
                  !convo.isGroup &&
                  convo.participants.includes(
                    sidebarUser._id
                  )
              ) ?? false;

            return (
              <div
                key={sidebarUser._id}
                onClick={() =>
                  handleSelectUser(
                    sidebarUser._id
                  )
                }
                className="p-3 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    {isUserOnline(sidebarUser) && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                    <p>{sidebarUser.name}</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 truncate">
                  {hasExistingDirect
                    ? "Open conversation"
                    : "Start conversation"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <button
            onClick={() =>
              setSelectedConversation(null)
            }
            className="md:hidden p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            <ArrowLeft size={16} />
          </button>
          <p className="text-sm text-zinc-200 truncate">
            {selectedConversation
              ? selectedConversationTitle
              : "Select a conversation"}
          </p>
        </div>

        {typingNames.length > 0 && (
          <div className="px-6 py-2 text-indigo-400 text-sm italic">
            {typingNames.join(", ")}{" "}
            {typingNames.length > 1
              ? "are typing..."
              : "is typing..."}
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {!selectedConversation && (
            <p className="text-center text-zinc-500 mt-8">
              Choose a user from the sidebar to start
              chatting
            </p>
          )}

          {selectedConversation &&
            messages?.length === 0 && (
            <p className="text-center text-zinc-500">
              No messages yet
            </p>
          )}

          {messages?.map((msg) => {
            const isMe =
              msg.senderId === currentUser._id;
            const reactions =
              msg.reactions ?? [];
            const reactionCounts = EMOJIS.map(
              (emoji) => ({
                emoji,
                count: reactions.filter(
                  (r) => r.emoji === emoji
                ).length,
                hasReacted: reactions.some(
                  (r) =>
                    r.emoji === emoji &&
                    r.userId ===
                      currentUser._id
                ),
              })
            ).filter((r) => r.count > 0);

            const seenUserNames = msg.readBy
              .filter(
                (id) => id !== currentUser._id
              )
              .map(
                (id) =>
                  users?.find(
                    (u) => u._id === id
                  )?.name
              )
              .filter(Boolean);

            return (
              <div
                key={msg._id}
                className={`flex ${
                  isMe
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isMe
                      ? "bg-indigo-600"
                      : "bg-zinc-800"
                  }`}
                >
                  {isMe && !msg.isDeleted && (
                    <div className="mb-1 flex justify-end">
                      <button
                        onClick={() =>
                          handleDeleteMessage(
                            msg._id
                          )
                        }
                        className="text-white/80 hover:text-white"
                        title="Delete message"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {msg.isDeleted ? (
                    <span className="italic text-zinc-400">
                      This message was deleted
                    </span>
                  ) : (
                    msg.body
                  )}

                  <div className="text-xs mt-1 text-right">
                    {formatMessageTime(
                      msg.createdAt
                    )}
                    {isMe &&
                      seenUserNames.length >
                        0 && (
                        <div className="text-[10px] text-blue-300">
                          Seen by{" "}
                          {seenUserNames.join(
                            ", "
                          )}
                        </div>
                      )}
                  </div>

                  {!msg.isDeleted && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {EMOJIS.map((emoji) => {
                          const hasReacted =
                            reactions.some(
                              (r) =>
                                r.emoji === emoji &&
                                r.userId ===
                                  currentUser._id
                            );

                          return (
                            <button
                              key={emoji}
                              onClick={() =>
                                handleToggleReaction(
                                  msg._id,
                                  emoji
                                )
                              }
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                hasReacted
                                  ? "bg-white/20 border-white/50"
                                  : "bg-black/20 border-white/20"
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      {reactionCounts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {reactionCounts.map(
                            (reaction) => (
                              <span
                                key={
                                  reaction.emoji
                                }
                                className="text-[11px] px-2 py-0.5 rounded-full bg-black/20 border border-white/20"
                              >
                                {reaction.emoji}{" "}
                                {
                                  reaction.count
                                }
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {showNewBtn && (
            <button
              onClick={() =>
                bottomRef.current?.scrollIntoView(
                  {
                    behavior:
                      "smooth",
                  }
                )
              }
              className="fixed bottom-24 right-6 bg-indigo-600 px-4 py-2 rounded-full"
            >
              {"\u2193"} New messages
            </button>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <input
            value={message}
            onChange={(e) =>
              handleTyping(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleSend()
            }
            disabled={!selectedConversation}
            className="flex-1 bg-zinc-800 rounded-lg px-4 py-2 outline-none"
            placeholder="Type a message..."
          />
          <button
            onClick={handleSend}
            disabled={!selectedConversation}
            className="bg-indigo-600 px-6 py-2 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

