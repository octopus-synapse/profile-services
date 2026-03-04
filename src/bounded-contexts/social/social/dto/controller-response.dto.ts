import { ApiProperty } from '@nestjs/swagger';

export class ActivityFeedDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  feed!: object;
}

export class ActivityListDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  activities!: object;
}

export class FollowListDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  followers!: object;
}

export class FollowingListDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  following!: object;
}

export class UnfollowDataDto {
  @ApiProperty({ example: true })
  unfollowed!: boolean;
}
