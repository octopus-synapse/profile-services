# GraphQL API Documentation

This directory contains the GraphQL API implementation for Profile Services.

## Overview

The GraphQL API provides a flexible alternative to REST endpoints, allowing clients to request exactly the data they need in a single query.

**Related Issues:**

- [#76](https://github.com/octopus-synapse/profile-services/issues/76) - Design GraphQL schema with Code-First approach
- [#77](https://github.com/octopus-synapse/profile-services/issues/77) - Implement DataLoader for N+1 optimization
- [#78](https://github.com/octopus-synapse/profile-services/issues/78) - Set up GraphQL Playground and documentation

## Features

✅ **Code-First Schema** - TypeScript decorators generate GraphQL schema automatically  
✅ **DataLoader Integration** - Prevents N+1 queries with intelligent batching  
✅ **JWT Authentication** - Secure endpoints with existing auth system  
✅ **GraphQL Playground** - Interactive API explorer (development only)  
✅ **Introspection** - Disabled in production for security

## Getting Started

### Access GraphQL Playground

In development, access the interactive playground at:

```
http://localhost:3000/graphql
```

### Authentication

All queries require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Example Queries

### Get Single Resume

```graphql
query GetResume {
  resume(id: "resume-uuid") {
    id
    title
    fullName
    experiences {
      id
      company
      position
      current
      achievements
    }
    educations {
      id
      institution
      degree
      field
    }
    skills {
      id
      name
      level
      category
    }
  }
}
```

### Get All My Resumes

```graphql
query MyResumes {
  myResumes {
    id
    title
    isPrimary
    createdAt
    # Only fetch experiences if needed
    experiences {
      company
      position
    }
  }
}
```

### Add Experience

```graphql
mutation AddExperience {
  addExperience(
    resumeId: "resume-uuid"
    input: {
      company: "Google"
      position: "Software Engineer"
      location: "Mountain View, CA"
      startDate: "2020-01-01"
      current: true
      description: "Building amazing products"
      achievements: ["Led team of 5", "Increased performance by 40%"]
    }
  ) {
    id
    company
    position
    achievements
  }
}
```

### Update Experience

```graphql
mutation UpdateExperience {
  updateExperience(
    resumeId: "resume-uuid"
    experienceId: "exp-uuid"
    input: { current: false, endDate: "2023-12-31" }
  ) {
    id
    company
    current
    endDate
  }
}
```

### Delete Experience

```graphql
mutation DeleteExperience {
  deleteExperience(resumeId: "resume-uuid", experienceId: "exp-uuid")
}
```

## Architecture

### Directory Structure

```
src/graphql/
├── __tests__/               # Unit tests
│   ├── resume.resolver.test.ts
│   └── dataloader.service.test.ts
├── dataloaders/            # N+1 optimization
│   └── dataloader.service.ts
├── decorators/             # Custom decorators
│   └── current-user.decorator.ts
├── guards/                 # Authentication
│   └── gql-auth.guard.ts
├── inputs/                 # Input types (mutations)
│   ├── experience.input.ts
│   └── education.input.ts
├── models/                 # Object types (schema)
│   ├── resume.model.ts
│   ├── experience.model.ts
│   ├── education.model.ts
│   └── skill.model.ts
├── resolvers/              # Query/Mutation handlers
│   └── resume.resolver.ts
├── graphql.module.ts       # Module configuration
├── schema.graphql          # Generated schema (auto)
└── README.md               # This file
```

### DataLoader (N+1 Prevention)

DataLoader batches multiple data fetches into single database queries:

**Without DataLoader (N+1 problem):**

```
1. SELECT * FROM resumes WHERE userId = ?
2. SELECT * FROM experiences WHERE resumeId = resume1
3. SELECT * FROM experiences WHERE resumeId = resume2
4. SELECT * FROM experiences WHERE resumeId = resume3
   ... (N queries for N resumes)
```

**With DataLoader (batched):**

```
1. SELECT * FROM resumes WHERE userId = ?
2. SELECT * FROM experiences WHERE resumeId IN (resume1, resume2, resume3)
   (Only 2 queries total!)
```

### Code-First Approach

Schema is generated from TypeScript decorators:

```typescript
@ObjectType()
export class ExperienceModel {
  @Field(() => ID)
  id: string;

  @Field()
  company: string;

  @Field(() => [String])
  achievements: string[];
}
```

Generates GraphQL schema:

```graphql
type Experience {
  id: ID!
  company: String!
  achievements: [String!]!
}
```

## Security

### Production Configuration

In production (NODE_ENV=production):

- ✅ GraphQL Playground disabled
- ✅ Introspection disabled
- ✅ Error details hidden
- ✅ CORS restricted to FRONTEND_URL
- ✅ JWT authentication required

### Development Configuration

In development:

- ✅ GraphQL Playground enabled
- ✅ Introspection enabled
- ✅ Detailed error messages
- ✅ Localhost CORS allowed

## Performance

### DataLoader Caching

DataLoaders are scoped per-request to prevent stale data:

```typescript
@Injectable({ scope: Scope.REQUEST })
export class DataLoaderService {
  // Fresh loaders for each request
}
```

### Query Complexity

Future enhancement: Add query complexity limits to prevent expensive queries.

## REST vs GraphQL

Both APIs run in parallel. Choose based on use case:

| Feature         | REST                  | GraphQL                       |
| --------------- | --------------------- | ----------------------------- |
| Simple CRUD     | ✅ Recommended        | Overkill                      |
| Complex queries | ❌ Multiple requests  | ✅ Single request             |
| Over-fetching   | ❌ Returns all fields | ✅ Request only needed fields |
| Under-fetching  | ❌ Multiple endpoints | ✅ Single query               |
| Caching         | ✅ HTTP caching       | ⚠️ Requires client library    |
| Learning curve  | ✅ Simple             | ⚠️ Steeper                    |

## Migration Strategy

GraphQL runs alongside REST (no breaking changes):

1. **Q3 2026**: GraphQL available for new features
2. **Q4 2026**: Frontend migrates critical paths to GraphQL
3. **Q1 2027**: Deprecate redundant REST endpoints
4. **Q2 2027**: Remove deprecated REST endpoints

## Testing

Run GraphQL tests:

```bash
bun test src/graphql
```

Test coverage goals:

- Resolvers: 80%+
- DataLoaders: 90%+
- Guards: 100%

## Future Enhancements

- [ ] Subscriptions for real-time updates
- [ ] Query complexity analysis
- [ ] Field-level authorization
- [ ] Batch mutations
- [ ] Relay cursor pagination
- [ ] Schema stitching for microservices

## References

- [NestJS GraphQL Docs](https://docs.nestjs.com/graphql/quick-start)
- [DataLoader GitHub](https://github.com/graphql/dataloader)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
