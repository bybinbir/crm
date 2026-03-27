import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
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
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.accessToken;
          console.log('[JWT] Cookie token:', token ? 'present' : 'absent');
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'development-secret',
    });
    console.log('[JWT] Strategy initialized with secret:', process.env.JWT_ACCESS_SECRET ? 'ENV' : 'DEFAULT');
  }

  async validate(payload: JwtPayload) {
    console.log('[JWT] validate() called with payload:', { sub: payload.sub, email: payload.email, role: payload.role });
    
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

    console.log('[JWT] User lookup result:', user ? { id: user.id, email: user.email, isActive: user.isActive } : 'NOT FOUND');

    if (!user || !user.isActive) {
      console.log('[JWT] Throwing UnauthorizedException');
      throw new UnauthorizedException('User not found or inactive');
    }

    console.log('[JWT] Returning user object');
    return user;
  }
}
