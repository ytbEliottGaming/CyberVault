'use client'

import { useEffect, useMemo, useState } from 'react'

type SimFile = {
  path: string
  folder: string
  name: string
  kind: string
  lines: string[]
  sealed?: boolean
}

type Phase = {
  title: string
  prompt: string
  answer: string
  unlockTerminal?: string
  terminalOutput?: string[]
}

const folders = [
  'app', 'auth', 'billing', 'cache', 'config', 'core', 'data', 'db', 'docs', 'engine',
  'events', 'fixtures', 'gateway', 'identity', 'jobs', 'lab', 'legacy', 'logs', 'middleware', 'models',
  'modules', 'monitoring', 'network', 'notebooks', 'policies', 'queues', 'reports', 'routes', 'runtime', 'sandbox',
  'scripts', 'services', 'sessions', 'shared', 'simulator', 'snapshots', 'storage', 'support', 'telemetry', 'tests',
  'tools', 'traces', 'users', 'vault', 'workers', 'workspace', 'archive', 'blueprints', 'research', 'secrets'
]

const fileNames = [
  'index.sim', 'bootstrap.sim', 'registry.sim', 'state.sim', 'reader.sim', 'writer.sim',
  'resolver.sim', 'policy.sim', 'adapter.sim', 'fixtures.sim', 'audit.sim', 'notes.sim'
]

const specialFiles: SimFile[] = [
  {
    path: 'vault/bruteforce-control.sim', folder: 'vault', name: 'bruteforce-control.sim', kind: 'CONTROL',
    lines: [
      '01 | BRUTEFORCE CONTROL // SIMULATOR ONLY',
      '02 | operator.question = "voulez-vous activer le bruteforce ?" ',
      '03 | target.format = 12_DIGITS',
      '04 | candidates.count = 20',
      '05 | selection = ROTATING-CANDIDATE',
      '06 | duration.model = CANDIDATE_INDEX',
      '07 | minimum.simulated = 02:00',
      '08 | maximum.simulated = 60:00',
      '09 | success.output = vault/rotation-result.sim',
      '10 | // no real cryptography or external target is used',
    ],
  },
  {
    path: 'vault/rotation-result.sim', folder: 'vault', name: 'rotation-result.sim', kind: 'RESULT',
    lines: [
      '01 | ROTATION RESULT // generated for this game session',
      '02 | candidate.pool = 20',
      '03 | active.candidate = SESSION-ROTATION',
      '04 | verification = compare candidate -> checksum -> expected behaviour',
      '05 | result is revealed only after the fictional simulation completes',
      '06 | // do not treat file names or severity labels as proof',
    ],
  },
  {
    path: 'auth/policy.sim', folder: 'auth', name: 'policy.sim', kind: 'AUTH',
    lines: [
      '01 | policy.mode = "LAB_ONLY"',
      '02 | identity.source = "identity/demo-analyst.sim"',
      '03 | requested.zone = "VAULT"',
      '04 |',
      '05 | rule.public = DENY',
      '06 | rule.analyst = REVIEW',
      '07 | rule.admin = REVIEW',
      '08 | decision = evaluate(identity, requested.zone)',
      '09 | audit.note = "do not trust severity labels"',
      '10 | // all values are fictional simulator state',
    ],
  },
  {
    path: 'identity/demo-analyst.sim', folder: 'identity', name: 'demo-analyst.sim', kind: 'IDENTITY',
    lines: [
      '01 | identity = "analyst-01"',
      '02 | role = "ANALYST"',
      '03 | clearance = "LAB-3"',
      '04 | zone = "LAB"',
      '05 | status = "ACTIVE-SIM"',
      '06 | source = "fixture-17"',
      '07 | expected.policy = "REVIEW"',
      '08 | // identity exists only inside CyberVault',
    ],
  },
  {
    path: 'tests/vault-expectations.sim', folder: 'tests', name: 'vault-expectations.sim', kind: 'TEST',
    lines: [
      '01 | CASE VAULT-06',
      '02 | EXPECTED: analyst-01 cannot open VAULT directly',
      '03 | EXPECTED: analyst-01 may request a REVIEW token',
      '04 | EXPECTED: REVIEW token requires a terminal challenge',
      '05 | EXPECTED: challenge output is not shown in the UI',
      '06 | ASSERT: policy + identity + terminal must agree',
      '07 | // simulation-only expected behaviour',
    ],
  },
  {
    path: 'docs/terminal-manual.sim', folder: 'docs', name: 'terminal-manual.sim', kind: 'DOC',
    lines: [
      '01 | SIMULATOR TERMINAL',
      '02 | Commands are inert and exist only inside this fictional lab.',
      '03 | Some commands require an exact argument sequence.',
      '04 | A command can reveal a clue without solving the phase.',
      '05 | Command syntax is intentionally discoverable from project files.',
      '06 | Do not assume a command shown in a log is still valid.',
    ],
  },
  {
    path: 'vault/sealed-map.sim', folder: 'vault', name: 'sealed-map.sim', kind: 'SEALED', sealed: true,
    lines: [
      '01 | SEALED RECORD',
      '02 | map.status = LOCKED',
      '03 | map.next = vault/ledger-3.sim',
      '04 | unlock.trace = ORBIT-17',
      '05 | // visible only after the correct simulator command',
    ],
  },
  {
    path: 'vault/ledger-3.sim', folder: 'vault', name: 'ledger-3.sim', kind: 'LEDGER', sealed: true,
    lines: [
      '01 | LEDGER RECORD',
      '02 | chain.previous = ORBIT-17',
      '03 | chain.current = LATTICE-09',
      '04 | chain.next = NIGHT-ORBIT',
      '05 | validation.mode = CROSS-FILE',
    ],
  },
  {
    path: 'vault/final-key.sim', folder: 'vault', name: 'final-key.sim', kind: 'KEY', sealed: true,
    lines: [
      '01 | FINAL RECORD',
      '02 | fragment = NIGHT-ORBIT',
      '03 | command.class = VAULT',
      '04 | command.required = OPEN-VAULT',
      '05 | command.effect = SIMULATED_ONLY',
    ],
  },
  {
    path: 'secrets/false-positive.sim', folder: 'secrets', name: 'false-positive.sim', kind: 'DECOY',
    lines: [
      '01 | finding = CRITICAL-RED',
      '02 | suspicious = true',
      '03 | evidence = label-only',
      '04 | conclusion = NOT_PROOF',
      '05 | note = "a loud label is not an observed effect"',
    ],
  },
  {
    path: 'logs/old-command.sim', folder: 'logs', name: 'old-command.sim', kind: 'LOG',
    lines: [
      '01 | archived command record',
      '02 | status = EXPIRED',
      '03 | command = scan --legacy-index',
      '04 | note = retired simulator syntax',
    ],
  },
]

function makeCode(folder: string, file: string, index: number): string[] {
  const seed = (folder.length * 17 + file.length * 13 + index * 7) % 97
  const verbs = ['resolve', 'hydrate', 'compare', 'normalize', 'record', 'queue', 'inspect', 'render', 'snapshot', 'reconcile']
  const noun = ['context', 'fixture', 'record', 'state', 'request', 'identity', 'event', 'branch', 'module', 'trace']
  return Array.from({ length: 18 }, (_, i) => {
    const n = i + 1
    const verb = verbs[(seed + i) % verbs.length]
    const target = noun[(seed + i * 3) % noun.length]
    const id = String(n).padStart(2, '0')
    if (n === 4) return `${id} | const module = "${folder}/${file}"`
    if (n === 8) return `${id} | ${verb}(${target}, "SIM-${String((seed + n) % 100).padStart(2, '0')}")`
    if (n === 13) return `${id} | audit.record = "${folder.toUpperCase()}-${String((seed + n) % 90).padStart(2, '0')}"`
    if (n === 17) return `${id} | state.check = ${n % 2 === 0 ? 'PASS' : 'PENDING'}`
    return `${id} | ${verb} ${target} // fixture ${String((seed + n) % 999).padStart(3, '0')}`
  })
}

const generatedFiles: SimFile[] = folders.flatMap((folder, folderIndex) =>
  fileNames.map((name, fileIndex) => ({
    path: `${folder}/${name}`,
    folder,
    name,
    kind: folder.toUpperCase().slice(0, 5),
    lines: makeCode(folder, name, folderIndex * fileNames.length + fileIndex),
  }))
)

const files: SimFile[] = [...generatedFiles, ...specialFiles]

const phases: Phase[] = [
  {
    title: 'Cartographie logique',
    prompt: 'Dans les fichiers d’authentification, recoupe identité, rôle et comportement attendu. Quelle valeur de rôle doit être associée à demo-analyst pour que la politique soit cohérente ?',
    answer: 'ANALYST',
    unlockTerminal: 'LOGIC LINK: ANALYST',
    terminalOutput: ['[SIM] role relation accepted', '[SIM] inspect policy + identity + tests before continuing'],
  },
  {
    title: 'Analyse de contrôle',
    prompt: 'Le code de contrôle contient trois issues possibles. Sans te fier aux noms de sévérité, quelle décision est attendue pour un analyst qui demande VAULT directement ?',
    answer: 'DENY',
    unlockTerminal: 'BEHAVIOUR CHECK: DENY',
    terminalOutput: ['[SIM] expected behaviour confirmed', '[SIM] a sealed control file mentions an optional brute-force simulator'],
  },
  {
    title: 'Bruteforce simulé',
    prompt: 'Tu as trouvé le contrôle qui demande : « voulez-vous activer le bruteforce ? ». Active-le seulement si tu as recoupé le format 12 chiffres et le modèle de rotation. La simulation choisira 1 candidat parmi 20.',
    answer: 'ACTIVER',
    unlockTerminal: 'BRUTEFORCE SIMULATION: READY',
    terminalOutput: ['[SIM] 20 candidates loaded', '[SIM] duration is simulated from 02:00 to 60:00', '[SIM] no real target, password or network is involved'],
  },
  {
    title: 'Validation finale',
    prompt: 'Après la simulation, utilise le code de 12 chiffres affiché par le résultat pour valider la dernière étape.',
    answer: 'VAULT-12',
    unlockTerminal: 'VAULT VALIDATION: READY',
    terminalOutput: ['[SIM] final validation accepted', '[SIM] VAULT ACCESS GRANTED'],
  },
]

const STORAGE_KEY = 'cybervault-progress-v4'

export default function Home() {
  const [completed, setCompleted] = useState<number[]>([])
  const [phase, setPhase] = useState(0)
  const [answer, setAnswer] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [activeFile, setActiveFile] = useState<SimFile>(files[0])
  const [expanded, setExpanded] = useState<string[]>(['app', 'auth', 'docs', 'identity', 'tests', 'vault'])
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['CYBERVAULT SIMULATOR // terminal idle'])
  const [vaultOpen, setVaultOpen] = useState(false)
  const [recentErrors, setRecentErrors] = useState<number[]>([])
  const [penaltyErrors, setPenaltyErrors] = useState(0)
  const [bruteForceActive, setBruteForceActive] = useState(false)
  const [bruteForceDone, setBruteForceDone] = useState(false)
  const [bruteForceCode, setBruteForceCode] = useState('')
  const [bruteForceDuration, setBruteForceDuration] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCompleted(parsed.filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= 6))
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const visibleFiles = useMemo(() => files.filter(f => !f.sealed || phase > 0), [phase])
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const hits: { file: SimFile; line: number; text: string }[] = []
    for (const file of visibleFiles) {
      file.lines.forEach((line, index) => {
        if (line.toLowerCase().includes(q) || file.path.toLowerCase().includes(q) || file.name.toLowerCase().includes(q)) {
          hits.push({ file, line: index + 1, text: line })
        }
      })
    }
    return hits
  }, [query, visibleFiles])

  const visibleFolders = useMemo(() => folders.filter(folder => visibleFiles.some(file => file.folder === folder)), [visibleFiles])
  const xp = completed.length * 150
  const currentPhase = phases[Math.min(phase, phases.length - 1)]

  function persist(next: number[]) {
    setCompleted(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function resetErrorTracking() {
    setRecentErrors([])
    setPenaltyErrors(0)
    setBruteForceActive(false)
    setBruteForceDone(false)
    setBruteForceCode('')
    setBruteForceDuration(0)
  }

  function registerFailedAttempt() {
    const now = Date.now()
    const recent = [...recentErrors.filter(time => now - time <= 10000), now]
    setRecentErrors(recent)

    if (recent.length > 5) {
      const nextPenalty = penaltyErrors + 1
      setPenaltyErrors(nextPenalty)
      if (nextPenalty >= 5) {
        reset()
        setMessage('ATTENTION — 5 ERREURS SUPPLÉMENTAIRES : RETOUR AU DÉBUT')
        return true
      }
      setMessage(`⚠ ATTENTION — ENCORE ${5 - nextPenalty} ERREUR${5 - nextPenalty > 1 ? 'S' : ''} ET VOUS RETOURNEREZ AU DÉBUT ⚠`)
    }
    return false
  }

  function startBruteforce() {
    if (phase < 2 || bruteForceActive || bruteForceDone) return
    const candidates = Array.from({ length: 20 }, (_, i) => {
      const base = 100000000000 + ((i * 731923 + 48271) % 900000000000)
      return String(base)
    })
    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    const durationMinutes = 2 + Math.floor(Math.random() * 59)
    setBruteForceActive(true)
    setBruteForceDuration(durationMinutes)
    setBruteForceCode('')
    setTerminalOutput([
      '[SIM] bruteforce activé',
      '[SIM] 20 candidats',
      '[SIM] durée simulée : ' + String(durationMinutes).padStart(2, '0') + ' min'
    ])

    window.setTimeout(() => {
      setBruteForceCode(selected)
      setBruteForceDone(true)
      setBruteForceActive(false)
      setTerminalOutput([
        '[SIM] simulation terminée',
        '[SIM] candidat validé : ' + selected,
        '[SIM] durée simulée : ' + String(durationMinutes).padStart(2, '0') + ' min',
        '[SIM] utilise ce résultat pour la validation interne',
      ])
    }, 2200)
  }

  function validateAnswer() {
    const value = answer.trim().toUpperCase()
    const expected = phase === 3 ? bruteForceCode : currentPhase.answer
    if (!expected || value !== expected) {
      registerFailedAttempt()
      if (penaltyErrors < 5) setMessage(prev => prev || '✕ Preuve refusée. Aucun indice automatique ne sera fourni.')
      return
    }
    resetErrorTracking()
    const nextPhase = phase + 1
    setAnswer('')
    setPhase(nextPhase)
    setQuery('')
    setMessage(`✓ PREUVE ${phase + 1}/${phases.length} ACCEPTÉE`)
    if (currentPhase.unlockTerminal && currentPhase.terminalOutput) {
      setTerminalOpen(true)
      setTerminalOutput([`> ${currentPhase.unlockTerminal}`, ...currentPhase.terminalOutput])
    }
    if (nextPhase >= phases.length) {
      setVaultOpen(true)
      const next = Array.from(new Set([...completed, 6])).sort((a, b) => a - b)
      persist(next)
    }
  }

  function runTerminal() {
    const value = terminalInput.trim()
    const normalized = value.toUpperCase()
    setTerminalInput('')
    if (normalized === 'CYBERVAULT::INDEX::TRACE ORBIT-17 --sealed-map --sim-only') {
      resetErrorTracking()
      setTerminalOutput(['> command accepted', '[SIM] index trace: ORBIT-17', '[SIM] vault/sealed-map.sim unlocked'])
      setPhase(p => Math.max(p, 1))
      return
    }
    if (normalized === 'CYBERVAULT::LEDGER::FOLLOW LATTICE-09 --cross-file --readonly') {
      resetErrorTracking()
      setTerminalOutput(['> command accepted', '[SIM] ledger trace: LATTICE-09', '[SIM] vault/ledger-3.sim unlocked'])
      setPhase(p => Math.max(p, 2))
      return
    }
    if (normalized === 'CYBERVAULT::VAULT::VERIFY NIGHT-ORBIT --chain 3 --fictional') {
      resetErrorTracking()
      setTerminalOutput(['> command accepted', '[SIM] final fragment verified', '[SIM] final-key.sim indexed'])
      setPhase(p => Math.max(p, 3))
      return
    }
    if (normalized === 'CYBERVAULT::VAULT::OPEN NIGHT-ORBIT --chain 3 --sim-only') {
      resetErrorTracking()
      setTerminalOutput(['> command accepted', '[SIM] VAULT ACCESS GRANTED', '[SIM] no external action performed'])
      setVaultOpen(true)
      setPhase(4)
      persist(Array.from(new Set([...completed, 6])).sort((a, b) => a - b))
      return
    }
    registerFailedAttempt()
    setTerminalOutput(['> command rejected', '[SIM] unknown command or invalid argument sequence'])
  }

  function toggleFolder(folder: string) {
    setExpanded(current =>
      current.includes(folder)
        ? current.filter(item => item !== folder)
        : [...current, folder]
    )
  }

  function selectFile(file: SimFile) {
    setActiveFile(file)
    setQuery('')
  }

  function reset() {
    setPhase(0)
    setAnswer('')
    setQuery('')
    setMessage('ENQUÊTE RÉINITIALISÉE')
    setActiveFile(files[0])
    setTerminalOutput(['CYBERVAULT SIMULATOR // terminal idle'])
    setTerminalInput('')
    setVaultOpen(false)
    setRecentErrors([])
    setPenaltyErrors(0)
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="dot" /> CYBER<span>VAULT</span></div>
        <div className="status">● DEEP AUDIT // V4.0</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">CTF // LABORATOIRE ISOLÉ // FINAL AUDIT</p>
          <h1>Le <span>Vault</span><br />t’attend.</h1>
          <p className="subtitle">Une enquête de fichiers. Pas de solution affichée : explore, recoupe et utilise le terminal du laboratoire quand tu trouves sa syntaxe.</p>
        </div>
        <div className="profile-card">
          <div className="rank">PROGRESSION</div>
          <strong>{vaultOpen ? 'VAULT MASTER' : completed.length >= 3 ? 'ANALYSTE' : 'RECRUE'}</strong>
          <div className="xp-row"><span>{xp} XP</span><span>900 XP</span></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (xp / 900) * 100)}%` }} /></div>
        </div>
      </section>

      <section className="mission-rail" aria-label="Progression des épreuves">
        {['ÉPREUVE 1','ÉPREUVE 2','ÉPREUVE 3','ÉPREUVE 4','ÉPREUVE 5','ÉPREUVE 6'].map((label, i) => (
          <div key={label} className={`mission-step ${i === 5 ? 'current' : i < completed.length ? 'done' : 'locked'}`}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>{label}</span>
            <em>{i === 5 ? 'EN COURS' : i < completed.length ? 'TERMINÉE' : 'VERROUILLÉE'}</em>
          </div>
        ))}
      </section>

      <div className="notice">⚡ LABORATOIRE 100 % FICTIF — fichiers, identités, commandes et vulnérabilités sont simulés. Aucune cible réelle n’est contactée.</div>

      <section className="audit-layout">
        <aside className="file-tree">
          <div className="panel-title">PROJECT EXPLORER <b>{visibleFolders.length} DOSSIERS · {visibleFiles.length} FICHIERS</b></div><div className="explorer-location">Ce PC › CyberVault › Projet simulé</div>
          <input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher dossiers, fichiers ou contenu..." />
          {query && <div className="search-meta">{searchHits.length} occurrence{searchHits.length > 1 ? 's' : ''}</div>}
          <div className="windows-tree large-explorer">
            {visibleFolders.map(folder => {
              const open = expanded.includes(folder)
              const children = visibleFiles.filter(file => file.folder === folder)
              return (
                <div className="tree-folder" key={folder}>
                  <button className="folder-row" onClick={() => toggleFolder(folder)}><span>{open ? '▾' : '▸'}</span><b>📁</b><strong>{folder}</strong><em>{children.length}</em></button>
                  {open && <div className="tree-children">{children.map(file => <button key={file.path} className={`file-row ${activeFile.path === file.path ? 'selected' : ''}`} onClick={() => selectFile(file)}><span>{file.sealed ? '🔐' : '📄'}</span><span>{file.name}</span><em>{file.kind}</em></button>)}</div>}
                </div>
              )
            })}
          </div>
          {searchHits.length > 0 && <div className="results"><div className="results-title">SEARCH RESULTS</div>{searchHits.slice(0, 40).map((hit, i) => <button key={`${hit.file.path}-${hit.line}-${i}`} className="result" onClick={() => selectFile(hit.file)}><strong>{hit.file.path}</strong><span>L{hit.line} · {hit.text.trim().slice(0, 70)}</span></button>)}</div>}
        </aside>

        <article className="code-panel">
          <div className="code-head"><span>📄 {activeFile.path}</span><span>{activeFile.lines.length} LIGNES · {activeFile.kind}</span></div>
          <pre className="code-view"><code>{activeFile.lines.map((line, i) => <span key={i} className="code-line"><b>{String(i + 1).padStart(3, '0')}</b>{line}</span>)}</code></pre>
        </article>

        <aside className="mission-panel">
          <div className="mission-progress">ÉPREUVE 06 / 06 · FINAL VAULT · ÉTAPE {Math.min(phase + 1, phases.length)}/{phases.length}</div>
          <h2>{vaultOpen ? 'VAULT OUVERT' : currentPhase.title}</h2>
          <p>{vaultOpen ? 'Chaîne validée. Le laboratoire confirme uniquement une réussite interne au jeu.' : currentPhase.prompt}</p>
          {message && <div className={`feedback ${message.includes('ATTENTION') ? 'warning' : ''}`}>{message}</div>}
          {phase === 2 && !vaultOpen && (
            <div className="bruteforce-card">
              <div className="bruteforce-title">BRUTEFORCE // SIMULATION</div>
              <p>Le contrôle trouvé demande si tu veux activer le bruteforce. Ici, tout est simulé dans CyberVault : aucune cible réelle n'est contactée.</p>
              <div className="bruteforce-meta"><span>FORMAT</span><strong>12 CHIFFRES</strong><span>CANDIDATS</span><strong>20</strong></div>
              {!bruteForceDone && <button className="validate" onClick={startBruteforce} disabled={bruteForceActive}>{bruteForceActive ? 'SIMULATION EN COURS — ' + String(bruteForceDuration).padStart(2,'0') + ' MIN' : 'ACTIVER LE BRUTEFORCE ?'}</button>}
              {bruteForceDone && <div className="bruteforce-result"><span>CODE DE SESSION</span><strong>{bruteForceCode}</strong><small>Résultat généré aléatoirement pour cette session.</small></div>}
            </div>
          )}

          {!vaultOpen && <div className="terminal mission-terminal">
            <div className="terminal-head">SIMULATOR // PROOF INPUT</div>
            <div className="terminal-line"><span>lab@cybervault:~$</span><input value={answer} onChange={e => setAnswer(phase === 3 ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value)} onKeyDown={e => { if (e.key === 'Enter') validateAnswer() }} placeholder="preuve exacte..." /></div>
            <button className="validate" onClick={validateAnswer}>VALIDER LA PREUVE →</button>
          </div>}

          <div className="terminal-box">
            <button className="terminal-toggle" onClick={() => setTerminalOpen(v => !v)}>〉_ TERMINAL DU LABORATOIRE <span>{terminalOpen ? '−' : '+'}</span></button>
            {terminalOpen && <div className="terminal-body">
              <div className="terminal-output">{terminalOutput.map((line, i) => <div key={i}>{line}</div>)}</div>
              <div className="terminal-line"><span>lab@cybervault:~$</span><input value={terminalInput} onChange={e => setTerminalInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runTerminal() }} placeholder="commande..." /></div>
              <small>Le terminal est fictif et sans accès réseau.</small>
            </div>}
          </div>

          <div className="chain"><strong>CHAÎNE DE PREUVE</strong>{phases.slice(0, Math.min(phase, phases.length)).map((p, i) => <div key={p.title}>✓ {i + 1}. {p.title}</div>)}{phase === 0 && <div className="muted">○ aucune preuve validée</div>}</div>
          {vaultOpen && <div className="vault-card"><div className="vault-icon">⬡</div><strong>ACCESS GRANTED</strong><span>CYBERVAULT // VAULT MASTER</span><button className="validate" onClick={reset}>REJOUER L’ENQUÊTE</button></div>}
        </aside>
      </section>

      <section className="roadmap"><div className="road-title">DEVELOPMENT BUILD <span>COMPLETE</span></div><div className="steps">{['AUDIT UI','RECHERCHE','FAILLE','MULTI-ÉTAPES','ZONES','VAULT'].map((s, i) => <div key={s} className="step done"><b>0{i + 1}</b><span>{s}</span><em>✓</em></div>)}</div></section>
      <footer>CYBERVAULT // V4.0 // FICTIONAL SECURITY LAB // NO REAL TARGETS</footer>
    </main>
  )
}
