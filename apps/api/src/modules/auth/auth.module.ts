import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'development-secret',
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as `${number}ms` | `${number}s` | `${number}m` | `${number}h` | `${number}d`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, AuditService],
  exports: [AuthService, JwtStrategy, JwtModule],
})
export class AuthModule {}
