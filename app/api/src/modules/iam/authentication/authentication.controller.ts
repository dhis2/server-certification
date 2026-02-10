import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticationService } from './authentication.service';
import { SignInDto } from './dto/sign-in.dto';
import { Auth } from './decorators/auth.decorator';
import { Public } from './decorators/public.decorator';
import { AuthType } from './enums/auth-type.enum';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2faSetupDto } from './dto/verify-2fa-setup.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { ActiveUser } from '../decorators/active-user.decorator';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { OtpAuthenticationService } from './otp/otp-authentication.service';
import { Throttle } from '@nestjs/throttler';
import { User } from 'src/modules/users/entities/user.entity';
import { UpdateProfileDto } from 'src/modules/users/dto/update-profile.dto';
import { ChangePasswordDto } from 'src/modules/users/dto/change-password.dto';
import { UsersService } from 'src/modules/users/users.service';

@Public()
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly otpAuthenticationService: OtpAuthenticationService,
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Auth(AuthType.Bearer)
  @Get('me')
  async getCurrentUser(@ActiveUser() activeUser: ActiveUserData) {
    const user = await this.userRepository.findOne({
      where: { id: activeUser.sub },
      relations: ['role'],
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'isTfaEnabled',
        'createdAt',
        'updatedAt',
      ],
    });
    return user;
  }

  @Auth(AuthType.Bearer)
  @Patch('me')
  async updateProfile(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(activeUser.sub, dto);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      updatedAt: user.updatedAt,
    };
  }

  @Auth(AuthType.Bearer)
  @Patch('me/password')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(activeUser.sub, dto);
    return {
      message:
        'Password changed successfully. Please log in again with your new password.',
    };
  }

  @Auth(AuthType.Bearer)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(@ActiveUser() activeUser: ActiveUserData): Promise<void> {
    await this.authService.signOut(activeUser);
  }

  @Auth(AuthType.Bearer)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOutAll(@ActiveUser() activeUser: ActiveUserData): Promise<void> {
    await this.authService.signOutAll(activeUser.sub);
  }

  @Auth(AuthType.Bearer)
  @Post('2fa/setup')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  async setup2fa(@ActiveUser() activeUser: ActiveUserData) {
    const { uri, qrCode, recoveryCodes } =
      await this.otpAuthenticationService.initiateTfaSetup(
        activeUser.sub,
        activeUser.email,
      );

    return {
      otpauthUrl: uri,
      qrCode,
      recoveryCodes,
      message: 'Scan QR code with authenticator app, then verify with a code',
    };
  }

  @Auth(AuthType.Bearer)
  @Post('2fa/verify-setup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verify2faSetup(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: Verify2faSetupDto,
  ) {
    await this.otpAuthenticationService.verifyAndEnableTfa(
      activeUser.sub,
      dto.code,
    );
    return { message: '2FA enabled successfully' };
  }

  @Auth(AuthType.Bearer)
  @Post('2fa/disable')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  async disable2fa(
    @ActiveUser() activeUser: ActiveUserData,
    @Body() dto: Disable2faDto,
  ) {
    await this.authService.disable2fa(activeUser.sub, dto);
    return { message: '2FA disabled successfully' };
  }

  @Auth(AuthType.Bearer)
  @Post('2fa/regenerate-recovery-codes')
  @Throttle({ default: { limit: 2, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(@ActiveUser() activeUser: ActiveUserData) {
    const recoveryCodes =
      await this.otpAuthenticationService.regenerateRecoveryCodes(
        activeUser.sub,
      );

    return { recoveryCodes };
  }

  @Post('refresh-tokens')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }
}
