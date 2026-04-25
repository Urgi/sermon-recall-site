import Image from 'next/image';

const CARDS = [
  {
    t: 'Extend the sermon',
    d: 'Turn one message into daily touchpoints instead of a single spike of attention.',
  },
  {
    t: 'Honor your preparation',
    d: 'Let study and illustrations keep working after the benediction.',
  },
  {
    t: 'Shepherd with consistency',
    d: 'Give your congregation a predictable path from hearing to doing.',
  },
] as const;

export default function Home() {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a]">
      <header
        className="site-header sticky top-0 z-50 border-b border-[rgba(56,189,248,0.12)] bg-[rgba(5,7,10,0.92)] px-[clamp(1.25rem,5vw,2rem)]"
        role="banner"
      >
        <div className="mx-auto flex w-full max-w-[1120px] items-start py-[14px]">
          <Image
            src="/sermon-recall-logo.jpg"
            alt="SermonRecall"
            width={1024}
            height={565}
            priority
            className="h-[30px] w-auto max-w-full select-none"
          />
        </div>
      </header>

      <main className="flex-1">
        <section className="hero-band">
          <div className="mx-auto w-full max-w-[1120px] px-[clamp(1.25rem,5vw,2rem)]">
            <div className="flex flex-col items-stretch gap-10 wide:flex-row wide:items-center wide:gap-14">
              <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-4 wide:mx-0 wide:max-w-none wide:flex-[1.1] wide:self-start">
                <p className="text-[13px] font-semibold uppercase leading-normal tracking-[1.6px] text-[#38bdf8]">
                  For pastors & church leaders
                </p>
                <h1 className="max-w-[560px] text-[40px] font-extrabold leading-[46px] tracking-[-1.2px]">
                  <span className="text-white">Sermon-to-Devotional </span>
                  <span className="text-[#38bdf8]">Pipeline</span>
                </h1>
                <p className="text-[19px] font-medium leading-[30px] text-[#cbd5e1]">
                  Bridge Sunday to the rest of the week with a clear rhythm your people can follow.
                </p>
                <p className="text-[17px] leading-[28px] text-[#94a3b8]">
                  As a pastor, your Sunday message is often where people encounter God most
                  clearly—yet without a deliberate path from pulpit to personal reflection, that
                  momentum fades by Monday. A sermon-to-devotional pipeline keeps the Word in front
                  of your flock in bite-sized form, reinforces application through the week, and
                  honors the labor you poured into study by letting it bear fruit long after the
                  service ends.
                </p>
              </div>
              <div className="flex w-full min-w-0 items-center justify-center wide:flex-[0.95]">
                <div className="flex w-full max-w-[560px] items-center justify-center py-2 [filter:drop-shadow(0_0_28px_rgba(56,189,248,0.18))_drop-shadow(0_12px_40px_rgba(0,0,0,0.45))]">
                  <Image
                    src="/sermon-recall-logo.jpg"
                    alt="SermonRecall logo with tagline Listen. Remember. Grow."
                    width={1024}
                    height={565}
                    priority
                    className="h-auto w-full max-w-[min(25rem,calc(100vw-2*clamp(1.25rem,5vw,2rem)))] wide:max-w-[min(32.5rem,42vw)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#05070a] py-[72px] px-[clamp(1.25rem,5vw,2rem)]">
          <div className="mx-auto w-full max-w-[1120px]">
            <h2 className="mb-[10px] text-[28px] font-bold tracking-[-0.5px] text-white">
              Built for weekly discipleship
            </h2>
            <p className="mb-10 max-w-[560px] text-[17px] leading-[26px] text-[#64748b]">
              The same ideas you already care about—structured the way a modern ministry site presents
              them.
            </p>
            <div className="flex flex-col gap-4 wide:flex-row wide:gap-5">
              {CARDS.map((item) => (
                <article
                  key={item.t}
                  className="min-w-0 flex-1 rounded-xl border border-[rgba(56,189,248,0.12)] bg-[#0a0f18] p-[22px]"
                >
                  <div className="mb-[14px] h-[3px] w-9 rounded-sm bg-[#38bdf8] opacity-[0.85]" />
                  <h3 className="mb-2 text-[17px] font-bold text-white">{item.t}</h3>
                  <p className="text-[15px] leading-[23px] text-[#94a3b8]">{item.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-[rgba(56,189,248,0.12)] bg-[#020408] py-12 pb-10 px-[clamp(1.25rem,5vw,2rem)]">
          <div className="mx-auto flex w-full max-w-[1120px] flex-row flex-wrap gap-x-10 gap-y-8">
            <div className="flex min-w-[160px] flex-1 flex-col gap-2">
              <p className="text-base font-bold text-white">Sermon Recall</p>
              <p className="text-sm text-[#64748b]">Listen. Remember. Grow.</p>
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[1.2px] text-[#64748b]">
                Stack
              </p>
              <p className="text-[15px] leading-[22px] text-[#94a3b8]">Expo · React Native · Web</p>
            </div>
          </div>
          {isDev ? (
            <p className="mx-auto mt-9 w-full max-w-[1120px] text-xs text-[#334155]">
              Local dev: cd site && npm run dev
            </p>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
