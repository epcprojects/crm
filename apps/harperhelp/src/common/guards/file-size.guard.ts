import {
  Injectable,
  CanActivate,
  ExecutionContext,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Enforces a max TOTAL request-body size (sum of all uploaded files +
 * negligible form-field/multipart overhead) using the Content-Length
 * header, BEFORE Multer parses anything.
 *
 * Config: MAX_ATTACHMENT_SIZE in .env, value in MB. Defaults to 10 if unset.
 *
 * NOTE: this is a total-payload check, not a per-file check. If you ever
 * need a per-file limit instead, this needs to move to the
 * FilesInterceptor's `limits.fileSize` option instead, since Content-Length
 * cannot distinguish "one 15MB file" from "three 5MB files".
 */
@Injectable()
export class FileSizeGuard implements CanActivate {
  private static readonly DEFAULT_MAX_MB = 10;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const maxSizeBytes = this.getMaxSizeBytes();
    const contentLengthHeader = request.headers['content-length'];

    if (!contentLengthHeader) {
      // Chunked transfer or missing header entirely — reject rather than
      // silently allow an unbounded upload through.
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Content-Length header is required for file uploads and was not provided.',
      });
    }

    const contentLength = parseInt(contentLengthHeader, 10);

    if (Number.isNaN(contentLength)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid Content-Length header.',
      });
    }

    if (contentLength > maxSizeBytes) {
      const maxSizeMb = maxSizeBytes / (1024 * 1024);
      throw new PayloadTooLargeException({
        statusCode: 413,
        error: 'Payload Too Large',
        message: `Your files exceed the ${maxSizeMb}MB upload limit.`,
      });
    }

    return true;
  }

  private getMaxSizeBytes(): number {
    const configuredMb = this.configService.get<string>('file_size.MAX_ATTACHMENT_SIZE');
    const maxMb = configuredMb
      ? parseFloat(configuredMb)
      : FileSizeGuard.DEFAULT_MAX_MB;

    // Guard against a garbage .env value (e.g. "abc", empty string, 0, negative)
    const safeMaxMb =
      !maxMb || Number.isNaN(maxMb) || maxMb <= 0
        ? FileSizeGuard.DEFAULT_MAX_MB
        : maxMb;

    return safeMaxMb * 1024 * 1024;
  }
}