# Corrective Pass 2: Pre-Edit Palette Audit

Scope: sections 0 and 1 only. Line numbers below refer to source before this pass.

The scan includes the requested legacy classes and all hex literals. Token definitions, QR black/white output colors, chart-library selectors, and frozen tag artwork are recorded but are not necessarily legacy UI colors.

## Files To Change

- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/pages/AdminAccessManagement.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminAttendance.tsx`
- `src/pages/QROnboardingPage.tsx`
- `src/pages/AdminAnalytics.tsx`
- `src/pages/QRCheckinPage.tsx`
- `src/pages/AdminRegistrations.tsx`
- `src/pages/MemberRegistration.tsx`
- `src/pages/AdminSettings.tsx`
- `src/pages/MemberProfile.tsx`
- `src/pages/MemberID.tsx`
- `src/pages/MemberHome.tsx`
- `src/pages/HireDeveloperPage.tsx`
- `src/pages/MemberAttendance.tsx`
- `src/pages/ExecutiveRegistration.tsx`
- `src/pages/ExecutiveDashboard.tsx`
- `src/pages/LoginPage.tsx`
- `src/components/auth/DevQuickLogin.tsx`
- `src/components/auth/AuthExperience.tsx`
- `src/components/attendee/AttendeePortalNav.tsx`
- `src/components/attendee/AttendeePortalLayout.tsx`
- `src/pages/ConventionStatusPortal.tsx`
- `src/contexts/ThemeContext.tsx`: user-approved exception for first-visit light default and preserving saved preferences.

## Page-Grouped Matches

### src/App.tsx

Lines: 28, 36, 44, 52.

### src/App.css

Lines: 15, 18, 41.

### src/index.css

Lines: 117, 127, 133, 152, 159, 163, 171, 190, 198, 210, 214, 218, 222, 226, 230, 238, 246, 250, 258, 269, 275, 305, 370, 371, 373, 374, 375, 376, 377, 378, 382, 386, 387, 388, 389, 390, 391, 395.

### src/types/index.ts

Lines: 158, 159, 160, 161, 162, 166, 167, 168, 169, 170.

### src/contexts/ToastContext.tsx

Lines: 43, 45, 50, 52.

### src/pages/AdminAccessManagement.tsx

Lines: 61, 62, 63, 67, 83, 140, 154, 165.

### src/pages/AdminDashboard.tsx

Lines: 32, 33, 34, 35, 36, 37, 38, 39, 43, 44, 45, 46, 47, 61, 208.

### src/pages/AdminAttendance.tsx

Lines: 126, 135, 137, 141, 157, 184, 188, 209, 213, 217, 219, 228, 250, 258, 279, 297, 306, 313, 328, 339, 350, 363.

### src/pages/QROnboardingPage.tsx

Lines: 10, 21, 42.

### src/pages/AdminAnalytics.tsx

Lines: 30, 31, 47, 61, 75, 76, 77, 78, 85, 94, 95, 99, 100, 102, 110, 136, 144, 145, 155, 163, 164, 168, 169, 180, 206, 212, 213, 224.

### src/pages/QRCheckinPage.tsx

Lines: 13, 46, 56.

### src/pages/AdminRegistrations.tsx

Lines: 79, 85, 96, 112, 141, 144, 159, 165, 209, 213, 253, 282.

### src/pages/MemberRegistration.tsx

Lines: 157, 158, 159, 160, 168, 210, 219, 221, 236, 261, 268, 290, 303, 311, 315, 321, 567, 580, 590, 594, 595, 609, 623, 637, 642, 719, 763, 786, 807, 838, 865, 880, 900.

### src/pages/AdminSettings.tsx

Lines: 75, 106, 128, 134, 145, 155, 185.

### src/pages/MemberProfile.tsx

Lines: 37, 40, 48, 55, 76, 86, 98, 125, 140.

### src/pages/MemberID.tsx

Lines: 47, 54.

### src/pages/MemberHome.tsx

Lines: 45, 58, 77, 109, 119, 120.

### src/pages/HireDeveloperPage.tsx

Lines: 19, 40.

### src/pages/MemberAttendance.tsx

Lines: 50, 51, 67, 84, 95, 101, 102, 109.

### src/pages/ExecutiveRegistration.tsx

Lines: 127, 149, 156, 201, 218, 227, 230, 231, 233.

### src/pages/ExecutiveDashboard.tsx

Lines: 36, 40, 71, 80, 96, 104, 109, 119, 120, 121, 128, 137, 146, 158, 169, 192.

### src/pages/LoginPage.tsx

Lines: 112, 132, 143, 151, 170.

### src/components/ConventionTag.tsx

Lines: 20, 21, 32, 44, 53, 54, 55, 65, 77, 92, 93, 96, 98, 103, 104, 105, 109, 114, 118, 127, 130, 135, 139, 140, 155, 167, 182, 183, 186, 188, 193, 199, 200, 201, 205, 210, 214, 223, 226, 232, 235, 244, 245.

### src/components/auth/DevQuickLogin.tsx

Lines: 24, 39.

### src/components/auth/AuthExperience.tsx

Lines: 35, 52, 75, 80, 84, 105, 152, 162, 170, 181, 210, 211, 212, 215, 216.

### src/components/attendee/AttendeePortalNav.tsx

Lines: 33.

### src/components/attendee/AttendeePortalLayout.tsx

Lines: 7.

### src/pages/ConventionStatusPortal.tsx

Lines: 50, 60, 94, 102, 103, 104, 111, 116, 155, 165, 177, 191, 230.

### src/components/ui/chart.tsx

Lines: 58.

## Public Shell Audit Before Changes

- MemberRegistration: main flow and invalid-link screen use legacy backgrounds; success is rendered inside the main flow.
- ExecutiveRegistration: form and success share a legacy wrapper.
- QRCheckinPage and QROnboardingPage: legacy dark backgrounds, no public header.
- ConventionStatusPortal: shared attendee wrapper is legacy; not-found screen has its own dark wrapper.
- HireDeveloperPage: inherits legacy attendee wrapper.
- LoginPage: uses AuthLayout with legacy backgrounds; its intentionally hidden header stays hidden.

## Frozen Exceptions

`src/contexts/ToastContext.tsx`, `src/types/index.ts`, and `src/components/ConventionTag.tsx` retain their existing source colors under the no-edit constraint. Existing git differences in frozen files predate this pass. `ThemeContext.tsx` is the sole user-approved exception.

## Section 0-1 Checkpoint

- Added `src/components/ui-kit/palette.ts` for presentation-only chart and badge colors. The domain/tag constants in `src/types/index.ts` remain unchanged.
- Public registration wrappers (including success and invalid-link states), QR pages, status pages and Hire a Developer now use the token canvas. The shared public header uses outlined pills and a circular theme menu. Login retains its intentionally header-free form.
- Route guard changes are class-name-only; their route definitions and authorization conditions are unchanged.
- First-time preference is Light, independent of the operating system. Existing saved Light, Dark and System choices are respected and persisted.
- The onboarding layout details, service-card redesign, executive dashboard grid and full screenshot matrix are deferred to sections 2-5.

## Remaining Scan Matches

Old-palette utility classes remain only in frozen `src/contexts/ToastContext.tsx`, lines 43, 45, 50 and 52.

Additional hex literals are intentional and are not pending interface-class migrations:

- `src/types/index.ts`: frozen legacy domain/tag color constants. Interface consumers now use the separate presentation palette.
- `src/components/ConventionTag.tsx`: frozen official tag artwork.
- `src/pages/MemberRegistration.tsx`, `createTagImage`: unchanged canvas export of that same official tag.
- `src/index.css`: design-token definitions.
- `src/components/auth/AuthExperience.tsx`: white SVG highlight.
- `src/components/ui/chart.tsx`: selectors matching Recharts-generated white/gray strokes, not old-palette declarations.

## Verification

- Production build passes (existing bundle-size warning remains).
- Theme startup checks pass for no saved preference, Light, Dark and System with a simulated dark operating-system preference.
- Source comparison confirms unchanged route definitions/guards apart from presentation attributes, and unchanged `createTagImage` implementation.
- Frozen-file hashes match the start of this pass, except for the explicitly approved ThemeContext update. The print block is byte-for-byte unchanged.
- Light/dark public canvas and header smoke checks at 360px; desktop login palette checked at 1440px. The full section-5 matrix is not claimed at this checkpoint.
- Repository lint still has pre-existing failures; the theme initialization removes one prior effect-related error. No lint rules were disabled.

## Sections 2-5 Completion

- Member onboarding now has the charcoal stepper panel, a compact horizontal mobile progress row, tokenized form surfaces, yellow section tile, pill toggles, dashed warm photo upload, and charcoal/outlined form actions.
- Hire a Developer now uses 28px token cards, yellow circular icons, charcoal service CTAs, and a dark project CTA with a yellow CTA.
- Executive Dashboard now uses a 12-column desktop grid, profile PhotoCard, responsive details and tag sections, and a tag container with an explicit minimum height to prevent clipping.
- Build passes. Full lint still reports existing project-wide errors; a focused lint check on the modified remaining-section pages reports zero errors and one pre-existing MemberRegistration hook warning.

