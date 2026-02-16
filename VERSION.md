# Pulse Premier League - Version History

## Version 1.1.0 (2026-02-16) - Remediation Release

### Critical Fixes
- Fixed PWA icon generation (icons now present)
- Fixed SheetJS library integration (Excel export working)
- Fixed Service Worker registration (offline mode active)
- Implemented database migration framework
- Added sync error recovery with backup/rollback

### Security Improvements
- Moved GitHub token to sessionStorage (reduced XSS risk)
- Added input sanitization (XSS protection)
- Implemented CSRF protection for sync operations
- Added comprehensive input validation

### Architecture Improvements
- Added error boundaries and graceful degradation
- Implemented fallback memory storage
- Added global error handlers
- Created retry logic with exponential backoff
- Implemented operation queue for race condition prevention

### Infrastructure
- Added CI/CD pipeline (GitHub Actions)
- Version management system
- Comprehensive documentation

## Version 1.0.0 (2026-02-15) - Initial Release

### Features
- Cricket scoring engine with 11 dismissal types
- Match management and statistics
- Points table with NRR calculation
- MVP and 13 tournament awards
- GitHub sync for cloud backup
- Excel export (7 sheets)
- Offline PWA functionality
- Dark mode support
