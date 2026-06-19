import { redirect } from 'next/navigation';

type AuthSetPasswordPageProps = {
  searchParams: Promise<{ token?: string; mode?: string }>;
};

export default async function AuthSetPasswordPage({
  searchParams,
}: AuthSetPasswordPageProps) {
  const params = await searchParams;
  const token = params?.token?.trim();
  const mode = params?.mode?.trim();

  const queryParts: string[] = [];
  if (mode) queryParts.push(`mode=${encodeURIComponent(mode)}`);
  if (token) queryParts.push(`token=${encodeURIComponent(token)}`);

  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  redirect(`/set-password${query}`);
}

