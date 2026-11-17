import Link from "next/link";

export const Arrow = () => (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
    <path className="m-arrow__stem" d="M1 6h8" />
    <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
  </svg>
);

/** `base` is "" on the home page (links stay on the page) and "/" elsewhere. */
export function Nav({ base = "" }: { base?: string }) {
  return (
    <header className="nav nav--centre">
      <div className="wrap nav__bar">
        <a className="skip-link" href="#top">Skip to content</a>
        <Link className="nav__logo" href="/">
          <span className="mark" data-mark="stack" aria-hidden="true"></span>Qismat
        </Link>
        <nav className="nav__links" aria-label="Main">
          <div className="nav__item"><a className="nav__link" href={`${base}#how`}>How it works</a></div>
          <div className="nav__item"><a className="nav__link" href={`${base}#prizes`}>Prizes</a></div>
          <div className="nav__item"><a className="nav__link" href={`${base}#fair`}>Fair play</a></div>
          <div className="nav__item"><a className="nav__link" href={`${base}#faq`}>Questions</a></div>
        </nav>
        <div className="nav__actions">
          <a className="btn btn--primary" href={`${base}#get`}>Get the app</a>
        </div>
        <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
