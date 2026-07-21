import { Column, Entity, Index } from 'typeorm';

import { AuditableEntity } from '@harperhelp/interfaces';
import { FileSource, FileStatus } from '@harperhelp/types';

@Entity('file_records')
@Index('IDX_FILE_PROJECT_ID', ['projectId'])
@Index('IDX_FILE_SOURCE', ['source'])
@Index('IDX_FILE_SOURCE_ID', ['sourceId'])
@Index('IDX_FILE_SOURCE_SOURCE_ID', ['source', 'sourceId'])
export class FileRecord extends AuditableEntity {
  @Column({
    type: 'uuid',
  })
  projectId: string;

  /**
   * User who uploaded the file
   */
  @Column({
    type: 'uuid',
  })
  uploadedBy: string;

  /**
   * Original filename from client
   */
  @Column({
    type: 'varchar',
    length: 500,
  })
  originalName: string;

  /**
   * Object storage key (S3/R2/etc)
   */
  @Column({
    type: 'varchar',
    length: 2000,
  })
  storageKey: string;

  /**
   * Thumbnail/previews for images/videos
   */
  @Column({
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  thumbnailKey?: string;

  @Column({
    type: 'bigint',
  })
  sizeBytes: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  extension: string;

  @Column({
    type: 'varchar',
    length: 1000,
  })
  mimeType: string;

  /**
   * What entity owns this file?
   */
  @Column({
    type: 'enum',
    enum: FileSource,
  })
  source: FileSource;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.ACTIVE,
  })
  status: FileStatus;

  /**
   * ID of ticket, reply, thread message, etc.
   * Null only for DIRECT uploads.
   */
  @Column({
    type: 'uuid',
    nullable: true,
  })
  sourceId?: string;
}
