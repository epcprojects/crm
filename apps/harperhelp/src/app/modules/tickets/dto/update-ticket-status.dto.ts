import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketStatusDto } from './create-ticket-status.dto';

export class UpdateTicketStatusDto extends PartialType(CreateTicketStatusDto) {}
