import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { verifyPassword, hashPassword } from '../../common/utils/encryption.util';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Login user with email and password
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      // Log failed login attempt
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        metadata: { email, reason: 'User not found or inactive' },
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { email, reason: 'Invalid password' },
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await this.generateRefreshToken(
      user.id,
      ipAddress,
      userAgent,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      metadata: { email },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string) {
    // Delete session
    await this.prisma.userSession.deleteMany({
      where: {
        userId,
        refreshToken,
      },
    });

    // Log logout
    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
    // Find session
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      // Delete expired session
      await this.prisma.userSession.delete({
        where: { id: session.id },
      });

      throw new UnauthorizedException('Refresh token expired');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(
      session.user.id,
      session.user.email,
      session.user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    };
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(
    userId: string,
    email: string,
    role: string,
  ): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  /**
   * Generate refresh token and store session
   */
  private async generateRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const expiresInStr = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret',
        expiresIn: expiresInStr as `${number}ms` | `${number}s` | `${number}m` | `${number}h` | `${number}d`,
      },
    );

    // Calculate expiration
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresAt = new Date();

    // Parse duration (e.g., "7d", "24h")
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (match) {
      const [, value, unit] = match;
      const num = parseInt(value, 10);

      if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + num);
      } else if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + num);
      } else if (unit === 'm') {
        expiresAt.setMinutes(expiresAt.getMinutes() + num);
      }
    } else {
      // Default to 7 days
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    // Store session
    await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return refreshToken;
  }
}
