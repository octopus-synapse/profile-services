/**
 * MEC Sync Module - Clean Architecture
 *
 * Structure:
 * ├── constants/       # Configuration constants
 * ├── dto/            # Data Transfer Objects
 * ├── guards/         # Authentication guards
 * ├── interfaces/     # TypeScript interfaces
 * ├── mappers/        # Data transformation functions
 * ├── parsers/        # CSV parsing utilities
 * ├── repositories/   # Data access layer
 * └── services/       # Business logic
 */

export * from './mec-sync.module';
export * from '@/shared-kernel';
export * from './services/institution-query.service';
export * from './services/course-query.service';
export * from './services/mec-stats.service';
