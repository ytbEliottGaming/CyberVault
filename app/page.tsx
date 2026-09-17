'use client'

import { useEffect, useMemo, useState } from 'react'

type FileItem = { path: string; kind: string; lines: string[] }
type Finding = { id: string; title: string; file: string; line: number; verdict: 'CONFIRMED' | 'FALSE POSITIVE'; reason: string; evidence: string[] }
type SearchHit = { file: FileItem; line: number; text: string }

const files: FileItem[] = [
  { path: 'app/main.sim', kind: 'SIM', lines: Array.from({ length: 42 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | simulation module ${i + 1}`) },
  { path: 'app/auth/check.sim', kind: 'AUTH', lines: [
    '01 | function checkAccess(user, area) {',
    '02 |   const role = user.role',
    '03 |   const requested = area.name',
    '04 |',
    '05 |   if (requested === "PUBLIC") return "GRANTED"',
    '06 |   if (role === "ADMIN") return "GRANTED"',
    '07 |   if (role === "ANALYST" && requested === "LAB") return "GRANTED"',
    '08 |   return "DENIED"',
    '09 | }',
    '10 |',
    '11 | // NOTE: all values above are simulation-only.',
    '12 | // NOTE: the exercise never contacts a real service.',
  ] },
  { path: 'app/auth/session.sim', kind: 'AUTH', lines: [
    ...Array.from({ length: 18 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | session simulation ${i + 1}`),
    '19 | session.role = demoUser.role',
    '20 | session.area = requestedArea',
    '21 | session.source = "SIMULATOR"',
    ...Array.from({ length: 37 }, (_, i) => `// ${String(i + 22).padStart(2, '0')} | session simulation ${i + 22}`),
  ] },
  { path: 'app/users/demo-data.sim', kind: 'DATA', lines: [
    ...Array.from({ length: 24 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | demo record ${String(i + 1).padStart(3, '0')}`),
    '25 | USER analyst-01 role=ANALYST area=LAB',
    '26 | USER guest-01 role=GUEST area=PUBLIC',
    '27 | USER admin-01 role=ADMIN area=LAB',
    ...Array.from({ length: 49 }, (_, i) => `// ${String(i + 28).padStart(2, '0')} | demo record ${String(i + 28).padStart(3, '0')}`),
  ] },
  { path: 'config/lab.sim', kind: 'CFG', lines: [
    ...Array.from({ length: 14 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | lab configuration ${i + 1}`),
    '15 | environment = "ISOLATED_SIMULATOR"',
    '16 | network = "DISABLED"',
    '17 | external_requests = false',
    ...Array.from({ length: 18 }, (_, i) => `// ${String(i + 19).padStart(2, '0')} | lab configuration ${i + 19}`),
  ] },
  { path: 'tests/access.sim', kind: 'TEST', lines: [
    '01 | TEST: public area accepts every demo user',
    '02 | TEST: admin role accepts LAB area',
    '03 | TEST: analyst role accepts LAB area',
    '04 | TEST: guest role is denied from LAB area',
    '05 | TEST: all checks remain inside the isolated simulator',
    '06 | EXPECTED: analyst-01 + LAB => GRANTED',
    '07 | EXPECTED: guest-01 + LAB => DENIED',
  ] },
  { path: 'docs/architecture.sim', kind: 'DOC', lines: [
    '01 | CYBERVAULT LAB ARCHITECTURE',
    '02 | ----------------------------',
    '03 | auth/check.sim -> authorization rules',
    '04 | auth/session.sim -> session state simulator',
    '05 | users/demo-data.sim -> fictional identities',
    '06 | config/lab.sim -> isolated lab settings',
    '07 | tests/access.sim -> expected authorization behaviour',
    '08 | docs/architecture.sim -> project map',
    '09 |',
    '10 | Search terms such as AUTH, TEST, LAB and ROLE may reveal related files.',
  ] },
  { path: 'logs/audit-001.sim', kind: 'LOG', lines: [
    ...Array.from({ length: 18 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | audit event ${String(i + 1).padStart(3, '0')} | status=SIMULATED`),
    '19 | finding=DEBUG-12 note="debug branch visible" severity=medium',
    ...Array.from({ length: 45 }, (_, i) => `// ${String(i + 20).padStart(2, '0')} | audit event ${String(i + 20).padStart(3, '0')} | status=SIMULATED`),
  ] },
  { path: 'logs/audit-002.sim', kind: 'LOG', lines: [
    ...Array.from({ length: 22 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | trace ${String(i + 1).padStart(3, '0')} | source=LAB`),
    '23 | finding=TRACE-04 note="role value appears in trace" severity=low',
    ...Array.from({ length: 28 }, (_, i) => `// ${String(i + 24).padStart(2, '0')} | trace ${String(i + 24).padStart(3, '0')} | source=LAB`),
  ] },
]

const findings: Finding[] = [
  { id: 'DEBUG-12', title: 'Branche de debug visible', file: 'logs/audit-001.sim', line: 19, verdict: 'FALSE POSITIVE', reason: 'La présence d’un indice de debug ne change aucune règle d’autorisation dans la simulation.', evidence: ['config/lab.sim:16 → network = "DISABLED"', 'tests/access.sim:05 → environnement isolé'] },
  { id: 'TRACE-04', title: 'Rôle présent dans une trace', file: 'logs/audit-002.sim', line: 23, verdict: 'FALSE POSITIVE', reason: 'Une trace informative n’accorde aucun accès. Elle décrit seulement un état déjà simulé.', evidence: ['app/auth/session.sim:19 → session.role', 'tests/access.sim:05 → aucun service externe'] },
  { id: 'AUTH-08', title: 'Décision d’autorisation incohérente', file: 'app/auth/check.sim', line: 7, verdict: 'CONFIRMED', reason: 'Le test exige que analyst-01 accède à LAB, et le contrôle le permet explicitement. C’est le point d’entrée logique à examiner pour la suite.', evidence: ['app/auth/check.sim:07 → ANALYST + LAB', 'tests/access.sim:06 → analyst-01 + LAB => GRANTED', 'app/users/demo-data.sim:25 → analyst-01 role=ANALYST area=LAB'] },
]

const STORAGE_KEY = 'cybervault-progress-v3'

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [active, setActive] = useState(1)
  const [activeFile, setActiveFile] = useState(files[0])
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const [selectedHit, setSelectedHit] = useState<number | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) setCompleted(parsed.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 6))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const hits: SearchHit[] = []
    for (const file of files) file.lines.forEach((line, index) => { if (line.toLowerCase().includes(q)) hits.push({ file, line: index + 1, text: line }) })
    return hits
  }, [query])

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter(file => file.path.toLowerCase().includes(q) || file.lines.some(line => line.toLowerCase().includes(q)))
  }, [query])

  const xp = completed.length * 150
  const maxXp = 900
  const unlocked = active === 1 || completed.includes(active - 1)

  function openHit(hit: SearchHit, index: number) { setActiveFile(hit.file); setSelectedHit(index) }

  function analyzeFinding(finding: Finding) {
    setSelectedFinding(finding.id)
    setActiveFile(files.find(file => file.path === finding.file) ?? files[0])
    setMessage(finding.verdict === 'CONFIRMED' ? `✓ ${finding.id} CONFIRMÉ — croise maintenant ses preuves avant de valider.` : `⚠ ${finding.id} = FAUX POSITIF — ne valide pas cette piste.`)
  }

  function validate() {
    if (!unlocked) return
    const expected = active === 1 ? 'AUTH-08' : ''
    if (answer.trim().toUpperCase() === expected) {
      const next = Array.from(new Set([...completed, active])).sort((a, b) => a - b)
      setCompleted(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      if (active < 6) {
        setMessage('✓ ANALYSE VALIDÉE — ouverture automatique de la zone suivante...')
        window.setTimeout(() => { setActive(active + 1); setMessage('ZONE SUIVANTE DÉVERROUILLÉE'); setAnswer(''); setSelectedFinding(null) }, 700)
      } else setMessage('✓ COFFRE FINAL DÉVERROUILLÉ')
    } else setMessage('✕ Mauvaise piste. Un indice visible peut être un faux positif : croise les preuves.')
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div><div className="status">● DEEP AUDIT // V3</div></header>
      <section className="hero"><div><p className="eyebrow">CTF // LABORATOIRE ISOLÉ // DEEP AUDIT</p><h1>Inspecte.<br /><span>Comprends.</span><br />Progresse.</h1><p className="subtitle">Une anomalie visible n’est pas forcément une vulnérabilité. Analyse, recoupe et distingue les vrais signaux des faux positifs.</p></div><div className="profile-card"><div className="rank">PROGRESSION</div><strong>{completed.length >= 6 ? 'VAULT MASTER' : completed.length >= 3 ? 'ANALYSTE' : 'RECRUE'}</strong><div className="xp-row"><span>{xp} XP</span><span>{maxXp} XP</span></div><div className="bar"><i style={{ width: `${(xp / maxXp) * 100}%` }} /></div></div></section>
      <div className="notice">⚡ ENVIRONNEMENT 100 % FICTIF — code, fichiers, commandes et « vulnérabilités » sont des mécaniques de jeu isolées.</div>
      <section className="audit-layout">
        <aside className="file-tree"><div className="panel-title">PROJECT EXPLORER <b>{visibleFiles.length}/{files.length}</b></div><input className="search" value={query} onChange={e => { setQuery(e.target.value); setSelectedHit(null) }} placeholder="🔎 rechercher fichier ou contenu..." />{query && <div className="search-meta">{searchHits.length} occurrence{searchHits.length > 1 ? 's' : ''} · {visibleFiles.length} fichier{visibleFiles.length > 1 ? 's' : ''}</div>}<div className="file-list">{visibleFiles.map(file => <button key={file.path} className={`file-row ${activeFile.path === file.path ? 'selected' : ''}`} onClick={() => { setActiveFile(file); setSelectedHit(null) }}><span>📄</span><span>{file.path}</span><em>{file.kind}</em></button>)}{visibleFiles.length === 0 && <div className="empty">Aucun fichier correspondant.</div>}</div>{searchHits.length > 0 && <div className="results"><div className="results-title">SEARCH RESULTS</div>{searchHits.slice(0, 24).map((hit, index) => <button key={`${hit.file.path}-${hit.line}-${index}`} className={`result ${selectedHit === index ? 'hit-selected' : ''}`} onClick={() => openHit(hit, index)}><strong>{hit.file.path}</strong><span>L{hit.line} · {hit.text.trim().slice(0, 54)}</span></button>)}{searchHits.length > 24 && <div className="more">+ {searchHits.length - 24} autres occurrences</div>}</div>}</aside>
        <article className="code-panel"><div className="code-head"><span>{activeFile.path}</span><span>{activeFile.lines.length} LIGNES · LECTURE SEULE</span></div><pre className="code-view"><code>{activeFile.lines.map((line, i) => <span key={i} className="code-line"><b>{String(i + 1).padStart(3, '0')}</b>{line}</span>)}</code></pre></article>
        <aside className="mission-panel"><div className="mission-progress">MISSION {String(active).padStart(2, '0')} / 06</div><h2>{active === 1 ? 'Premier audit' : `Zone ${String(active).padStart(2, '0')}`}</h2><p>{active === 1 ? 'Trois pistes sont signalées dans le laboratoire. Deux sont des faux positifs. La bonne analyse nécessite de relier le code, les données fictives et les tests.' : 'Cette zone sera construite dans la prochaine étape de développement.'}</p>{active === 1 && <>
          <div className="finding-list">{findings.map(finding => <button key={finding.id} className={`finding ${selectedFinding === finding.id ? 'selected' : ''}`} onClick={() => analyzeFinding(finding)}><span>{finding.id}</span><strong>{finding.title}</strong><em>{finding.verdict === 'CONFIRMED' ? 'À CONFIRMER' : 'FAUX POSITIF'}</em></button>)}</div>
          {selectedFinding && <div className="evidence"><strong>ANALYSE — {selectedFinding}</strong><p>{findings.find(f => f.id === selectedFinding)?.reason}</p>{findings.find(f => f.id === selectedFinding)?.evidence.map(item => <div key={item}>↳ {item}</div>)}</div>}
          <div className="hint">💡 <strong>Règle du lab :</strong> une anomalie n’est confirmée que si son comportement correspond aux preuves attendues dans plusieurs fichiers.</div>
          <label htmlFor="answer">IDENTIFIANT DE L’ANOMALIE CONFIRMÉE</label><div className="answer-row"><input id="answer" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && validate()} placeholder="ex. AUTH-00" autoComplete="off" /><button onClick={validate}>ANALYSER</button></div>
        </>}{message && <p className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>{message}</p>}</aside>
      </section>
      <section className="roadmap"><span>01 AUDIT UI ✓</span><span>02 RECHERCHE ✓</span><span>03 FAILLE 🔒</span><span>04 MULTI-ÉTAPES 🔒</span><span>05 ZONES 🔒</span><span>06 VAULT 🔒</span></section>
      <footer><span>CYBERVAULT // V3.0</span><span>SIMULATION ISOLÉE · PROGRESSION LOCALE</span></footer>
    </main>
  )
}
