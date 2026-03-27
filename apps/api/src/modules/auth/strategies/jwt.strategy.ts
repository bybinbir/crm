import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_ACCESS_SECRET || 'development-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    console.log('[JWT] Strategy initialized');
    console.log(
      '[JWT] Secret source:',
      process.env.JWT_ACCESS_SECRET ? 'ENV' : 'DEFAULT'
    );
    console.log('[JWT] Extractor: Bearer header only');
  }

  async validate(payload: JwtPayload) {
    console.log('[JWT] ✓ validate() CALLED');
    console.log('[JWT] Payload keys:', Object.keys(payload));
    console.log('[JWT] Payload.sub:', payload.sub);
    console.log('[JWT] Payload.email:', payload.email);
    console.log('[JWT] Payload.role:', payload.role);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    console.log(
      '[JWT] User lookup:',
      user ? `FOUND (${user.email})` : 'NOT FOUND'
    );

    if (!user || !user.isActive) {
      console.log('[JWT] ✗ Rejecting: User not found or inactive');
      throw new UnauthorizedException('User not found or inactive');
    }

    console.log('[JWT] ✓ Returning user object');
    return user;
  }
}
