# Response Drift Report

Generated: 2026-05-07T17:53:58.091Z
Probed: 216 GET endpoints
Total drifts: 31

## chat (1 drifts)

### GET /v1/chat/conversations/:conversationId/messages → 403 (persona=user)
- auth mismatch: persona=`user` got HTTP 403 (swagger x-auth/x-permission disagrees with runtime guards)

## jobs (2 drifts)

### GET /v1/jobs/mine → 403 (persona=user)
- auth mismatch: persona=`user` got HTTP 403 (swagger x-auth/x-permission disagrees with runtime guards)

### GET /v1/jobs/:id/applications → 403 (persona=user)
- auth mismatch: persona=`user` got HTTP 403 (swagger x-auth/x-permission disagrees with runtime guards)

## mec (2 drifts)

### GET /v1/mec/internal/sync/status → 401 (persona=anonymous)
- auth mismatch: persona=`anonymous` got HTTP 401 (swagger x-auth/x-permission disagrees with runtime guards)

### GET /v1/mec/internal/sync/history → 401 (persona=anonymous)
- auth mismatch: persona=`anonymous` got HTTP 401 (swagger x-auth/x-permission disagrees with runtime guards)

## recruiting (1 drifts)

### GET /v1/recruiting/jobs/form-config → 403 (persona=user)
- auth mismatch: persona=`user` got HTTP 403 (swagger x-auth/x-permission disagrees with runtime guards)

## resumes (25 drifts)

### GET /v1/resumes/manage/user/:userId → 200 (persona=user)
- extra field: `resumes.[0].contentPtBr` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].contentEn` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].primaryLanguage` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].techPersona` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].techArea` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].primaryStack` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].experienceYears` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].phone` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].location` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].linkedin` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].github` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].website` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].currentCompanyLogo` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].twitter` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].medium` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].devto` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].stackoverflow` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].kaggle` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].hackerrank` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].leetcode` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].customTheme` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].profileViews` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].totalStars` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].totalCommits` (runtime returned a key not declared in schema)
- extra field: `resumes.[0].publishedAt` (runtime returned a key not declared in schema)
