# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands
- `npm run dev` - Start development environment (concurrently runs webpack watch and electron)
- `npm run watch` - Run webpack in watch mode
- `npm run start` - Start Electron app without webpack watcher
- `npm run build` - Build the application for distribution

## Code Style Guidelines
- **React Structure**: Function components with hooks (useState, useEffect, useCallback, useContext)
- **State Management**: AppContext for global state, component state for UI-specific logic
- **Component Organization**: Components in `src/components/`, context in `src/context/`
- **File/Function Names**: PascalCase for components, camelCase for functions/variables
- **Imports**: React at top, followed by context, components, then utility functions
- **Error Handling**: Use try/catch with detailed console logging and user-facing messages
- **Console Logging**: Log important operations with descriptive namespaces (e.g., "AppContext: ")
- **Frontend Styling**: Tailwind CSS classes using utility-first approach
- **Function Parameters**: Destructure objects for readability
- **Async/Await**: Preferred over promise chains, always use try/catch for error handling