import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User, UserStatus } from "src/entities/user.entity";
import { errorResponse } from "src/common/helpers/error-response";
import * as bcrypt from "bcryptjs";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { LoginDto } from "./dtos/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
  ) {}
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Omit<User, 'password'>; token: string }> {
    try {
      const { username, password } = loginDto;

    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException(errorResponse('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const roles = user.roles.map(role => role.code);
    const permissions = user.roles.flatMap(role => role.permissions?.map(p => p.code) ?? []);

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: roles,
      fullName: user.fullName,
      permissions: permissions,
    };

    const token = this.jwtService.sign(payload);

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
    } catch(e) {
      this.logger.error(e, 'Login error:');
      throw e;
    }
  }
  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username, status: UserStatus.ACTIVE },
      relations: ['roles', 'roles.permissions', 'unit'],
    });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }
  async findUserById(sub: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: sub, status: UserStatus.ACTIVE },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) {
      throw new UnauthorizedException(
        errorResponse("NOT_FOUND", "User not found or inactive")
      );
    }
    return user;
  }
}
