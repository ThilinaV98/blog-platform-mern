import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { UsersModule } from '../users/users.module';
import { multerOptions } from './multer.config';

@Module({
  imports: [
    MulterModule.register(multerOptions),
    forwardRef(() => UsersModule),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}