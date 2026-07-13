import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketPriorityDto } from './create-ticket-priority.dto';

export class UpdateTicketPriorityDto extends PartialType(
  CreateTicketPriorityDto,
) {}
