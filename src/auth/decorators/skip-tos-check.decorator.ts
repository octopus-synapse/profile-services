import { SetMetadata } from '@nestjs/common';

export const SKIP_TOS_CHECK_KEY = 'skipTosCheck';
export const SkipTosCheck = () => SetMetadata(SKIP_TOS_CHECK_KEY, true);
