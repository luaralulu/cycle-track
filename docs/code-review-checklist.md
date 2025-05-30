# Code Review Checklist

This checklist highlights areas for improvement in the codebase, focusing on security, testability, structure, and best practices. Each item and sub-item includes a checkbox for tracking progress.

## Security

- [x] **Environment Variables**
  - [x] Ensure sensitive credentials are never committed to the repo
  - [x] Validate presence of required environment variables at runtime
- [x] **Supabase Usage**
  - [x] Handle and log errors securely (avoid leaking sensitive info)
  - [x] Use least-privilege keys for Supabase (never expose service role keys in frontend)
- [x] **User Authentication**
  - [x] Avoid hardcoding user credentials in environment variables for production
  - [x] Implement proper session management and expiration handling
- [x] **Input Validation**
  - [x] Validate and sanitize all user input before processing or storing

## Testability

- [x] **Unit Tests**
  - [x] Ensure all pure functions have comprehensive unit tests
  - [x] Mock external dependencies (e.g., Supabase) in all async tests
- [x] **Component Tests**
  - [x] Add tests for all major UI components and user flows
  - [x] Test edge cases and error states (e.g., network failures, empty data)
- [x] **Test Coverage**
  - [x] Measure and improve code coverage for critical logic

## Structure

- [x] **File Organization**
  - [x] Group related files (components, hooks, utils) into folders
  - [x] Separate business logic from UI components
- [ ] **Component Design**
  - [ ] Break up large components (e.g., App.tsx) into smaller, reusable components
  - [ ] Use hooks for shared logic (e.g., data fetching, modal state)
- [ ] **Type Safety**
  - [ ] Define and use TypeScript interfaces/types for all data structures
  - [ ] Avoid using `any` in favor of explicit types

## Best Practices

- [ ] **React**
  - [ ] Use `act()` in tests to wrap state updates
  - [ ] Use functional updates for state where appropriate
  - [ ] Avoid unnecessary re-renders and optimize performance
- [ ] **Error Handling**
  - [ ] Provide user-friendly error messages
  - [ ] Log errors for debugging without exposing sensitive data
- [ ] **Accessibility**
  - [ ] Ensure all interactive elements are accessible (e.g., buttons, modals)
  - [ ] Use semantic HTML and ARIA attributes where needed
- [ ] **Documentation**
  - [ ] Document all public functions and components
  - [ ] Maintain up-to-date README and usage instructions

---

_Review each item and check off as improvements are made._
