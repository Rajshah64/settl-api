import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

export interface PaginatedUsers {
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Case-insensitive search across name + email for adding members later.
   * Strips LIKE wildcards from input so `%` / `_` cannot broaden the match.
   */
  async search(q: string, page = 1, limit = 20): Promise<PaginatedUsers> {
    const take = Math.min(Math.max(limit, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;
    const sanitized = q.trim().replace(/[%_]/g, '');
    if (!sanitized) {
      throw new BadRequestException(
        'Search query must contain at least one non-wildcard character',
      );
    }
    const pattern = `%${sanitized}%`;

    const [data, total] = await this.userRepository
      .createQueryBuilder('user')
      .where(
        '(user.firstName ILIKE :pattern OR user.lastName ILIKE :pattern OR user.email ILIKE :pattern)',
        { pattern },
      )
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return {
      data,
      meta: {
        page: currentPage,
        limit: take,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / take),
      },
    };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Auth-only query. password has select:false so default finds never load it.
   * Login / change-password must use this — never expose it from controllers.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdWithPassword(id: number): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.upiId !== undefined) {
      const trimmed = dto.upiId.trim();
      user.upiId = trimmed.length === 0 ? null : trimmed;
    }

    return this.userRepository.save(user);
  }

  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.userRepository.update(id, { password: hashedPassword });
  }

  /**
   * Soft-delete own account. Refuses if the user still owns active groups
   * (matches Group.creator onDelete: RESTRICT — we surface a domain error
   * instead of a raw FK violation).
   */
  async softDeleteAccount(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { createdGroups: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (user.createdGroups.length > 0) {
      throw new ConflictException(
        'Cannot delete account while you still own groups. Delete or transfer those groups first.',
      );
    }

    await this.userRepository.softRemove(user);
  }
}
