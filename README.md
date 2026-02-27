# Tars Realtime Chat System

A production-style, real-time messaging application built using **Next.js (App Router), TypeScript, Convex, Clerk, and Tailwind CSS**.

This project demonstrates full-stack architecture design, real-time state synchronization, and scalable schema modeling.

---

## System Overview

The application enables:

* Authenticated users to discover other users
* One-on-one and group conversations
* Real-time messaging with presence tracking
* Advanced UX features (typing, unread badges, smart scroll, reactions, edit/delete)

All real-time behavior is powered by **Convex subscriptions**, eliminating the need for manual WebSocket management.

---

# Architecture

## Frontend (Next.js App Router)

* Server Components for layout and static structure
* Client Components for interactive real-time behavior
* Type-safe API integration via Convex generated types
* Responsive UI with Tailwind

## Backend (Convex)

Convex handles:

* Database storage
* Real-time subscriptions
* Query/mutation logic
* Indexing & schema enforcement

No separate REST or WebSocket layer required.

---

# Database Schema Design

The schema was designed for extensibility and real-time efficiency.

## users

```ts
{
  clerkId: string
  name: string
  email: string
  imageUrl: string
}
```

## conversations

```ts
{
  participants: Id<"users">[]
  isGroup: boolean
  groupName?: string
  createdBy: Id<"users">
  lastMessage: string
  lastMessageAt: number
  isPinned?: boolean
}
```

### Design Decision:

Participants are stored as an array for flexible group scaling.
Sorted participant IDs are used for deterministic one-on-one conversation creation.

---

## messages

```ts
{
  conversationId: Id<"conversations">
  senderId: Id<"users">
  body: string
  createdAt: number
  readBy: Id<"users">[]
  reactions?: { emoji: string; userId: Id<"users"> }[]
  isDeleted?: boolean
  isEdited?: boolean
  editedAt?: number
}
```

### Design Decisions:

* **Soft delete** preserves history
* `readBy` enables scalable unread count logic
* `reactions` modeled as array for flexible extension
* `isEdited` + `editedAt` supports edit history expansion later

---

## presence

```ts
{
  userId: Id<"users">
  isOnline: boolean
  isTyping: boolean
  conversationId?: Id<"conversations">
  lastSeen: number
}
```

### Design Decisions:

* Separate presence table avoids bloating users table
* `conversationId` enables scoped typing indicators
* Heartbeat updates maintain accurate online state

---

# Real-Time Data Flow

Convex subscriptions automatically re-run queries when:

* New messages are inserted
* Presence updates
* Reactions toggle
* Read status changes
* Conversations update

This ensures instant UI updates without polling.

---

# Feature Implementation Highlights

## Authentication

Clerk handles:

* Email & OAuth login
* Session management
* User metadata

User profiles are synced into Convex on first login.

---

## Direct Messaging

* Deterministic conversation lookup
* Indexed message queries
* Real-time message rendering

---

## Group Chat

* Multiple participants
* Dynamic member count
* Named conversations

---

## Unread Logic

Unread count is computed via:

```ts
message.readBy.includes(userId)
```

Messages are marked as read when conversation opens.

---

## Typing Indicator

* Presence mutation sets `isTyping`
* Auto-reset after 2 seconds
* Scoped to specific conversation

---

## Smart Auto-Scroll

* Detects proximity to bottom
* Only auto-scrolls if near bottom
* Displays “New Messages” button otherwise

Prevents UX disruption during history reading.

---

## Emoji Reactions

* Toggle logic prevents duplicates
* Aggregated per emoji
* Real-time count updates

---

# Performance Considerations

* Indexed queries for conversations and messages
* Avoided unnecessary re-renders
* Minimal client-side state duplication
* Efficient presence heartbeats (15s interval)

---

# Scalability Thoughts

This architecture can scale to:

* Thousands of concurrent users
* Large group chats
* Additional features like:

  * Message attachments
  * Role-based permissions
  * Read receipts per user
  * Conversation archiving
  * Push notifications

Convex's reactive model significantly reduces backend complexity.

---

# Tech Stack

* Next.js 16 (App Router)
* TypeScript
* Convex
* Clerk
* Tailwind CSS

---

# Live Demo

Production deployment:

[https://tars-realtime-chat-five.vercel.app/](https://tars-realtime-chat-five.vercel.app/)

---

# Running Locally

```bash
git clone <repo>
cd tars-chat
npm install
npm run dev
```

---

# Engineering Focus

This project demonstrates:

* Clean schema modeling
* Real-time system design
* State synchronization without race conditions
* Type-safe full-stack architecture
* Production-oriented UX decisions