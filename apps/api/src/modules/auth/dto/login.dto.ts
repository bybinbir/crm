import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  email!: string; // Actually email or username, kept field name for backward compatibility

  @IsString()
  @MinLength(4) // Relaxed from 8 to allow 'admin' demo password
  password!: string;
}
