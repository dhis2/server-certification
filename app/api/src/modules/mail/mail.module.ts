import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mailConfig from './mail.config';
import { MailService, PasswordResetTokenStorage } from './services';

@Global()
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService, PasswordResetTokenStorage],
  exports: [MailService, PasswordResetTokenStorage],
})
export class MailModule {}
