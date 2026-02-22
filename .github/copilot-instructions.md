## Architecture & Organization

### Folder Structure
```
├── api/    API client code and endpoint definitions  
├── assets/    Static assets (images, fonts, etc.)
├── components/    Reusable ReactNative components
├── config/    Application configuration files
├── constants/    Application-wide constants and enums
├── hocs/    Higher-order components
├── hooks/    Custom React hooks
├── modals/    Modal components
├── screens/    Page-level components (route components)
├── services/    Business logic and external service integrations
└── types/      TypeScript type definitions and interfaces
```

## TypeScript Standards
- **Required**: Explicit return types for all functions
- **Required**: Proper typing - no `any` types without justification
- **Required**: Interface definitions in `types/` folder for shared types
- Flag missing type definitions for props
- Flag implicit any types
- `any` is allowed only in test files

## React Best Practices
- Use functional components only (no class components)
- Use custom hooks from `hooks/` folder for reusable logic
- **Flag** missing `key` props in lists
- **Flag** `useEffect` without dependency arrays

## Component Structure
- Components should be small and focused (max 200 lines)
- Every React component should be responsible for a single piece of UI
- Every React component should not have any business logic (move to services/hooks)
- React components are responsible for rendering UI only. They should accept data via props and render it.
- User actions that modify component state should be placed in a separate custom hook in the `hooks/` folder
- **Flag**: components with mixed responsibilities (UI + business logic)
- **Flag**: if components exceed 200 lines

## Hooks Structure
- Custom hooks should encapsulate reusable logic
- Hooks should be placed in the `hooks/` folder
- Hooks should only manage state and side effects, not render UI or calculate business logic
- **Flag**: hooks that contain JSX or rendering logic, or business logic that should be in services

## Services Structure
- Business logic and external service integrations should be placed in the `services/` folder
- Services should not contain any UI logic or React-specific code
- Services should be pure functions that can be easily tested
- Each service file should focus on a single responsibility (for example, user.service.ts for user-related logic, auth.service.ts for authentication logic, etc.)
- **Flag**: services that contain React code or UI logic
- **Flag**: services that are not pure functions

## Feature Structure
Each feature or screen should follow the same structure:
```
├── ComponentName
│   ├── components/ (sub-components specific to this feature)
│   ├── constants (constants specific to this feature)
│   ├── hocs (higher-order components specific to this feature)
│   ├── hooks
│   │   ├── useComponentName.ts
│   │   └── useComponentName.test.ts
│   ├── services (business logic specific to this feature)
│   ├── types (types/interfaces specific to this feature)
│   ├── ComponentName.tsx
│   └── ComponentName.ui.test.tsx
```

## Ideal React Component Example
```tsx
import React from 'react';
import { Box } from '@ui-library';
import withMappedProps from '../../hocs/withMappedProps';

type ComponentNameProps = { /* props definition */ };

function ComponentName(props: ComponentNameProps) {
    const {/* Actions such as handleOnChange, handleOnClick */} = useComponentNameActions(props);
    
    return (
        <Box>
        {/* JSX markup */}
        </Box>
    );
}

export default withMappedProps(ComponentName);
```

## Styling
- **Flag** inline styles that are longer than three lines

## Code Quality
- Code should follow SOLID principles

### What TO flag:
- Duplicate code that could be extracted to hooks or utilities

### What NOT to flag:
- Comments in complex logic (they're helpful)
- File length for configuration files
- Multiple exports from index files
- Dev dependencies in package.json
- Console statements in development config files

## Testing
- **Flag** new services without corresponding tests
- **Flag** new hooks without unit tests
- Suggest tests for complex business logic, but do not implement it for the author

## Security
- **Always flag**: Hardcoded credentials, API keys, or tokens
- **Always flag**: Direct localStorage/sessionStorage usage without validation
- **Always flag**: Unvalidated user input in API calls
- **Always flag**: Missing input sanitization

## Naming Conventions
- Components: PascalCase ending with `.tsx`
- Hooks: camelCase starting with "use"
- Hocs: camelCase starting with "with"
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase ending with `.type.ts` or `.interface.ts`
- Services: camelCase ending with `.service.ts`
- Constants files: camelCase ending with `.constants.ts`
- React test files: same name as component with `.ui.test.tsx` suffix
- Non-React test files: same name as file with `.test.ts` suffix


## What Makes a Good Review Comment
- Be specific about which file/folder pattern to follow
- Suggest the correct location or pattern
- Explain the "why" for architectural decisions
- Provide code examples when helpful