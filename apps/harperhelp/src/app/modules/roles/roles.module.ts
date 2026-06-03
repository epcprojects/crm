import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleClaim } from './entities/role.claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RoleClaim])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
