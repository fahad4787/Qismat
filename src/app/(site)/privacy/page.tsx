import type { Metadata } from "next";
import { Nav } from "@/components/Chrome";
import { Footer } from "@/components/Footer";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What the Qismat app collects, why, and how to have it deleted.",
};

export default function Privacy() {
  return (
    <>
      <Nav base="/" />
      <main id="top" className="legal">
        <div className="wrap">
          <h1>Privacy</h1>
          <p className="draft">Draft. To be checked by a lawyer before the app goes public.</p>
          <p>Last updated 17 November 2026. This page explains what the Qismat app and this website collect, why, and what you can ask us to do with it.</p>

          <h2>What we collect</h2>
          <ul>
            <li>Your account: name, email address and, if you sign in with Google, your Google account ID.</li>
            <li>Your activity in the app: tickets earned, ads finished each day, check-ins, and the draws you enter.</li>
            <li>If you win: your first name and city, which we publish, and the phone number and address you give us for delivery, which we do not.</li>
            <li>Advertising data: Google AdMob shows the ads and may use your device&rsquo;s advertising ID. See Google&rsquo;s own privacy policy for what it collects.</li>
          </ul>

          <h2>Why we use it</h2>
          <ul>
            <li>To run your account, count your tickets and enter you into draws.</li>
            <li>To stop cheating, for example more than one account per person or more ads a day than allowed.</li>
            <li>To contact winners and deliver prizes.</li>
          </ul>

          <h2>Where it is kept</h2>
          <p>Accounts and draw data are stored with Google Firebase. We do not sell your data.</p>

          <h2>Deleting your data</h2>
          <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your account and we will delete the account and its data within 30 days. Winner listings already published keep only the first name and city.</p>

          <h2>Children</h2>
          <p>Qismat is for people aged 18 and over.</p>
        </div>
      </main>
      <Footer base="/" />
    </>
  );
}
