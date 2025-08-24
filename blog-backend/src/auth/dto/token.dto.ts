import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
}