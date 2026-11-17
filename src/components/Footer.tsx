import Link from "next/link";
import { Arrow } from "./Chrome";
import { APP_STORE_URL, CONTACT_EMAIL, PLAY_URL } from "@/lib/site";

export function Footer({ base = "" }: { base?: string }) {
  return (
    <footer className="footer closing footer--dark ground-inverse" id="get" aria-labelledby="close-h">
      <div className="wrap">
        <div className="closing__cta close--word">
          <div className="section-head--split">
            <div>
              <h2 id="close-h">Your first ticket is one ad away</h2>
              <p className="t-lead">Free on Google Play for Android phones. The iPhone version follows.</p>
            </div>
            <a className="btn btn--primary" href={PLAY_URL} rel="noopener">Get the app<Arrow /></a>
          </div>
          <p className="close__word" aria-hidden="true">Qismat</p>
        </div>
        <div className="closing__links">
          <div className="grid">
            <div className="span-4 stack-4">
              <Link className="nav__logo" href="/">
                <span className="mark" data-mark="stack" aria-hidden="true"></span>Qismat
              </Link>
              <p className="footer__lede">Free prize draws for everyone in Pakistan, paid for by ads.</p>
            </div>
            <div className="span-2 start-7 footer__col">
              <h3>App</h3>
              <ul>
                <li><a href={`${base}#how`}>How it works</a></li>
                <li><a href={`${base}#prizes`}>Prizes</a></li>
                <li><a href={`${base}#fair`}>Fair play</a></li>
              </ul>
            </div>
            <div className="span-2 start-9 footer__col">
              <h3>Download</h3>
              <ul>
                <li><a href={PLAY_URL} rel="noopener">Google Play</a></li>
                <li>{APP_STORE_URL ? <a href={APP_STORE_URL} rel="noopener">App Store</a> : <span className="muted">App Store, soon</span>}</li>
              </ul>
            </div>
            <div className="span-2 start-11 footer__col">
              <h3>Help</h3>
              <ul>
                <li><a href={`${base}#faq`}>Questions</a></li>
                <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer__legal">
            <span>
              &copy; 2026 Qismat &nbsp; <Link href="/privacy/">Privacy</Link> &nbsp; <Link href="/terms/">Terms</Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
