/**
 * Param schemas for HTTP route parameters.
 *
 * One named schema per common shape. BCs that need a one-off param
 * (e.g. `JobApplicationIdParamSchema`) should add a sibling file here
 * rather than redefine inline — see Q5 in the duplication audit.
 */
export * from './id-param.schema';
export * from './job-id-param.schema';
export * from './resume-id-param.schema';
export * from './slug-param.schema';
export * from './user-id-param.schema';
