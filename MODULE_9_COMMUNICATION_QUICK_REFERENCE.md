# Module 9: Communication & Document Management - Quick Reference Card

## Components at a Glance

### Messaging Components (Purple Theme)

| Component | Import | Usage |
|-----------|--------|-------|
| MessagingHub | `import { MessagingHub } from './pages/Communication'` | `<MessagingHub />` |
| MessageComposer | `import { MessageComposer } from './pages/Communication'` | `<MessageComposer onClose={fn} />` |
| MessageThread | `import { MessageThread } from './pages/Communication'` | `<MessageThread threadId="123" />` |
| ChannelList | `import { ChannelList } from './pages/Communication'` | `<ChannelList channels={[]} selectedChannel={id} onSelectChannel={fn} />` |
| ChannelView | `import { ChannelView } from './pages/Communication'` | `<ChannelView channelId="123" />` |

### Document Components (Green Theme)

| Component | Import | Usage |
|-----------|--------|-------|
| DocumentLibrary | `import { DocumentLibrary } from './pages/Communication'` | `<DocumentLibrary />` |
| DocumentUploader | `import { DocumentUploader } from './pages/Communication'` | `<DocumentUploader onClose={fn} folderId="123" />` |
| DocumentViewer | `import { DocumentViewer } from './pages/Communication'` | `<DocumentViewer documentId="123" onClose={fn} />` |
| FolderTree | `import { FolderTree } from './pages/Communication'` | `<FolderTree folders={[]} selectedFolder={id} onSelectFolder={fn} />` |

---

## Hooks Quick Reference

### useMessaging Hook

```tsx
const {
  messages,        // Message[]
  channels,        // Channel[]
  loading,         // boolean
  error,          // string | null
  fetchMessages,   // (channelId?) => Promise<void>
  fetchChannels,   // () => Promise<void>
  sendMessage,     // (data) => Promise<Message>
  createChannel,   // (data) => Promise<Channel>
  markAsRead,      // (messageId) => Promise<void>
  searchMessages,  // (query) => Promise<Message[]>
} = useMessaging();
```

### useDocuments Hook

```tsx
const {
  documents,          // Document[]
  folders,           // Folder[]
  loading,           // boolean
  error,            // string | null
  fetchDocuments,    // (folderId?) => Promise<void>
  fetchFolders,      // () => Promise<void>
  uploadDocument,    // (data) => Promise<Document>
  createFolder,      // (data) => Promise<Folder>
  deleteDocument,    // (id) => Promise<void>
  moveDocument,      // (id, folderId) => Promise<void>
  searchDocuments,   // (query) => Promise<Document[]>
  getDocumentVersions, // (id) => Promise<Version[]>
} = useDocuments();
```

---

## Color Reference

### Gradients
```css
/* Messaging Purple */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Documents Green */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

### Priority Colors
```css
Urgent:  #ef4444 (Red)
High:    #f97316 (Orange)
Normal:  #3b82f6 (Blue)
Low:     #6b7280 (Gray)
```

### Channel Types
```css
Direct:    #3b82f6 (Blue)
Group:     #8b5cf6 (Purple)
Team:      #10b981 (Green)
Broadcast: #f59e0b (Orange)
```

---

## API Endpoints

### Messaging
```
POST   /api/messaging/messages
GET    /api/messaging/messages?channelId={id}
POST   /api/messaging/channels
GET    /api/messaging/channels
PATCH  /api/messaging/messages/{id}/read
GET    /api/messaging/messages/search?query={q}
```

### Documents
```
POST   /api/documents
GET    /api/documents?folderId={id}
POST   /api/documents/folders
GET    /api/documents/folders
DELETE /api/documents/{id}
PATCH  /api/documents/{id}/move
GET    /api/documents/search?query={q}
GET    /api/documents/{id}/versions
```

---

## Common Code Snippets

### Send Message with Attachment
```tsx
const handleSend = async (file: File) => {
  await sendMessage({
    subject: "Document Review",
    body: "Please review attached file",
    priority: "HIGH",
    recipientIds: ["user-1", "user-2"],
    attachments: [file],
  });
};
```

### Upload Document
```tsx
const handleUpload = async (file: File) => {
  await uploadDocument({
    file,
    title: file.name,
    category: "Clinical",
    tags: ["Important"],
    accessLevel: "PRIVATE",
  });
};
```

### Create Channel
```tsx
const createTeamChannel = async () => {
  await createChannel({
    name: "Clinical Team",
    type: "TEAM",
    description: "Team coordination",
    memberIds: ["user-1", "user-2", "user-3"],
  });
};
```

---

## File Locations

```
packages/frontend/src/
├── pages/Communication/
│   ├── MessagingHub.tsx         (400 lines)
│   ├── MessageComposer.tsx      (350 lines)
│   ├── MessageThread.tsx        (300 lines)
│   ├── ChannelList.tsx          (250 lines)
│   ├── ChannelView.tsx          (350 lines)
│   ├── DocumentLibrary.tsx      (400 lines)
│   ├── DocumentUploader.tsx     (350 lines)
│   ├── DocumentViewer.tsx       (400 lines)
│   ├── FolderTree.tsx           (350 lines)
│   └── index.ts
└── hooks/
    ├── useMessaging.ts          (180 lines)
    └── useDocuments.ts          (200 lines)
```

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3001
```

---

## Dependencies

```bash
npm install @mui/material @mui/icons-material framer-motion axios date-fns react-dropzone
```

---

## Key Features

### Messaging
✅ Three-pane layout
✅ Priority indicators
✅ Read receipts
✅ File attachments
✅ Channel management
✅ Search messages

### Documents
✅ Drag-drop upload
✅ Folder tree
✅ Grid/list view
✅ Version history
✅ Comments
✅ Share links

---

## Animation Timings

```tsx
// Entrance
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Stagger
transition={{ delay: index * 0.05 }}

// Hover
'&:hover': { transform: 'translateY(-4px)' }
```

---

## TypeScript Interfaces

```tsx
interface Message {
  id: string;
  subject: string;
  body: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  senderId: string;
  senderName: string;
  recipientIds: string[];
  isRead: boolean;
  createdAt: string;
}

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  category?: string;
  tags?: string[];
  accessLevel: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  version: number;
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP' | 'TEAM' | 'BROADCAST';
  memberCount: number;
  unreadCount: number;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  documentCount: number;
  children?: Folder[];
}
```

---

## Responsive Breakpoints

```tsx
xs: < 600px   (Mobile)
sm: 600px     (Tablet)
md: 900px     (Desktop)
lg: 1200px    (Large)
xl: 1536px    (XL)
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message/reply |
| Shift+Enter | New line |
| Esc | Close dialog |
| Tab | Navigate fields |
| Ctrl+F | Search (future) |

---

## Troubleshooting

### Messages not loading
1. Check API URL in `.env`
2. Verify auth token in localStorage
3. Check network tab in DevTools

### Upload fails
1. Check file size limits
2. Verify CORS settings
3. Check backend logs

### Styles not loading
1. Verify MUI is installed
2. Check ThemeProvider
3. Clear cache

---

## Testing Commands

```bash
# Run tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## Documentation Files

1. `MODULE_9_COMMUNICATION_UI_COMPLETION_REPORT.md` - Technical specs
2. `MODULE_9_QUICK_START_GUIDE.md` - Developer guide
3. `MODULE_9_VISUAL_COMPONENT_GUIDE.md` - UI reference
4. `AGENT_6_MODULE_9_FINAL_SUMMARY.md` - Project summary
5. `MODULE_9_COMMUNICATION_QUICK_REFERENCE.md` - This file

---

## Support

Questions? Check:
1. Component source code
2. Hook implementation
3. Documentation files
4. Console errors
5. Network requests

---

**Version:** 1.0.0
**Date:** 2025-11-11
**Module:** 9 - Communication & Document Management
**Status:** ✅ Production Ready
