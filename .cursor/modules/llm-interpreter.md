# LLM Interpreter

## Purpose
Provide the domain model and workflows for persisted chats and projects, while allowing temporary in-memory conversations during a live session.

## Features
- Create and manage individual chats that are always persisted.
- Create projects that group related chats under one project context.
- Support a main chat per project for global project context.
- Support branch chats per project for focused subtopics or deliverables.
- Convert an individual chat into a project main chat.
- Attach an individual chat as a branch chat to an existing project.

## Inputs
- User action to create a persisted chat or project.
- User action to convert/reassign an individual chat into a project role.
- User action to create branch chats under a project.
- User action to delete a chat.
- User action to detach a chat from a project.
- User action to remove a project with a delete-chats option.
- Chat messages exchanged between user and assistant.
- Full chat transcript (including the latest user input) for AI response generation.
- Project metadata (`name`, `context`).

## Outputs
- Rendered chat sessions with correct persistence behavior.
- Persisted chat and project records when required.
- Project chat graph with exactly one main chat and zero or more branch chats.
- Conversion state transitions (individual -> project main, individual -> project branch).
- Chat deletion and project detachment side effects applied consistently.
- Project removal with conditional chat deletion based on input flag.
- AI response generated from the supplied full chat transcript.
- Temporary chat state available only in-memory for the active runtime session.
- Temporary chat state is discarded on refresh/reload and is never written to persistence.

## Data
- `Chat`
  - `id`, `title`
  - `createdAt`, `updatedAt`
- `Project`
  - `id`, `name`, `context`
  - `mainChatId` (required)
- `ProjectBranchChatLink`
  - `projectId`, `chatId`
- `Message`
  - `id`, `chatId`, `sender` (`system` | `user` | `bot`), `content`
  - `createdAt`, `updatedAt`

Constraints:
- Each project must have exactly one main chat.
- Branch chats are connected to projects only through `ProjectBranchChatLink`.
- A branch chat belongs to at most one project through `ProjectBranchChatLink`.
- A project's main chat must not also appear as a branch chat in `ProjectBranchChatLink` for the same project.
- `Message.sender` semantics:
  - `user`: end-user authored message
  - `bot`: assistant model response
  - `system`: system/service event message

## Public API
- Individual chat
  - `createIndividualChat(input?)`
  - `readChats()`
  - `deleteChat(chatId)`
- Projects
  - `createProject(input, mainChatSource)`
  - `readProjects()`
  - `readProjectChats(projectId)`
  - `removeProject(projectId, deleteAttachedChats)`
    - `deleteAttachedChats = true`: delete project, main chat, and all linked branch chats.
    - `deleteAttachedChats = false`: delete project and detach all linked chats.
- Branch
  - `addBranchChat(projectId, chatSource)`
  - `setProjectMainChat(projectId, chatSource)`
  - `moveIndividualChatToProject(projectId, chatId)`
  - `detachChatFromProject(projectId, chatId)`
- Generic
  - `chat(messages) -> aiResponse`
    - Accepts the entire chat (including the newest user message) and returns one AI response.
    - Shared endpoint for temporary, individual persisted, and project chats.

## Test Plan
- Happy path
  - Create project with a required main chat and add multiple branch chats.
  - Convert individual chat to project main chat.
  - Convert individual chat to project branch chat.
- Failure and edge cases
  - Reject project creation without a valid main chat.
  - Reject assigning a branch chat to a second project if it already exists in `ProjectBranchChatLink`.
  - Reject adding a project's main chat as a branch chat in that same project.
  - Reject detaching a chat that is not connected to the specified project.
  - Removing a project with `deleteAttachedChats = false` keeps chats and removes project links only.
  - Removing a project with `deleteAttachedChats = true` removes linked chats and their messages.
  - Ensure message history remains intact across conversions.

## TODOs
- Define archival behavior for deleted projects and detached chats.
- Define whether one individual chat can be linked to multiple projects in future.
- Add permission and ownership model for multi-user collaboration.
