import { redirect } from 'next/navigation';

type AcceptInvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const params = await searchParams;
  const token = params?.token?.trim();

  if (!token) {
    redirect('/login');
  }

  redirect(`/set-password?mode=invite&token=${encodeURIComponent(token)}`);
}
