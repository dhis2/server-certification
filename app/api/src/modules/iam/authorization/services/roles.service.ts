import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto';
import { isUniqueViolation } from 'src/shared/utils/error.utils';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const { ...roleData } = createRoleDto;

      const role = this.roleRepository.create(roleData);

      if (createRoleDto.isDefault) {
        await this.unsetDefaultRoles();
      }

      return await this.roleRepository.save(role);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `Role "${createRoleDto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOneBy({ name });
  }

  async findDefault(): Promise<Role | null> {
    return this.roleRepository.findOneBy({ isDefault: true });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    try {
      const { ...roleData } = updateRoleDto;

      Object.assign(role, roleData);

      if (updateRoleDto.isDefault) {
        await this.unsetDefaultRoles(id);
      }

      return await this.roleRepository.save(role);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `Role "${updateRoleDto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.roleRepository.remove(role);
  }

  private async unsetDefaultRoles(excludeId?: number): Promise<void> {
    const query = this.roleRepository
      .createQueryBuilder()
      .update(Role)
      .set({ isDefault: false })
      .where('isDefault = :isDefault', { isDefault: true });

    if (excludeId) {
      query.andWhere('id != :excludeId', { excludeId });
    }

    await query.execute();
  }
}
