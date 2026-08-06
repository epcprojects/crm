import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@harperhelp/interfaces';
import { Project } from '../../projects/entities/project.entity';

@Entity('project_notes')
@Index('IDX_PROJECT_NOTE_PROJECT_ID', ['projectId'])
export class ProjectNote extends BaseEntity {
  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy!: string | null;
}
