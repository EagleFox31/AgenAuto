import Link from 'next/link'

const foundations = [
  'Next.js public application',
  'Payload Headless Core',
  'PostgreSQL adapter',
  'Payload Admin at /admin',
  'Versioned migration workflow',
]

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AGENAUTO · FOUNDATION</p>
        <h1>Comparer. Comprendre. Choisir.</h1>
        <p className="lede">
          Le socle technique AgenAuto est prêt à accueillir le référentiel automobile canonique,
          les offres concessionnaires et le moteur de comparaison.
        </p>

        <div className="actions">
          <Link className="primary" href="/admin">
            Ouvrir Payload Admin
          </Link>
          <a className="secondary" href="https://github.com/EagleFox31/AgenAuto">
            Voir le repository
          </a>
        </div>
      </section>

      <section className="foundation" aria-labelledby="foundation-title">
        <div>
          <p className="eyebrow">HEADLESS CORE</p>
          <h2 id="foundation-title">Foundation active</h2>
        </div>
        <ul>
          {foundations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}
