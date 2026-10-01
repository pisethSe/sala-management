import { SetMetadata } from '@nestjs/common';

// Marks an endpoint as public: the JwtAuthGuard skips it (e.g. the health
// check used by the Docker healthcheck).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
