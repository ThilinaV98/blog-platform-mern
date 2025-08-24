import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address or username',
    example: 'john.doe@example.com',
    examples: {
      email: {
        summary: 'Using email',
        value: 'john.doe@example.com',
      },
      username: {
        summary: 'Using username',
        value: 'johndoe123',
      },
    },
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  emailOrUsername: string;

  @ApiProperty({
    description: 'User password',
    example: 'MySecure123!',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}