import { SetMetadata } from '@nestjs/common';

export const CacheTTL = (ttl: number) => SetMetadata('cache:ttl', ttl);