import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret') || 'refresh-secret',
      passReqToCallback: true,
    } as any);
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body.refreshToken;
    return {
      userId: payload.sub,
      refreshToken,
      tokenId: payload.tokenId,
    };
  }
}