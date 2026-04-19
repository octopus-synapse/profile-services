import type {
  CreatedUser,
  UpdatedUser,
  UserDetails,
  UserListItem,
  UserListResult,
} from '../../application/ports/user-management.port';
import type {
  UserDetailsDataDto,
  UserListItemDto,
  UserManagementListDataDto,
} from '../../dto/controller-response.dto';

type UserListItemPayload = UserListItemDto;

/**
 * View-model projection for the user-management endpoints. Lives outside the
 * controller so the HTTP layer stays free of data transformation / iteration.
 */

export function toUserListItem(user: UserListItem): UserListItemPayload {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerified: user.emailVerified?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export function toUserManagementListData(result: UserListResult): UserManagementListDataDto {
  const users: UserListItemPayload[] = [];
  for (const u of result.users) users.push(toUserListItem(u));
  return { users, pagination: result.pagination };
}

export function toUserDetailsData(user: UserDetails): UserDetailsDataDto {
  const resumes: UserDetailsDataDto['user']['resumes'] = [];
  for (const resume of user.resumes) {
    resumes.push({
      ...resume,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    });
  }
  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      emailVerified: user.emailVerified?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      resumes,
    },
  };
}

export function toCreatedUserMutation(user: CreatedUser) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toUpdatedUserMutation(user: UpdatedUser) {
  return {
    ...user,
    updatedAt: user.updatedAt.toISOString(),
  };
}
