import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { TerritoriesService } from './territories.service';
import { GetTerritoriesQueryDto } from './dto/get-territories-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('territories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List territories (provinces and cities). Filter by type and/or parentId, e.g. type=city&parentId=<provinceId> for the cities of a province.',
  })
  findAll(@Query() query: GetTerritoriesQueryDto) {
    return this.territoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a territory by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.territoriesService.findOne(id);
  }
}
