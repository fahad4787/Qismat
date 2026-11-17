import { Nav } from "@/components/Chrome";
import { Footer } from "@/components/Footer";
import { Board, LiveProvider, PrizesHeading, WinnersBand } from "@/components/Live";
import { Hero, PrizeBento } from "@/components/Showcase";
import {
  ADS_PER_DAY,
  APP_ID,
  DAILY_BONUS,
  PLAY_URL,
  SITE_URL,
} from "@/lib/site";

const FAQ = [
  {
    q: "Do I pay anything to enter a draw?",
    a: "No. Tickets come only from watching ads and the daily check-in. Qismat buys every prize itself, and the ads you watch help cover that cost.",
  },
  {
    q: "How many draw tickets can I earn a day?",
    a: `Up to ${ADS_PER_DAY} from ads, one for each ad you finish, plus ${DAILY_BONUS} for checking in once a day.`,
  },
  {
    q: "How is a winner picked, and how will I know?",
    a: "Each ticket in a draw is one chance, and one is picked at random when it closes. Winners see it in the app and on the Winners tab, then we contact them about delivery.",
  },
  {
    q: "Is the app on iPhone too?",
    a: "Android comes first on Google Play. The iPhone version is in testing and will follow.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MobileApplication",
      name: "Qismat",
      operatingSystem: "ANDROID",
      applicationCategory: "EntertainmentApplication",
      description:
        "Free prize draws in Pakistan. Watch a short ad to earn a ticket and enter draws for a motorbike, a smartphone or mobile load.",
      url: SITE_URL,
      installUrl: PLAY_URL,
      identifier: APP_ID,
      offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

const Shot = ({ name, alt, lazy = true }: { name: string; alt: string; lazy?: boolean }) => (
  <img
    src={`/shots/${name}.webp`}
    srcSet={`/shots/${name}-sm.webp 603w, /shots/${name}.webp 1206w`}
    sizes="(max-width: 1023px) 280px, 320px"
    alt={alt}
    width={1206}
    height={2622}
    loading={lazy ? "lazy" : undefined}
    decoding="async"
  />
);

const Check = () => (
  <svg className="fair__check" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" />
    <path d="M7.5 12.4l3 3 6-6.4" />
  </svg>
);

const STEPS = [
  {
    name: "Watch a short ad",
    text: `Finish the ad and one ticket lands in your account. Up to ${ADS_PER_DAY} a day, plus ${DAILY_BONUS} for checking in.`,
    icon: <path d="M5 4.5v15l14-7.5z" />,
    demo: (
      <>
        <span className="demo-bar"><i /></span>
        <span className="demo-pop">+1 ticket</span>
      </>
    ),
  },
  {
    name: "Pick a draw",
    text: "Put your tickets into the prize you want. More tickets in a draw, more chances to win it.",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <path d="M14 17l2 2 4-4.5" />
      </>
    ),
    demo: (
      <>
        <span className="demo-chip">Motorbike</span>
        <span className="demo-chip is-on">Smartphone</span>
        <span className="demo-chip">LED TV</span>
      </>
    ),
  },
  {
    name: "Watch the winners",
    text: "When a draw closes, a winner is picked at random, shown in the app and listed for everyone.",
    icon: (
      <>
        <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
        <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M8.5 20.5h7M10 17h4" />
      </>
    ),
    demo: (
      <span className="demo-win">
        <b>Winner picked</b> <i>Smartphone draw</i>
      </span>
    ),
  },
];

const RULES = [
  ["Free to enter, always", "No purchase, no top-up, no wallet. Tickets come only from ads and the daily check-in."],
  ["Tickets are checked", `Our server counts every ticket and holds everyone to ${ADS_PER_DAY} ads a day, so no one can add tickets they did not earn.`],
  ["Winners are public", "Each winner is listed by first name and city, so you can see the prizes go out."],
  ["One account each", "Sign in with Google or email. One person, one account, one set of chances."],
];

export default function Home() {
  return (
    <LiveProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main id="top">
        <Hero />

        <section className="section ground-inverse how" id="how" aria-labelledby="how-h">
          <div className="wrap">
            <div className="section-head center-head">
              <p className="eyebrow">How it works</p>
              <h2 id="how-h">
                Three steps. <span className="muted">A ticket costs you thirty seconds, never money.</span>
              </h2>
            </div>
            <ol className="steps3">
              <span className="steps3__line" aria-hidden="true"><i /></span>
              {STEPS.map((st, i) => (
                <li className="step3" key={st.name} style={{ "--i": i } as React.CSSProperties}>
                  <span className="step3__num" aria-hidden="true">
                    <svg viewBox="0 0 24 24">{st.icon}</svg>
                    <b>{String(i + 1).padStart(2, "0")}</b>
                  </span>
                  <h3>{st.name}</h3>
                  <p>{st.text}</p>
                  <div className="step3__demo" aria-hidden="true">{st.demo}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section board-section" id="live" aria-labelledby="live-h">
          <div className="wrap">
            <div className="board-head">
              <h2 id="live-h" className="t-label">Live from the app</h2>
              <span className="board-head__rule" aria-hidden="true" />
            </div>
            <Board />
          </div>
        </section>

        <section className="section ground-inverse prizes" id="prizes" aria-labelledby="prizes-h">
          <div className="wrap">
            <div className="section-head center-head">
              <p className="eyebrow">The prizes</p>
              <h2 id="prizes-h">
                <PrizesHeading />
              </h2>
            </div>
            <PrizeBento />
          </div>
        </section>

        <WinnersBand />

        <section className="section fair" id="fair" aria-labelledby="fair-h">
          <div className="wrap">
            <div className="section-head center-head">
              <p className="eyebrow">Fair play</p>
              <h2 id="fair-h">
                Fair in every draw. <span className="muted">Our server keeps the rules, so nobody bends them.</span>
              </h2>
            </div>
            <div className="orbit">
              <div className="orbit__phone">
                <span className="orbit__ring" aria-hidden="true" />
                <span className="orbit__ring orbit__ring--2" aria-hidden="true" />
                <Shot name="home" alt="The Qismat home screen: the prize total, the live draws and the grand draw for a 70cc motorbike" />
              </div>
              <ul className="orbit__rules">
                {RULES.map(([name, text], i) => (
                  <li key={name} className={`orbit__rule orbit__rule--${i}`}>
                    <Check />
                    <h3>{name}</h3>
                    <p>{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section ground-inverse faqs" id="faq" aria-labelledby="faq-h">
          <div className="wrap">
            <div className="section-head center-head">
              <p className="eyebrow">Questions</p>
              <h2 id="faq-h">
                Asked before installing. <span className="muted">Answered in a line or two.</span>
              </h2>
            </div>
            <div className="acc">
              {FAQ.map(({ q, a }, i) => (
                <details className="acc__item" key={q} name="faq" open={i === 0}>
                  <summary>
                    <span className="acc__n">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{q}</h3>
                    <span className="acc__plus" aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </LiveProvider>
  );
}
