'use client'

import { useEffect, useMemo, useState } from 'react'

type FileItem = { path: string; kind: string; lines: string[]; hidden?: boolean }
type SearchHit = { file: FileItem; line: number; text: string }

type Phase = { title: string; prompt: string; answer: string; search: string; file?: string; hint: string }

const makeNoise = (count: number, label: string) => Array.from({ length: count }, (_, i) => `// ${String(i + 1).padStart(3, '0')} | ${label} ${String(i + 1).padStart(3, '0')}`)

const files: FileItem[] = [
  { path: 'app/main.sim', kind: 'SIM', lines: makeNoise(80, 'simulation module') },
  { path: 'app/auth/check.sim', kind: 'AUTH', lines: ['01 | function checkAccess(user, area) {','02 |   const role = user.role','03 |   const requested = area.name','04 |','05 |   if (requested === "PUBLIC") return "GRANTED"','06 |   if (role === "ADMIN") return "GRANTED"','07 |   if (role === "ANALYST" && requested === "LAB") return "GRANTED"','08 |   return "DENIED"','09 | }','10 | // simulation-only authorization logic'] },
  { path: 'app/auth/session.sim', kind: 'AUTH', lines: makeNoise(55, 'session simulation').concat(['056 | session.role = demoUser.role','057 | session.area = requestedArea','058 | session.source = "SIMULATOR"']) },
  { path: 'app/users/demo-data.sim', kind: 'DATA', lines: makeNoise(45, 'demo record').concat(['046 | USER analyst-01 role=ANALYST area=LAB','047 | USER guest-01 role=GUEST area=PUBLIC','048 | USER admin-01 role=ADMIN area=LAB']) },
  { path: 'config/lab.sim', kind: 'CFG', lines: ['01 | environment = "ISOLATED_SIMULATOR"','02 | network = "DISABLED"','03 | external_requests = false','04 | real_targets = false'].concat(makeNoise(26, 'lab configuration')) },
  { path: 'tests/access.sim', kind: 'TEST', lines: ['01 | TEST public area accepts every demo user','02 | TEST admin role accepts LAB area','03 | TEST analyst role accepts LAB area','04 | TEST guest role is denied from LAB area','05 | EXPECTED: analyst-01 + LAB => GRANTED','06 | EXPECTED: guest-01 + LAB => DENIED'] },
  { path: 'docs/architecture.sim', kind: 'DOC', lines: ['01 | CYBERVAULT LAB ARCHITECTURE','02 | auth/check.sim -> authorization rules','03 | auth/session.sim -> session state','04 | users/demo-data.sim -> fictional identities','05 | tests/access.sim -> expected behaviour','06 | hidden/index.sim -> sealed investigation map'] },
  { path: 'logs/audit-001.sim', kind: 'LOG', lines: makeNoise(30, 'audit event').concat(['031 | finding=DEBUG-12 note="debug branch visible" severity=medium']) },
  { path: 'logs/audit-002.sim', kind: 'LOG', lines: makeNoise(30, 'trace').concat(['031 | finding=TRACE-04 note="role value appears in trace" severity=low']) },
  { path: 'docs/notes/review.sim', kind: 'NOTE', lines: ['01 | REVIEW NOTE // do not trust isolated findings','02 | Compare implementation -> identity -> test.','03 | A finding without observable effect is a false positive.','04 | NEXT-TRACE: AUTH-08 / analyst-01 / LAB'] },
  { path: 'hidden/index.sim', kind: 'SEALED', hidden: true, lines: ['01 | SEALED INDEX // discoverable only after the correct trace','02 | FILE: hidden/decoy.sim','03 | FILE: hidden/ledger.sim','04 | FILE: hidden/final-key.sim','05 | RULE: inspect -> compare -> confirm','06 | TRACE: VAULT-06'] },
  { path: 'hidden/decoy.sim', kind: 'DECOY', hidden: true, lines: ['01 | DECOY REPORT','02 | suspicious=true','03 | severity=critical','04 | conclusion=NOT_PROOF','05 | NOTE: dramatic wording is not evidence'] },
  { path: 'hidden/ledger.sim', kind: 'LEDGER', hidden: true, lines: ['01 | CHAIN LEDGER','02 | AUTH-08 -> analyst-01 -> GRANTED','03 | VAULT-06 -> final-key.sim','04 | checksum = CHAIN-3'] },
  { path: 'hidden/final-key.sim', kind: 'KEY', hidden: true, lines: ['01 | FINAL KEY RECORD','02 | key-fragment = NIGHT-ORBIT','03 | validation = CHAIN-3','04 | vault command = OPEN-VAULT'] },
]

const phases: Phase[] = [
  { title: 'Cartographier', prompt: 'Retrouve le fichier qui révèle la carte scellée.', answer: 'HIDDEN/INDEX.SIM', search: 'SEALED', hint: 'Cherche un indice de type SEALED ou hidden.' },
  { title: 'Écarter le leurre', prompt: 'Le fichier decoy paraît critique. Quel verdict donne sa propre preuve ?', answer: 'NOT-PROOF', search: 'NOT_PROOF', file: 'hidden/decoy.sim', hint: 'Le texte affirme explicitement que le caractère dramatique n’est pas une preuve.' },
  { title: 'Recouper la chaîne', prompt: 'Quel checksum relie les éléments de la chaîne ?', answer: 'CHAIN-3', search: 'CHAIN-3', file: 'hidden/ledger.sim', hint: 'Observe la dernière ligne du ledger.' },
  { title: 'Extraire la clé', prompt: 'Quel fragment de clé est indiqué par le registre final ?', answer: 'NIGHT-ORBIT', search: 'NIGHT-ORBIT', file: 'hidden/final-key.sim', hint: 'La clé se trouve dans le fichier final-key.' },
  { title: 'Ouvrir le Vault', prompt: 'Quelle commande fictive termine l’enquête ?', answer: 'OPEN-VAULT', search: 'OPEN-VAULT', file: 'hidden/final-key.sim', hint: 'Commande propre au laboratoire, sans effet réel.' },
]

const STORAGE_KEY = 'cybervault-progress-v3'

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [active, setActive] = useState(1)
  const [phase, setPhase] = useState(0)
  const [answer, setAnswer] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [activeFile, setActiveFile] = useState(files[0])
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false)
  const [vaultOpen, setVaultOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) setCompleted(parsed.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 6)) }
    } catch { localStorage.removeItem(STORAGE_KEY) }
  }, [])

  const visibleFiles = useMemo(() => files.filter(f => !f.hidden || hiddenUnlocked), [hiddenUnlocked])
  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase(); if (!q) return []
    const hits: SearchHit[] = []
    for (const file of visibleFiles) file.lines.forEach((line, index) => { if (line.toLowerCase().includes(q)) hits.push({ file, line: index + 1, text: line }) })
    return hits
  }, [query, visibleFiles])
  const xp = completed.length * 150
  const allComplete = completed.includes(6)
  const currentPhase = phases[Math.min(phase, phases.length - 1)]

  function persist(next: number[]) { setCompleted(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }

  function validate() {
    const value = answer.trim().toUpperCase()
    if (active !== 6) { setMessage('✓ Zone finale indisponible : termine d’abord les zones précédentes.'); return }
    if (phase === 0 && value === currentPhase.answer) {
      setPhase(1); setAnswer(''); setQuery(currentPhase.search); setActiveFile(files.find(f => f.path === 'hidden/index.sim') ?? files[0]); setHiddenUnlocked(true); setMessage('✓ TRACE ACCEPTÉE — les fichiers scellés deviennent visibles.')
      return
    }
    if (phase > 0 && value === currentPhase.answer) {
      if (phase === phases.length - 1) {
        setVaultOpen(true); const next = Array.from(new Set([...completed, 6])).sort((a,b) => a-b); persist(next); setMessage('✓ OPEN-VAULT ACCEPTÉ — VAULT DÉVERROUILLÉ.')
      } else { const nextPhase = phase + 1; setPhase(nextPhase); setAnswer(''); setQuery(phases[nextPhase].search); setActiveFile(files.find(f => f.path === phases[nextPhase].file) ?? files[0]); setMessage(`✓ PHASE ${phase + 1}/${phases.length} VALIDÉE — nouvelle preuve requise.`) }
      return
    }
    setMessage('✕ Réponse incorrecte. Relis les preuves croisées et évite les conclusions basées sur le seul niveau d’alerte.')
  }

  function selectFile(file: FileItem) { setActiveFile(file); setQuery('') }
  function resetFinal() { setPhase(0); setAnswer(''); setQuery(''); setVaultOpen(false); setHiddenUnlocked(false); setActiveFile(files[0]); setMessage('ENQUÊTE FINALE RÉINITIALISÉE') }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div><div className="status">● DEEP AUDIT // V3.2</div></header>
      <section className="hero"><div><p className="eyebrow">CTF // LABORATOIRE ISOLÉ // FINAL AUDIT</p><h1>Le <span>Vault</span><br />t’attend.</h1><p className="subtitle">Dernière enquête : les fichiers scellés, les faux indices et la chaîne de preuve doivent être recoupés avant l’ouverture du Vault.</p></div><div className="profile-card"><div className="rank">PROGRESSION</div><strong>{allComplete ? 'VAULT MASTER' : completed.length >= 3 ? 'ANALYSTE' : 'RECRUE'}</strong><div className="xp-row"><span>{xp} XP</span><span>900 XP</span></div><div className="bar"><i style={{ width: `${Math.min(100, (xp / 900) * 100)}%` }} /></div></div></section>
      <div className="notice">⚡ LABORATOIRE 100 % FICTIF — fichiers, identités, commandes et vulnérabilités sont simulés. Aucune cible réelle n’est contactée.</div>

      <section className="audit-layout">
        <aside className="file-tree">
          <div className="panel-title">PROJECT EXPLORER <b>{visibleFiles.length}/{files.length}</b></div>
          <input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="🔎 rechercher dans les fichiers..." />
          {query && <div className="search-meta">{searchHits.length} occurrence{searchHits.length > 1 ? 's' : ''}</div>}
          <div className="file-list">{visibleFiles.map(file => <button key={file.path} className={`file-row ${activeFile.path === file.path ? 'selected' : ''}`} onClick={() => selectFile(file)}><span>{file.hidden ? '🔐' : '📄'}</span><span>{file.path}</span><em>{file.kind}</em></button>)}</div>
          {searchHits.length > 0 && <div className="results"><div className="results-title">SEARCH RESULTS</div>{searchHits.slice(0, 30).map((hit, i) => <button key={`${hit.file.path}-${hit.line}-${i}`} className="result" onClick={() => setActiveFile(hit.file)}><strong>{hit.file.path}</strong><span>L{hit.line} · {hit.text.trim().slice(0, 58)}</span></button>)}</div>}
        </aside>

        <article className="code-panel"><div className="code-head"><span>{activeFile.path}</span><span>{activeFile.lines.length} LIGNES · SIMULATION</span></div><pre className="code-view"><code>{activeFile.lines.map((line, i) => <span key={i} className="code-line"><b>{String(i + 1).padStart(3, '0')}</b>{line}</span>)}</code></pre></article>

        <aside className="mission-panel">
          <div className="mission-progress">MISSION 06 / 06 · FINAL VAULT · {phase + 1}/{phases.length}</div>
          <h2>{vaultOpen ? 'VAULT OUVERT' : currentPhase.title}</h2>
          <p>{vaultOpen ? 'La chaîne complète est validée. Tu as terminé CyberVault V3.' : currentPhase.prompt}</p>
          {!vaultOpen && <>
            <div className="hint">💡 {currentPhase.hint}</div>
            <div className="terminal"><div className="terminal-head">SIMULATOR // COMMAND INPUT</div><div className="terminal-line"><span>lab@cybervault:~$</span><input value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') validate() }} placeholder="saisir la preuve..." /></div><button className="validate" onClick={validate}>VALIDER LA PREUVE →</button></div>
            <div className="chain"><strong>CHAÎNE DE PREUVE</strong>{phases.slice(0, phase).map((p, i) => <div key={p.title}>✓ {i + 1}. {p.title}</div>)}{phase === 0 && <div className="muted">○ aucune preuve validée</div>}</div>
          </>}
          {vaultOpen && <div className="vault-card"><div className="vault-icon">⬡</div><strong>ACCESS GRANTED</strong><span>CYBERVAULT // VAULT MASTER</span><small>Chaîne : HIDDEN → NOT-PROOF → CHAIN-3 → NIGHT-ORBIT → OPEN-VAULT</small><button className="validate" onClick={resetFinal}>REJOUER L’ENQUÊTE</button></div>}
        </aside>
      </section>

      <section className="roadmap"><div className="road-title">DEVELOPMENT BUILD <span>COMPLETE</span></div><div className="steps">{['AUDIT UI','RECHERCHE','FAILLE','MULTI-ÉTAPES','ZONES','VAULT'].map((s, i) => <div key={s} className="step done"><b>0{i + 1}</b><span>{s}</span><em>✓</em></div>)}</div></section>
      <footer>CYBERVAULT // V3.2 // FICTIONAL SECURITY LAB // NO REAL TARGETS</footer>
    </main>
  )
}
