# Noobieteam Mobile UX & API Test Panel Specs

## 18. Mobile Responsiveness & Layout Transformations
- **Global App Container:** The entire application (Workspace Hub, Kanban Board, Documentation Module, and Settings) must seamlessly adapt to mobile screens (`< 768px`).
- **Responsive Tailwind Breakpoints Strategy:**
  - **The Sidebar (Navigation):**
    - Desktop (`md:flex`): The primary sidebar remains a fixed vertical column on the left.
    - Mobile (`hidden md:flex` or `sm:hidden`): Hide the fixed sidebar and implement a standard **Hamburger Menu** (`lucide-menu`) in the top-left header. Clicking it triggers a full-screen or sliding mobile overlay navigation.
  - **Kanban Board Container:**
    - Desktop (`md:flex-row`, `md:overflow-x-auto`): Columns are arranged horizontally, allowing infinite horizontal scrolling.
    - Mobile (`flex-col`, `gap-y-4`): Columns must stack vertically. Users will scroll down the page to see subsequent stages (e.g., 'To Do' is on top of 'In Progress').
  - **Cards & Modals:**
    - **Cards:** Ensure card wrappers have `w-full` on mobile rather than fixed widths, allowing them to fill the container width.
    - **Modals (Card View/Vault Prompts/Backlog):** Modals must utilize responsive sizing (e.g., `w-[95%] md:max-w-2xl` or `inset-x-4`). Avoid fixed pixel widths that force horizontal scrolling off-screen on smaller devices.
    - **Floating Tools (AI Assistant / Jukebox):** Mobile floating icons should use smaller dimensions (e.g., `w-12 h-12`) and push tighter to the bottom-right edge (`bottom-4 right-4`).

## 19. Dynamic Docs Page: Mobile & API Test Panel
- **Mobile Collapse Strategy:** On mobile screens, the split-pane layout of the Dynamic Docs page must collapse from a side-by-side view (`md:grid-cols-2`) into a vertically stacked view (`flex-col`).
- **Live API Test Panel (UX/UI):**
  - **Location:** When an API endpoint document is selected, the right-hand side of the main content area (or the bottom stack on mobile) must feature a 'Live API Test' panel.
  - **Components:**
    - **Request Viewer:** A clearly formatted block showing the current Request payload (headers, params, body).
    - **Action Button:** A prominent "Send Request" button (e.g., solid system blue).
    - **Response Output Area:** A dedicated, distinct box (e.g., dark background like `#1e1e1e`) displaying the real-time Response status code, execution time, and formatted JSON payload.
  - **Purpose:** This enables external developers viewing the public documentation page to execute live tests against the API on the spot, directly within the browser.