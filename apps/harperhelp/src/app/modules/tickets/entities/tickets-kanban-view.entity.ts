import { BaseEntity } from '@harperhelp/interfaces';
import {
    Column,
    Entity,
    Index,
    Check,
    JoinColumn,
    ManyToOne,
    Unique,
} from 'typeorm';

import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TicketStatus } from './ticket.statuses.entity';

@Entity('tickets_kanban_view')
@Check(
    'CHK_TICKETS_KANBAN_VIEW_SORT_ORDER',
    '"sortOrder" >= 0',
)
@Unique('UQ_TICKETS_KANBAN_VIEW_USER_STATUS', ['userId', 'statusId'])
@Index('IDX_TICKETS_KANBAN_VIEW_USER_ID', ['userId'])
@Index('IDX_TICKETS_KANBAN_VIEW_STATUS_ID', ['statusId'])
@Index('IDX_TICKETS_KANBAN_VIEW_PROJECT_ID', ['projectId'])
@Index('IDX_TICKETS_KANBAN_VIEW_USER_SORT_ORDER', [
    'userId',
    'sortOrder',
])
export class TicketsKanbanView extends BaseEntity {
    @Column({
        type: 'uuid',
        nullable: true,
    })
    projectId?: string | null;

    @ManyToOne(() => Project, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'projectId',
    })
    project?: Project | null;

    @Column({
        type: 'uuid',
    })
    statusId: string;

    @ManyToOne(() => TicketStatus, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'statusId',
    })
    status: TicketStatus;

    @Column({
        type: 'uuid',
    })
    userId: string;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'userId',
    })
    user: User;

    @Column({
        type: 'int',
    })
    sortOrder: number;
}