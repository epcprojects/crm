import { BadRequestException, Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  EmailAttachmentLink,
  formatFileSize,
} from '../notifications/notifications.types';
import { UploadedFileDto } from '../files/dto/uploaded-file.dto';

type PresignedUrlAction = 'upload' | 'download';

interface PresignedUrlOptions {
  key: string;
  action: PresignedUrlAction;
  expiresInSeconds?: number;
  contentType?: string;
}

@Injectable()
export class UtilityService {
  private s3Client: S3Client;
  private bucketName = process.env.AWS_S3_BUCKET;
  private readonly EMAIL_ATTACHMENT_LINK_EXPIRY_SECONDS = 604800; // 7 days — max safe expiry for now

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   *
   * @param file
   * @param key
   * @returns
   */
  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    return key;
  }

  /**
   *
   * @param key
   * @returns
   */
  async deleteFile(key: string) {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err) {
      console.debug('error deleteting utility:', err);
    }
  }

  /**
   *
   * @param key
   * @returns
   */
  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!key) return null;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // The URL will expire in 3600 seconds (1 hour)
    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async generatePresignedUrl({
    key,
    action,
    expiresInSeconds = 3600,
    contentType,
  }: PresignedUrlOptions): Promise<string> {
    console.debug('Generating presigned URL with options:', {
      key,
      action,
      expiresInSeconds,
      contentType,
    });
    if (!key) {
      throw new BadRequestException('Key is required.');
    }

    let command;

    switch (action) {
      case 'upload':
        command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: contentType,
        });
        break;

      case 'download':
        command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        break;

      default:
        throw new BadRequestException('Invalid action.');
    }

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * List objects in an S3 bucket filtered by a key prefix
   * @param bucketName - The name of the S3 bucket
   * @param keyPrefix - The prefix (folder path or partial key) to filter objects
   */
  async listObjectsByKey(
    bucketName: string,
    keyPrefix: string,
  ): Promise<string[]> {
    if (!bucketName || !keyPrefix) {
      throw new BadRequestException('Bucket name and key prefix are required.');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: keyPrefix,
        MaxKeys: 100,
      });

      const result: ListObjectsV2CommandOutput =
        await this.s3Client.send(command);

      // Return only the object keys
      return (result.Contents || [])
        .map((obj) => obj.Key || '')
        .filter(Boolean);
    } catch (error) {
      console.error('Error listing objects from S3:', error);
      throw new BadRequestException('Failed to list objects from S3.');
    }
  }

  /**
   * Single seam for turning a stored file into a clickable email link.
   * Currently backed by S3 presigned URLs — swap the implementation here
   * (CloudFront signed URL, tokenized redirect route, etc.) without touching callers.
   */
  async getEmailAttachmentLink(
    file: UploadedFileDto,
  ): Promise<EmailAttachmentLink> {
    const extension = (file.originalName.split('.').pop() ?? '').toLowerCase();

    const [viewUrl, downloadUrl] = await Promise.all([
      this.getPresignedUrl(
        file.storageKey,
        this.EMAIL_ATTACHMENT_LINK_EXPIRY_SECONDS,
      ),
      this.getPresignedDownloadUrl(
        file.storageKey,
        file.originalName,
        this.EMAIL_ATTACHMENT_LINK_EXPIRY_SECONDS,
      ),
    ]);

    return {
      filename: file.originalName,
      extension,
      viewUrl,
      downloadUrl,
      sizeLabel: formatFileSize(file.sizeBytes),
    };
  }

  async getEmailAttachmentLinks(
    files: UploadedFileDto[],
  ): Promise<EmailAttachmentLink[]> {
    if (!files?.length) return [];
    return Promise.all(files.map((f) => this.getEmailAttachmentLink(f)));
  }

  // NEW — forces Content-Disposition: attachment so it always downloads, never previews
  private async getPresignedDownloadUrl(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"`,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
