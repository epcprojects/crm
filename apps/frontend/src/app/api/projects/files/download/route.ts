import { NextResponse } from 'next/server';

function getCloudfrontUrl() {
  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim();

  if (!cloudfrontUrl) {
    return null;
  }

  return cloudfrontUrl.replace(/\/+$/, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storageKey = searchParams.get('storageKey')?.trim();
    const fileName = searchParams.get('fileName')?.trim() || 'download';
    const cloudfrontUrl = getCloudfrontUrl();

    if (!storageKey) {
      return NextResponse.json(
        { message: 'storageKey is required.' },
        { status: 400 },
      );
    }

    if (!cloudfrontUrl) {
      return NextResponse.json(
        { message: 'NEXT_PUBLIC_CLOUDFRONT_URL is not configured.' },
        { status: 500 },
      );
    }

    const normalizedStorageKey = storageKey.replace(/^\/+/, '');
    const response = await fetch(`${cloudfrontUrl}/${normalizedStorageKey}`, {
      cache: 'no-store',
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { message: 'Failed to download file.' },
        { status: response.status || 500 },
      );
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${sanitizeFileName(fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while downloading the file.' },
      { status: 500 },
    );
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/["\\\r\n]/g, '').trim() || 'download';
}
