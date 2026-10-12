# MOSYF Data Model

All event-scoped records carry eventId, createdAt, updatedAt, and createdBy. The local repository migrates legacy records to the default event, mosyf-2026.

## Current Entities

- ConventionEvent: id, eventId, name, theme, scripture, startDate, endDate, venue, description, maxAttendees, active.
- Member: id, eventId, personal/contact fields, fellowshipBand, departments, conventionGroup, attendance and access state.
- Executive: id, eventId, personal/contact fields, leadershipRole, department, fellowshipBand, registration state.
- AttendanceRecord: id, eventId, memberId, memberName, checkInTime, verificationMethod, status, sessionName.
- BiometricLog: id, eventId, memberId, scannerId, status, message.
- AdminActivityLog: id, eventId, actorEmail, actorName, action, target.
- FirstTimer: id, eventId, personal/contact fields, membership interest and follow-up state.
- GeneratedLink: id, eventId, type, url, token, uses, status.
- ConventionSettings: id, eventId, name, dates, location, theme, scripture, active flag, attendee limit, sessions.

## Managed Entities

- Band, Department, ChurchGroup, ChurchLocation: id, eventId, name, active, sortOrder, createdAt.
- Programme: id, eventId, title, description, date, startTime, endTime, location, active.
- ConventionRole: id, eventId, userEmail, role, assignedBy, assignedAt.

The repository interface is the application seam for a later Supabase implementation. Supabase row-level security will become the authoritative enforcement layer.
