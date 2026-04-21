# Database & Routing Architecture Update for Dynamic Documentation

## 1. Folder Schema Integration
We have extended the core database architecture in `server/db.js` to introduce a natively segregated `Folder` schema:
```javascript
const folderSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String }, // Derived for dynamic URLs
  order: Number,
  createdBy: String
}, { timestamps: true });
```
Additionally, the `docSchema` has been updated with an optional `folderId: String` property. This creates a one-to-many hierarchical relationship where multiple API or Text documents can be neatly organized within a single Folder parent.

## 2. Dynamic React & Express Routing
To support the requirement of Postman-style public API documentation pages, we have constructed a dual-layer dynamic routing system:
- **Frontend (`App.jsx`)**: Implemented a URL path parser. If the request matches `/docs/:workspaceSlug/:folderSlug`, the application intercepts the normal Kanban dashboard flow and natively mounts a new isolated `<window.PublicDocsView />` environment.
- **Backend (`server/index.js`)**: Injected a `catch-all` wildcard route (`app.get('/docs/*')`) pointing directly to `index.html`. This ensures that when a user navigates to a deep dynamic URL, Express correctly serves the React application rather than returning a server 404 block.
