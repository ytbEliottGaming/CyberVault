'use client'

import { useEffect, useMemo, useState } from 'react'

const missions = [
  { id: 1, title: 'Signal fantôme', difficulty: 'INITIATION', xp: 100, text: 'Un terminal fictif affiche plusieurs lignes. Repère le code qui apparaît après « ACCESS ».', hint: 'Cherche une ligne contenant exactement le mot ACCESS.', answer: 'VX-204' },
  { id: 2, title: 'Message chiffré', difficulty: 'FACILE', xp: 150, text: 'Dans cette simulation, le message « FDW » a été décalé de 3 lettres vers l’avant. Retrouve le mot original.', hint: 'Recule de 3 lettres dans l’alphabet.', answer: 'CAT' },
  { id: 3, title: 'Fichier verrouillé', difficulty: 'MOYEN', xp: 200, text: 'Le coffre fictif contient le fragment « 4B-39 ». Saisis-le exactement pour valider l’analyse.', hint: 'Le tiret fait partie du fragment.', answer: '4B-39' },
  { id: 4, title: 'Le coffre final', difficulty: 'EXPERT', xp: 300, text: 'Assemble les fragments obtenus dans les trois premières missions : VX-204 + CAT + 4B-39.', hint: 'Écris les trois fragments sans espaces.', answer: 'VX-204CAT4B-39' },
]

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [active, setActive] = useState(1)
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('cybervault-progress')
    if (saved) setCompleted(JSON.parse(saved))
  }, [])

  const xp = useMemo(() => missions.filter(m => completed.includes(m.id)).reduce((sum, m) => sum + m.xp, 0), [completed])
  const mission = missions.find(m => m.id === active)!
  const unlocked = active === 1 || completed.includes(active - 1)

  function validate() {
    if (!unlocked) return
    if (answer.trim().toUpperCase() === mission.answer) {
      const next = Array.from(new Set([...completed, active]))
      setCompleted(next)
      localStorage.setItem('cybervault-progress', JSON.stringify(next))
      setMessage(`Mission validée ! +${mission.xp} XP`)
      setAnswer('')
    } else {
      setMessage('Code incorrect. Relis les indices et réessaie.')
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div>
        <div className="status">● SYSTÈME EN LIGNE</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CTF // SIMULATION LÉGALE</p>
          <h1>Bienvenue dans<br /><span>CyberVault.</span></h1>
          <p className="subtitle">Résous des défis fictifs, gagne de l&apos;XP et ouvre le coffre final.</p>
        </div>
        <div className="profile-card">
          <div className="rank">RANG</div>
          <strong>{xp >= 600 ? 'VAULT MASTER' : xp >= 300 ? 'CYBER AGENT' : 'RECRUE'}</strong>
          <div className="xp-row"><span>{xp} XP</span><span>750 XP</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (xp / 750) * 100)}%` }} /></div>
        </div>
      </section>

      <div className="notice">⚡ Tous les systèmes de ce jeu sont fictifs. Aucun site réel n&apos;est ciblé.</div>

      <section className="grid">
        <aside className="missions">
          <div className="section-title"><span>MISSIONS</span><b>{completed.length}/4</b></div>
          {missions.map(m => {
            const done = completed.includes(m.id)
            const locked = m.id > 1 && !completed.includes(m.id - 1)
            return <button key={m.id} className={`mission ${active === m.id ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={() => !locked && setActive(m.id)}>
              <span className="mission-num">{done ? '✓' : locked ? '×' : `0${m.id}`}</span>
              <span><strong>{m.title}</strong><small>{m.difficulty} · {m.xp} XP</small></span>
              <em>{done ? 'VALIDÉ' : locked ? 'VERROUILLÉ' : '→'}</em>
            </button>
          })}
        </aside>

        <article className="challenge">
          <div className="challenge-head"><span>MISSION 0{mission.id}</span><span className="difficulty">{mission.difficulty}</span></div>
          <h2>{mission.title}</h2>
          <p className="challenge-text">{mission.text}</p>
          {mission.id === 1 && <pre className="terminal">{`[09:41:02] handshake: OK\n[09:41:04] node: SIM-07\n[09:41:08] ACCESS: VX-204\n[09:41:10] firewall: nominal\n[09:41:12] session: ready`}</pre>}
          <div className="hint">💡 <strong>Indice :</strong> {mission.hint}</div>
          <label htmlFor="answer">RÉPONSE</label>
          <div className="answer-row"><input id="answer" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && validate()} placeholder="Entre ton code..." /><button onClick={validate}>VALIDER</button></div>
          {message && <p className={`message ${message.startsWith('Mission') ? 'success' : 'error'}`}>{message}</p>}
        </article>
      </section>

      <footer><span>CYBERVAULT // V1.0</span><span>PROGRESSION SAUVEGARDÉE LOCALEMENT</span></footer>
    </main>
  )
}
