'use client'

import { useEffect, useMemo, useState } from 'react'

type FileItem = { path: string; kind: string; lines: string[] }
type SearchHit = { file: FileItem; line: number; text: string }
type Finding = { id: string; title: string; file: string; line: number; verdict: 'CONFIRMED' | 'FALSE POSITIVE'; reason: string; evidence: string[] }

const files: FileItem[] = [
  { path: 'app/main.sim', kind: 'SIM', lines: Array.from({ length: 42 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | simulation module ${i + 1}`) },
  { path: 'app/auth/check.sim', kind: 'AUTH', lines: ['01 | function checkAccess(user, area) {','02 |   const role = user.role','03 |   const requested = area.name','04 |','05 |   if (requested === "PUBLIC") return "GRANTED"','06 |   if (role === "ADMIN") return "GRANTED"','07 |   if (role === "ANALYST" && requested === "LAB") return "GRANTED"','08 |   return "DENIED"','09 | }','10 |','11 | // NOTE: simulation-only authorization logic.','12 | // NOTE: the exercise never contacts a real service.'] },
  { path: 'app/auth/session.sim', kind: 'AUTH', lines: [...Array.from({ length: 18 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | session simulation ${i + 1}`),'19 | session.role = demoUser.role','20 | session.area = requestedArea','21 | session.source = "SIMULATOR"',...Array.from({ length: 37 }, (_, i) => `// ${String(i + 22).padStart(2, '0')} | session simulation ${i + 22}`)] },
  { path: 'app/users/demo-data.sim', kind: 'DATA', lines: [...Array.from({ length: 24 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | demo record ${String(i + 1).padStart(3, '0')}`),'25 | USER analyst-01 role=ANALYST area=LAB','26 | USER guest-01 role=GUEST area=PUBLIC','27 | USER admin-01 role=ADMIN area=LAB',...Array.from({ length: 49 }, (_, i) => `// ${String(i + 28).padStart(2, '0')} | demo record ${String(i + 28).padStart(3, '0')}`)] },
  { path: 'config/lab.sim', kind: 'CFG', lines: [...Array.from({ length: 14 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | lab configuration ${i + 1}`),'15 | environment = "ISOLATED_SIMULATOR"','16 | network = "DISABLED"','17 | external_requests = false',...Array.from({ length: 18 }, (_, i) => `// ${String(i + 19).padStart(2, '0')} | lab configuration ${i + 19}`)] },
  { path: 'tests/access.sim', kind: 'TEST', lines: ['01 | TEST: public area accepts every demo user','02 | TEST: admin role accepts LAB area','03 | TEST: analyst role accepts LAB area','04 | TEST: guest role is denied from LAB area','05 | TEST: all checks remain inside the isolated simulator','06 | EXPECTED: analyst-01 + LAB => GRANTED','07 | EXPECTED: guest-01 + LAB => DENIED'] },
  { path: 'docs/architecture.sim', kind: 'DOC', lines: ['01 | CYBERVAULT LAB ARCHITECTURE','02 | ----------------------------','03 | auth/check.sim -> authorization rules','04 | auth/session.sim -> session state simulator','05 | users/demo-data.sim -> fictional identities','06 | config/lab.sim -> isolated lab settings','07 | tests/access.sim -> expected authorization behaviour','08 | docs/architecture.sim -> project map','09 |','10 | Search terms such as AUTH, TEST, LAB and ROLE may reveal related files.'] },
  { path: 'logs/audit-001.sim', kind: 'LOG', lines: [...Array.from({ length: 18 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | audit event ${String(i + 1).padStart(3, '0')} | status=SIMULATED`),'19 | finding=DEBUG-12 note="debug branch visible" severity=medium',...Array.from({ length: 45 }, (_, i) => `// ${String(i + 20).padStart(2, '0')} | audit event ${String(i + 20).padStart(3, '0')} | status=SIMULATED`)] },
  { path: 'logs/audit-002.sim', kind: 'LOG', lines: [...Array.from({ length: 22 }, (_, i) => `// ${String(i + 1).padStart(2, '0')} | trace ${String(i + 1).padStart(3, '0')} | source=LAB`),'23 | finding=TRACE-04 note="role value appears in trace" severity=low',...Array.from({ length: 28 }, (_, i) => `// ${String(i + 24).padStart(2, '0')} | trace ${String(i + 24).padStart(3, '0')} | source=LAB`)] },
  { path: 'docs/notes/review.sim', kind: 'NOTE', lines: ['01 | REVIEW NOTE // do not trust isolated findings','02 | A finding is only useful when its effect is observable in expected behaviour.','03 | Compare implementation -> identity -> test.','04 | If the three disagree, investigate before declaring a vulnerability.','05 | NEXT-TRACE: AUTH-08 / analyst-01 / LAB','06 | NEXT-TRACE: compare the role source with the authorization branch.'] },
]

const findings: Finding[] = [
  { id: 'DEBUG-12', title: 'Branche de debug visible', file: 'logs/audit-001.sim', line: 19, verdict: 'FALSE POSITIVE', reason: 'Le signal décrit du debug, mais aucune règle d’accès ne dépend de cette branche.', evidence: ['config/lab.sim:16 → network = DISABLED','tests/access.sim:05 → simulation isolée'] },
  { id: 'TRACE-04', title: 'Rôle présent dans une trace', file: 'logs/audit-002.sim', line: 23, verdict: 'FALSE POSITIVE', reason: 'La trace expose un état de simulation ; elle ne modifie pas la décision.', evidence: ['app/auth/session.sim:19 → session.role','tests/access.sim:05 → aucun service externe'] },
  { id: 'AUTH-08', title: 'Décision d’autorisation incohérente', file: 'app/auth/check.sim', line: 7, verdict: 'CONFIRMED', reason: 'Le contrôle, l’identité fictive et le test attendu se recoupent. Cette piste déclenche l’enquête multi-étapes.', evidence: ['app/auth/check.sim:07 → ANALYST + LAB','app/users/demo-data.sim:25 → analyst-01 / ANALYST / LAB','tests/access.sim:06 → analyst-01 + LAB => GRANTED'] },
]

const STORAGE_KEY = 'cybervault-progress-v3'

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [active, setActive] = useState(1)
  const [phase, setPhase] = useState(1)
  const [activeFile, setActiveFile] = useState(files[0])
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const [selectedHit, setSelectedHit] = useState<number | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<string[]>([])

  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (!saved) return; const parsed = JSON.parse(saved); if (Array.isArray(parsed)) setCompleted(parsed.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 6)) } catch { localStorage.removeItem(STORAGE_KEY) } }, [])

  const searchHits = useMemo<SearchHit[]>(() => { const q = query.trim().toLowerCase(); if (!q) return []; const hits: SearchHit[] = []; for (const file of files) file.lines.forEach((line, index) => { if (line.toLowerCase().includes(q)) hits.push({ file, line: index + 1, text: line }) }); return hits }, [query])
  const visibleFiles = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return files; return files.filter(file => file.path.toLowerCase().includes(q) || file.lines.some(line => line.toLowerCase().includes(q))) }, [query])
  const xp = completed.length * 150
  const maxXp = 900
  const unlocked = active === 1 || completed.includes(active - 1)

  function openHit(hit: SearchHit, index: number) { setActiveFile(hit.file); setSelectedHit(index) }

  function analyzeFinding(finding: Finding) { setSelectedFinding(finding.id); setActiveFile(files.find(file => file.path === finding.file) ?? files[0]); setMessage(finding.verdict === 'CONFIRMED' ? `✓ ${finding.id} CONFIRMÉ — phase 2 débloquée.` : `⚠ ${finding.id} = FAUX POSITIF — piste abandonnée.`); if (finding.verdict === 'CONFIRMED') setPhase(2) }

  function validatePhase() {
    const value = answer.trim().toUpperCase()
    if (!unlocked) return
    if (phase === 1) {
      if (value === 'AUTH-08') { setSelectedFinding('AUTH-08'); setPhase(2); setAnswer(''); setMessage('✓ PHASE 1/3 — piste confirmée. Cherche maintenant la preuve suivante.'); setQuery('analyst-01') }
      else setMessage('✕ Cette piste ne résiste pas au recoupement. Essaie encore.')
      return
    }
    if (phase === 2) {
      if (value === 'ANALYST-01') { setEvidence(prev => [...new Set([...prev, 'identity'])]); setPhase(3); setAnswer(''); setMessage('✓ PHASE 2/3 — identité reliée. Il reste à retrouver la règle attendue.'); setQuery('EXPECTED'); setActiveFile(files.find(f => f.path === 'tests/access.sim') ?? files[0]) }
      else setMessage('✕ Mauvaise preuve. Le code doit être relié à une identité fictive précise.')
      return
    }
    if (phase === 3) {
      if (value === 'GRANTED') { setEvidence(prev => [...new Set([...prev, 'test'])]); const next = Array.from(new Set([...completed, active])).sort((a,b) => a-b); setCompleted(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setMessage('✓ 3/3 — CHAÎNE DE PREUVE COMPLÈTE. Zone suivante en ouverture...'); if (active < 6) window.setTimeout(() => { setActive(active + 1); setPhase(1); setAnswer(''); setEvidence([]); setQuery(''); setMessage('ZONE SUIVANTE DÉVERROUILLÉE') }, 900); return }
      setMessage('✕ La preuve finale doit correspondre au comportement attendu par le test.')
    }
  }

  const phaseText = phase === 1 ? 'Identifier une piste fiable parmi les faux positifs.' : phase === 2 ? 'Relier la piste à la bonne identité fictive.' : 'Retrouver le comportement attendu dans les tests.'

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div><div className="status">● DEEP AUDIT // V3</div></header>
      <section className="hero"><div><p className="eyebrow">CTF // LABORATOIRE ISOLÉ // DEEP AUDIT</p><h1>Inspecte.<br /><span>Comprends.</span><br />Progresse.</h1><p className="subtitle">Une investigation peut nécessiter plusieurs preuves. Chaque réponse débloque la prochaine étape sans retour au menu.</p></div><div className="profile-card"><div className="rank">PROGRESSION</div><strong>{completed.length >= 6 ? 'VAULT MASTER' : completed.length >= 3 ? 'ANALYSTE' : 'RECRUE'}</strong><div className="xp-row"><span>{xp} XP</span><span>{maxXp} XP</span></div><div className="bar"><i style={{ width: `${(xp / maxXp) * 100}%` }} /></div></div></section>
      <div className="notice">⚡ ENVIRONNEMENT 100 % FICTIF — toutes les données, commandes et vulnérabilités sont simulées et isolées.</div>
      <section className="audit-layout">
        <aside className="file-tree"><div className="panel-title">PROJECT EXPLORER <b>{visibleFiles.length}/{files.length}</b></div><input className="search" value={query} onChange={e => { setQuery(e.target.value); setSelectedHit(null) }} placeholder="🔎 rechercher fichier ou contenu..." />{query && <div className="search-meta">{searchHits.length} occurrence{searchHits.length > 1 ? 's' : ''} · {visibleFiles.length} fichier{visibleFiles.length > 1 ? 's' : ''}</div>}<div className="file-list">{visibleFiles.map(file => <button key={file.path} className={`file-row ${activeFile.path === file.path ? 'selected' : ''}`} onClick={() => { setActiveFile(file); setSelectedHit(null) }}><span>📄</span><span>{file.path}</span><em>{file.kind}</em></button>)}{visibleFiles.length === 0 && <div className="empty">Aucun fichier correspondant.</div>}</div>{searchHits.length > 0 && <div className="results"><div className="results-title">SEARCH RESULTS</div>{searchHits.slice(0, 24).map((hit, index) => <button key={`${hit.file.path}-${hit.line}-${index}`} className={`result ${selectedHit === index ? 'hit-selected' : ''}`} onClick={() => openHit(hit, index)}><strong>{hit.file.path}</strong><span>L{hit.line} · {hit.text.trim().slice(0, 54)}</span></button>)}{searchHits.length > 24 && <div className="more">+ {searchHits.length - 24} autres occurrences</div>}</div>}</aside>
        <article className="code-panel"><div className="code-head"><span>{activeFile.path}</span><span>{activeFile.lines.length} LIGNES · LECTURE SEULE</span></div><pre className="code-view"><code>{activeFile.lines.map((line, i) => <span key={i} className="code-line"><b>{String(i + 1).padStart(3, '0')}</b>{line}</span>)}</code></pre></article>
        <aside className="mission-panel"><div className="mission-progress">MISSION {String(active).padStart(2, '0')} / 06 · PHASE {phase}/3</div><h2>{active === 1 ? 'Enquête en chaîne' : `Zone ${String(active).padStart(2, '0')}`}</h2><p>{active === 1 ? phaseText : 'Cette zone sera construite dans la prochaine étape de développement.'}</p>{active === 1 && <>
          <div className="finding-list">{findings.map(f => <button key={f.id} className={`finding ${selectedFinding === f.id ? 'selected' : ''}`} onClick={() => analyzeFinding(f)}><span>{f.id}</span><strong>{f.title}</strong><em>{f.verdict === 'CONFIRMED' ? 'PISTE' : 'FAUX POSITIF'}</em></button>)}</div>
          {phase === 1 && <div className="hint">💡 <strong>Phase 1 :</strong> analyse les trois pistes. Ne valide pas un signal uniquement parce qu’il paraît inquiétant.</div>}
          {phase === 2 && <div className="hint">💡 <strong>Phase 2 :</strong> la réponse n’est pas une nouvelle vulnérabilité. C’est l’identité fictive reliée au contrôle.</div>}
          {phase === 3 && <div className="hint">💡 <strong>Phase 3 :</strong> retrouve le résultat attendu dans les tests. C’est la dernière pièce de la chaîne.</div>}
          {evidence.length > 0 && <div className="evidence"><strong>CHAÎNE DE PREUVE</strong><div>✓ piste AUTH-08</div>{evidence.includes('identity') && <div>✓ identité analyst-01</div>}{evidence.includes('test') && <div>✓ comportement attendu</div>}</div>}
          <label htmlFor="answer">{phase === 1 ? 'IDENTIFIANT DE LA PISTE' : phase === 2 ? 'IDENTITÉ FICTIVE' : 'RÉSULTAT ATTENDU'}</label><div className="answer-row"><input id="answer" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && validatePhase()} placeholder={phase === 1 ? 'ex. AUTH-00' : phase === 2 ? 'ex. analyst-01' : 'ex. GRANTED'} autoComplete="off" /><button onClick={validatePhase}>{phase === 3 ? 'CONCLURE' : 'CONTINUER'}</button></div>
        </>}{message && <p className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>{message}</p>}</aside>
      </section>
      <section className="roadmap"><span>01 AUDIT UI ✓</span><span>02 RECHERCHE ✓</span><span>03 FAILLE ✓</span><span>04 MULTI-ÉTAPES ✓</span><span>05 ZONES 🔒</span><span>06 VAULT 🔒</span></section>
      <footer><span>CYBERVAULT // V3.1</span><span>SIMULATION ISOLÉE · PROGRESSION LOCALE</span></footer>
    </main>
  )
}
