import type { Metadata } from "next";
import { Nav } from "@/components/Chrome";
import { Footer } from "@/components/Footer";
import { ADS_PER_DAY, CONTACT_EMAIL, DAILY_BONUS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and draw rules",
  description: "The rules of Qismat's free prize draws: who can enter, how tickets work and how winners are picked.",
};

export default function Terms() {
  return (
    <>
      <Nav base="/" />
      <main id="top" className="legal">
        <div className="wrap">
          <h1>Terms and draw rules</h1>
          <p className="draft">Draft. To be checked by a lawyer before the app goes public.</p>

          <h2>Free to enter</h2>
          <p>No payment is needed or accepted to enter any draw. Tickets are earned only by watching ads in the app (one ticket per finished ad, up to {ADS_PER_DAY} a day) and by the daily check-in ({DAILY_BONUS} tickets once a day). Tickets have no cash value and cannot be bought, sold or transferred.</p>

          <h2>Who can enter</h2>
          <p>Residents of Pakistan aged 18 or over, with one account per person. Accounts that break these rules or try to earn tickets by other means lose their tickets and entries.</p>

          <h2>How winners are picked</h2>
          <p>Each ticket put into a draw is one entry. When a draw closes, winners are picked at random from all entries. The number of winners and the closing date are shown on each draw in the app.</p>

          <h2>Prizes</h2>
          <p>Prizes are bought and delivered by Qismat within Pakistan. A prize cannot be exchanged for cash unless we offer it. If a winner does not reply within 14 days, we may pick another winner.</p>

          <h2>Publishing winners</h2>
          <p>By entering you agree that, if you win, your first name and city are shown in the app and on this website.</p>

          <h2>Contact</h2>
          <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </div>
      </main>
      <Footer base="/" />
    </>
  );
}
