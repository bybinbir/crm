import type { Role } from '@prisma/client';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
}
