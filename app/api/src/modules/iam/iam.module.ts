import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { SharedModule } from 'src/shared/shared.module';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { AuthenticationService } from './authentication/authentication.service';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage/refresh-token-ids.storage';
import {
  AccessTokenBlacklistStorage,
  blacklistConfig,
} from './authentication/access-token-blacklist';
import {
  PasswordLockoutStorage,
  passwordLockoutConfig,
} from './authentication/password-lockout';
import {
  SessionTimeoutStorage,
  sessionTimeoutConfig,
} from './authentication/session-timeout';
import jwtConfig from './config/jwt.config';
import { AuthorizationModule } from './authorization/authorization.module';
import { OtpAuthenticationService, otpConfig } from './authentication/otp';
import { ResourceOwnerGuard, RolesGuard } from './authorization/guards';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(blacklistConfig),
    ConfigModule.forFeature(otpConfig),
    ConfigModule.forFeature(passwordLockoutConfig),
    ConfigModule.forFeature(sessionTimeoutConfig),
    AuthorizationModule,
    SharedModule,
    forwardRef(() => UsersModule),
  ],
  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceOwnerGuard,
    },
    AccessTokenGuard,
    RefreshTokenIdsStorage,
    AccessTokenBlacklistStorage,
    PasswordLockoutStorage,
    SessionTimeoutStorage,
    AuthenticationService,
    OtpAuthenticationService,
  ],
  controllers: [AuthenticationController],
  exports: [HashingService, AuthorizationModule, PasswordLockoutStorage],
})
export class IamModule {}
