import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { GetContactsQueryDto } from './dto/get-contacts-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { Authorize } from '../../../common/guards/authorize.guard';

@Controller('contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Authorize({ permissions: ['contacts.create'] })
  @ApiOperation({ summary: 'Create a new contact' })
  create(@Body() dto: CreateContactDto, @GetUser() user) {
    return this.contactsService.create(dto, user);
  }

  @Get()
  @Authorize({ permissions: ['contacts.view_list'] })
  @ApiOperation({
    summary: 'Find all contacts with search and pagination',
  })
  findAll(@Query() query: GetContactsQueryDto) {
    return this.contactsService.findAll(query);
  }

  @Get(':id')
  @Authorize({ permissions: ['contacts.view_detail', 'contacts.view_list'] })
  @ApiOperation({ summary: 'Find a contact by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @Authorize({ permissions: ['contacts.edit'] })
  @ApiOperation({ summary: 'Update a contact' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @GetUser() user,
  ) {
    return this.contactsService.update(id, dto, user);
  }

  @Delete(':id')
  @Authorize({ permissions: ['contacts.delete'] })
  @ApiOperation({ summary: 'Delete a contact' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user) {
    return this.contactsService.softRemove(id, user);
  }
}
