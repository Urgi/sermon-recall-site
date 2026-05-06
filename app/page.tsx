import { redirect } from 'next/navigation';

/** Root URL is the pastor admin product only; unauthenticated users land on sign-in. */
export default function Home() {
  redirect('/login');
}
