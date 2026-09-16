'use client'

import { useEffect, useMemo, useState } from 'react'

type Mission = {
  id: number
  title: string
  difficulty: string
  xp: number
  category: string
  text: string
  hint: string
  answer: string
  code?: string
}

const missions: Mission[] = [
  {
    id: 1,
    title: 'Signal fantôme',
    difficulty: 'INITIATION',
    xp: 100,
    category: 'LOG ANALYSIS',
    text: 'Analyse les journaux du terminal SIM-07 et retrouve le fragment délivré par le système.',
    hint: 'Le fragment est sur la ligne contenant ACCESS.',
    answer: 'VX-204',
    code: '[09:41:02] handshake: OK\n[09:41:04] node: SIM-07\n[09:41:08] ACCESS: VX-204\n[09:41:10] firewall: nominal\n[09:41:12] session: ready',
  },
  {
    id: 2,
    title: 'Le miroir',
    difficulty: 'FACILE',
    xp: 150,
    category: 'CRYPTO',
    text: 'Un message fictif a été décalé de 3 lettres vers l’avant. Retrouve le mot original.',
    hint: 'Recule chaque lettre de 3 positions dans l’alphabet.',
    answer: 'CAT',
    code: 'MESSAGE\n  FDW\n\nALGORITHME SIMULÉ\n  SHIFT = +3',
  },
  {
    id: 3,
    title: 'Portail fantôme',
    difficulty: 'MOYEN',
    xp: 200,
    category: 'ACCESS CONTROL',
    text: 'Le portail fictif affiche une règle d’autorisation. Identifie la valeur de test qui révèle la faille logique simulée.',
    hint: 'Observe ce qui arrive quand le rôle demandé n’est pas reconnu.',
    answer: 'OVERRIDE-17',
    code: 'SIMULATED AUTH CHECK\n\nrole = request.role\nif role === "ADMIN":\n    access = "GRANTED"\nelse if role === "UNKNOWN":\n    access = "OVERRIDE-17"\nelse:\n    access = "DENIED"',
  },
  {
    id: 4,
    title: 'ID miroir',
    difficulty: 'MOYEN+',
    xp: 200,
    category: 'LOGIC REVIEW',
    text: 'Un système fictif affiche un profil public à partir d’un identifiant. Repère l’identifiant de test exposé par erreur dans la réponse.',
    hint: 'Cherche la valeur qui ne correspond pas au profil demandé.',
    answer: 'PROFILE-9001',
    code: 'SIMULATED PROFILE RESPONSE\n\nrequestedProfile = "PLAYER-042"\nreturnedProfile = "PROFILE-9001"\nstatus = "PUBLIC"\nsource = "DEMO-DATA"',
  },
  {
    id: 5,
    title: 'Entrée fantôme',
    difficulty: 'DIFFICILE',
    xp: 250,
    category: 'INPUT REVIEW',
    text: 'Inspecte ce pseudo-code de validation. Dans CyberVault, quelle valeur spéciale le développeur de la simulation a-t-il prévue pour déclencher le mode diagnostic ?',
    hint: 'La valeur de diagnostic commence par DEBUG et se termine par un nombre.',
    answer: 'DEBUG-404',
    code: 'SIMULATED INPUT HANDLER\n\nvalue = input.value\nif value === "DEBUG-404":\n    mode = "DIAGNOSTIC"\nelse:\n    mode = "NORMAL"\n\n// aucune donnée réelle n’est traitée',
  },
  {
    id: 6,
    title: 'Le coffre final',
    difficulty: 'EXPERT',
    xp: 300,
    category: 'CHAIN OF CLUES',
    text: 'Assemble les fragments gagnés dans les cinq premières missions, dans l’ordre.',
    hint: 'VX-204 + CAT + OVERRIDE-17 + PROFILE-9001 + DEBUG-404.',
    answer: 'VX-204CATOVERRIDE-17PROFILE-9001DEBUG-404',
  },
]

const STORAGE_KEY = 'cybervault-progress-v2'

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [active, setActive] = useState(1)
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) setCompleted(parsed.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= missions.length))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const xp = useMemo(() => missions.filter(m => completed.includes(m.id)).reduce((sum, m) => sum + m.xp, 0), [completed])
  const maxXp = missions.reduce((sum, m) => sum + m.xp, 0)
  const mission = missions.find(m => m.id === active) ?? missions[0]
  const unlocked = active === 1 || completed.includes(active - 1)

  function validate() {
    if (!unlocked) return
    if (answer.trim().toUpperCase() === mission.answer) {
      const next = Array.from(new Set([...completed, active])).sort((a, b) => a - b)
      setCompleted(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setMessage(`Mission validée ! +${mission.xp} XP`)
      setAnswer('')
    } else {
      setMessage('Analyse incomplète. Relis les données de la simulation.')
    }
  }

  function selectMission(id: number) {
    const target = missions.find(m => m.id === id)
    if (!target) return
    const canOpen = id === 1 || completed.includes(id - 1)
    if (!canOpen) return
    setActive(id)
    setAnswer('')
    setMessage('')
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div>
        <div className="status">● LABORATOIRE EN LIGNE</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CTF // LABORATOIRE ISOLÉ</p>
          <h1>Bienvenue dans<br /><span>CyberVault.</span></h1>
          <p className="subtitle">Inspecte des systèmes entièrement simulés, repère leurs failles logiques et reconstruis la chaîne qui ouvre le coffre final.</p>
        </div>
        <div className="profile-card">
          <div className="rank">RANG</div>
          <strong>{xp >= 900 ? 'VAULT MASTER' : xp >= 600 ? 'CYBER AGENT' : xp >= 300 ? 'ANALYSTE' : 'RECRUE'}</strong>
          <div className="xp-row"><span>{xp} XP</span><span>{maxXp} XP</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (xp / maxXp) * 100)}%` }} /></div>
        </div>
      </section>

      <div className="notice">⚡ LABORATOIRE 100 % FICTIF — les « failles » sont des mécaniques de jeu isolées. Aucun système réel n’est ciblé.</div>

      <section className="grid">
        <aside className="missions">
          <div className="section-title"><span>MISSIONS</span><b>{completed.length}/{missions.length}</b></div>
          {missions.map(m => {
            const done = completed.includes(m.id)
            const locked = m.id > 1 && !completed.includes(m.id - 1)
            return (
              <button key={m.id} className={`mission ${active === m.id ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={() => selectMission(m.id)}>
                <span className="mission-num">{done ? '✓' : locked ? '×' : String(m.id).padStart(2, '0')}</span>
                <span><strong>{m.title}</strong><small>{m.difficulty} · {m.category} · {m.xp} XP</small></span>
                <em>{done ? 'VALIDÉ' : locked ? 'VERROUILLÉ' : '→'}</em>
              </button>
            )
          })}
        </aside>

        <article className="challenge">
          <div className="challenge-head"><span>MISSION {String(mission.id).padStart(2, '0')}</span><span className="difficulty">{mission.difficulty}</span></div>
          <div className="challenge-meta"><span>{mission.category}</span><span>{mission.xp} XP</span></div>
          <h2>{mission.title}</h2>
          <p className="challenge-text">{mission.text}</p>
          {mission.code && <pre className="terminal"><code>{mission.code}</code></pre>}
          <div className="hint">💡 <strong>Indice :</strong> {mission.hint}</div>
          <label htmlFor="answer">RÉPONSE DE L’ANALYSE</label>
          <div className="answer-row">
            <input id="answer" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && validate()} placeholder="Entre ton fragment..." autoComplete="off" />
            <button onClick={validate}>VALIDER</button>
          </div>
          {message && <p className={`message ${message.startsWith('Mission') ? 'success' : 'error'}`}>{message}</p>}
        </article>
      </section>

      {completed.length === missions.length && (
        <section className="vault-unlocked">
          <span>◆</span>
          <div><strong>COFFRE FINAL DÉVERROUILLÉ</strong><small>Tu as terminé les 6 étapes de l’audit simulé.</small></div>
        </section>
      )}

      <footer><span>CYBERVAULT // V2.0</span><span>PROGRESSION LOCALE · ENVIRONNEMENT DE TEST ISOLÉ</span></footer>
    </main>
  )
}
